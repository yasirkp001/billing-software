import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";
import { buildInvoiceData } from "@/lib/invoices";

type Ctx = { params: Promise<{ id: string }> };

/** Next sequential invoice number for today, e.g. INV-20260630-001. */
async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const base = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const existing = await prisma.invoice.findMany({
    where: { invoiceNumber: { startsWith: base } },
    select: { invoiceNumber: true },
  });
  const taken = new Set(existing.map((e) => e.invoiceNumber));
  let n = existing.length + 1;
  let candidate = `${base}-${String(n).padStart(3, "0")}`;
  while (taken.has(candidate)) candidate = `${base}-${String(++n).padStart(3, "0")}`;
  return candidate;
}

/**
 * Workflow step 2 — turn a trip sheet into a draft invoice.
 * Pre-fills customer/vehicle/driver from the booking, builds line items from
 * the rate × days (+ toll), links the invoice to the trip sheet and marks the
 * trip sheet "invoiced". The invoice is a draft so it can be edited/printed.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const ts = await prisma.tripSheet.findUnique({
      where: { id },
      include: { booking: { include: { customer: true, vehicle: true } } },
    });
    if (!ts) return fail("Trip sheet not found.", 404);

    const booking = ts.booking;
    const start = booking?.pickupDate ? new Date(booking.pickupDate) : ts.startDate;
    const end = booking?.dropDate ? new Date(booking.dropDate) : ts.endDate;
    const rawDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 1;
    const ratePerDay = booking?.ratePerDay ?? 0;

    const lineItems: {
      description: string;
      quantity: number;
      rate: number;
      vehicleId: string | null;
      km: number;
      status: string;
    }[] = [
      {
        description: `Transport: ${booking?.pickupLocation ?? "—"} ➔ ${booking?.dropLocation ?? "—"} (${days} day${days > 1 ? "s" : ""})`,
        quantity: days,
        rate: ratePerDay,
        vehicleId: booking?.vehicleId ?? null,
        km: ts.distance ?? 0,
        status: "completed",
      },
    ];
    if (ts.toll > 0) {
      lineItems.push({ description: "Toll charges", quantity: 1, rate: ts.toll, vehicleId: booking?.vehicleId ?? null, km: 0, status: "completed" });
    }

    const { data, lineItems: li } = buildInvoiceData({
      invoiceNumber: await nextInvoiceNumber(),
      invoiceDate: new Date().toISOString(),
      customerId: booking?.customerId ?? null,
      vehicleId: booking?.vehicleId ?? null,
      driverId: ts.driverId,
      tripSheetId: ts.id,
      gstPercentage: 0,
      paidAmount: 0,
      status: "draft",
      notes: "Generated from trip sheet.",
      lineItems,
    });

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: { ...data, lineItems: { create: li } },
        include: { lineItems: { include: { vehicle: true } }, customer: true, vehicle: true, driver: true },
      }),
      prisma.tripSheet.update({ where: { id }, data: { status: "invoiced" } }),
    ]);

    return ok(invoice, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
