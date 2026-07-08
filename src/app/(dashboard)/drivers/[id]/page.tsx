import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const driver = await prisma.driver.findUnique({ where: { id } }).catch(() => null);
  if (!driver) notFound();

  const [bookings, invoices] = await Promise.all([
    prisma.booking.findMany({
      where: { driverId: id },
      orderBy: { pickupDate: "desc" },
      take: 20,
      include: { vehicle: { select: { registrationNumber: true } }, customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { driverId: id },
      orderBy: { invoiceDate: "desc" },
      include: {
        customer: { select: { name: true } },
        vehicle: { select: { registrationNumber: true } },
        payments: { select: { amount: true, method: true, paymentDate: true } },
      },
    }),
  ]);

  const totalTrips = bookings.length;
  const completedTrips = bookings.filter((b) => b.status === "completed").length;

  // Per-trip amount = ratePerDay × number of days
  const tripAmount = (b: typeof bookings[number]) => {
    const days = Math.max(
      1,
      Math.ceil((new Date(b.dropDate).getTime() - new Date(b.pickupDate).getTime()) / 86400000)
    );
    return b.ratePerDay * days;
  };
  const totalTripAmount = bookings.reduce((s, b) => s + tripAmount(b), 0);

  const totalBilled = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((s, inv) => s + inv.paidAmount, 0);
  const totalBalance = totalBilled - totalPaid;

  return (
    <div className="space-y-5">
      <Link href="/drivers" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700">
        <span className="rotate-180"><Icon name="chevron-right" size={14} /></span> Back to Drivers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gray-100 p-2.5 text-gray-600"><Icon name="drivers" size={22} /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{driver.name}</h2>
            <p className="text-sm font-medium text-gray-500">{driver.phone}</p>
          </div>
        </div>
        <span className={driver.isActive
          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500"}>
          {driver.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Trip Amount", value: money(totalTripAmount), icon: "wallet" as const, tone: "text-green-700", bg: "bg-green-100 text-green-600" },
          { label: "Total Billed", value: money(totalBilled), icon: "revenue" as const, tone: "text-gray-700", bg: "bg-gray-100 text-gray-600" },
          { label: "Total Paid", value: money(totalPaid), icon: "outstanding" as const, tone: "text-green-700", bg: "bg-green-100 text-green-600" },
          { label: "Balance Due", value: money(totalBalance), icon: "overdue" as const, tone: totalBalance > 0 ? "text-red-700" : "text-gray-400", bg: totalBalance > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{c.label}</span>
              <span className={`rounded-md p-1.5 ${c.bg}`}><Icon name={c.icon} size={15} /></span>
            </div>
            <p className={`mt-2 text-xl font-extrabold tracking-tight ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Driver Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Driver Details</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {[
            { label: "Phone", value: driver.phone },
            { label: "License Number", value: driver.licenseNumber || "—" },
            { label: "License Expiry", value: driver.licenseExpiry ? formatDate(driver.licenseExpiry) : "—" },
            { label: "Monthly Salary", value: money(driver.salary ?? 0) },
            { label: "Address", value: driver.address || "—" },
            { label: "Status", value: driver.isActive ? "Active" : "Inactive" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>
        {driver.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{driver.notes}</p>
          </div>
        )}
      </div>

      {/* Invoice Bills */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Invoice Bills</h3>
            <p className="mt-0.5 text-xs text-gray-400">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{money(totalPaid)} paid</span>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="invoices" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No invoices for this driver yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Invoice</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Paid</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Balance</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const balance = Math.max(inv.totalAmount - inv.paidAmount, 0);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link href={`/invoices?q=${encodeURIComponent(inv.invoiceNumber)}`} className="font-bold text-red-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-xs text-gray-400">{formatDate(inv.invoiceDate)}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{inv.customer?.name || "—"}</td>
                      <td className="px-5 py-3 font-semibold text-gray-700">{inv.vehicle?.registrationNumber || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-700">{money(inv.totalAmount)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-green-700">{money(inv.paidAmount)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-amber-700">{balance > 0 ? money(balance) : "—"}</td>
                      <td className="px-5 py-3 text-right"><StatusBadge status={inv.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/70">
                  <td colSpan={3} className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Total</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-gray-900">{money(totalBilled)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-green-700">{money(totalPaid)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-amber-700">{totalBalance > 0 ? money(totalBalance) : "—"}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Trip History */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">Trip History</h3>
          <p className="mt-0.5 text-xs text-gray-400">{totalTrips} trip{totalTrips !== 1 ? "s" : ""} assigned</p>
        </div>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="bookings" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No trips assigned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Route</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Days</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Rate/Day</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatDate(b.pickupDate)}</td>
                    <td className="px-5 py-3 font-medium text-gray-700">{b.customer?.name || "—"}</td>
                    <td className="px-5 py-3 font-bold text-red-600">{b.vehicle?.registrationNumber || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{b.pickupLocation} ➔ {b.dropLocation}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-gray-500">
                      {Math.max(1, Math.ceil((new Date(b.dropDate).getTime() - new Date(b.pickupDate).getTime()) / 86400000))} days
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-700">{money(b.ratePerDay)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-green-700">{money(tripAmount(b))}</td>
                    <td className="px-5 py-3 text-right"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/70">
                  <td colSpan={6} className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Total</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-green-700">{money(totalTripAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
