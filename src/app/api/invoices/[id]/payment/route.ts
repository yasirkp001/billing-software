import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";
import { round2 } from "@/lib/invoices";

type Ctx = { params: Promise<{ id: string }> };

const METHODS = ["cash", "bank", "upi", "cheque", "other"];

/**
 * Record a payment against an invoice. Creates an auditable Payment record,
 * increments the invoice's paidAmount (clamped to the total) and flips the
 * status to "paid" once the invoice is fully settled.
 */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const amount = round2(Number(body.amount));
    if (!(amount > 0)) return fail("Enter a payment amount greater than zero.");

    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) return fail("Invoice not found.", 404);

    const paidAmount = Math.min(round2(inv.paidAmount + amount), inv.totalAmount);
    const fullyPaid = inv.totalAmount > 0 && paidAmount >= inv.totalAmount;
    const status = fullyPaid ? "paid" : inv.status === "draft" ? "sent" : inv.status;

    const method = METHODS.includes(String(body.method)) ? String(body.method) : "cash";
    const pd = body.paymentDate ? new Date(body.paymentDate) : null;

    const ops = [
      prisma.invoice.update({
        where: { id },
        data: { paidAmount, status },
        include: { lineItems: { include: { vehicle: true } }, customer: true, vehicle: true, driver: true },
      }),
      prisma.payment.create({
        data: {
          invoiceId: inv.id,
          customerId: inv.customerId ?? null,
          amount,
          method,
          reference: String(body.reference ?? "").trim(),
          notes: String(body.notes ?? "").trim(),
          paymentDate: pd && !Number.isNaN(pd.getTime()) ? pd : new Date(),
        },
      }),
    ];

    // Close the workflow loop: a fully-paid, trip-sheet-linked invoice marks
    // the trip sheet as paid.
    if (fullyPaid && inv.tripSheetId) {
      ops.push(
        prisma.tripSheet.update({ where: { id: inv.tripSheetId }, data: { status: "paid" } }) as never
      );
    }

    const [row] = await prisma.$transaction(ops);

    return ok(row);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") return fail("Not found.", 404);
    return handleError(err);
  }
}
