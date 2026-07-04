import { prisma } from "@/lib/db";
import { ok, handleError, requireAuth } from "@/lib/api";
import { money, formatDate } from "@/lib/format";

export type Severity = "danger" | "warning" | "info";
export type Notification = {
  id: string;
  type: "overdue" | "insurance" | "fitness" | "license" | "tripsheet";
  title: string;
  detail: string;
  href: string;
  severity: Severity;
};

const DAY = 86_400_000;

/** Aggregate operational alerts for the notification panel. */
export async function GET() {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * DAY);

    const [overdue, vehicles, drivers, pending] = await Promise.all([
      // Fetch all non-paid invoices; balance check happens below in JS
      // (Prisma/MongoDB cannot compare two fields in a WHERE clause)
      prisma.invoice.findMany({ where: { status: { not: "paid" } }, orderBy: { invoiceDate: "desc" }, take: 50 }),
      prisma.vehicle.findMany({
        where: {
          isActive: true,
          OR: [{ insuranceExpiry: { lte: soon } }, { fitnessExpiry: { lte: soon } }],
        },
      }),
      prisma.driver.findMany({ where: { isActive: true, licenseExpiry: { lte: soon } } }),
      prisma.tripSheet.findMany({
        where: { status: "pending" },
        orderBy: { startDate: "desc" },
        take: 25,
        include: { booking: true },
      }),
    ]);

    const items: Notification[] = [];

    // Overdue invoices (only those still carrying a balance).
    for (const inv of overdue) {
      const balance = inv.totalAmount - inv.paidAmount;
      if (balance <= 0) continue;
      items.push({
        id: `inv-${inv.id}`,
        type: "overdue",
        title: `Invoice ${inv.invoiceNumber} overdue`,
        detail: `${money(balance)} balance due`,
        href: "/invoices",
        severity: "danger",
      });
    }

    // Vehicle insurance / fitness expiry.
    const docState = (d: Date | null) => {
      if (!d) return null;
      const dt = new Date(d);
      if (dt < now) return "expired" as const;
      if (dt <= soon) return "soon" as const;
      return null;
    };
    for (const v of vehicles) {
      const ins = docState(v.insuranceExpiry);
      if (ins) {
        items.push({
          id: `ins-${v.id}`,
          type: "insurance",
          title: `${v.registrationNumber} — insurance ${ins === "expired" ? "expired" : "expiring"}`,
          detail: `${ins === "expired" ? "Expired" : "Expires"} ${formatDate(v.insuranceExpiry)}`,
          href: `/vehicles/${v.id}`,
          severity: ins === "expired" ? "danger" : "warning",
        });
      }
      const fit = docState(v.fitnessExpiry);
      if (fit) {
        items.push({
          id: `fit-${v.id}`,
          type: "fitness",
          title: `${v.registrationNumber} — fitness ${fit === "expired" ? "expired" : "expiring"}`,
          detail: `${fit === "expired" ? "Expired" : "Expires"} ${formatDate(v.fitnessExpiry)}`,
          href: `/vehicles/${v.id}`,
          severity: fit === "expired" ? "danger" : "warning",
        });
      }
    }

    // Driver license expiry.
    for (const dr of drivers) {
      const st = docState(dr.licenseExpiry);
      if (!st) continue;
      items.push({
        id: `lic-${dr.id}`,
        type: "license",
        title: `${dr.name} — license ${st === "expired" ? "expired" : "expiring"}`,
        detail: `${st === "expired" ? "Expired" : "Expires"} ${formatDate(dr.licenseExpiry)}`,
        href: "/drivers",
        severity: st === "expired" ? "danger" : "warning",
      });
    }

    // Pending trip sheets awaiting invoicing.
    for (const ts of pending) {
      const route = ts.booking ? `${ts.booking.pickupLocation} ➔ ${ts.booking.dropLocation}` : formatDate(ts.startDate);
      items.push({
        id: `ts-${ts.id}`,
        type: "tripsheet",
        title: "Trip sheet pending invoice",
        detail: route,
        href: "/trip-sheets",
        severity: "info",
      });
    }

    // Most urgent first: danger → warning → info.
    const rank: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
    items.sort((a, b) => rank[a.severity] - rank[b.severity]);

    return ok({ count: items.length, items });
  } catch (err) {
    return handleError(err);
  }
}
