import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintActions } from "@/components/PrintActions";
import { money, formatDate, vehicleAge } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  liability: "Liability / EMI",
  maintenance: "Maintenance",
  insurance: "Insurance",
  fuel: "Fuel",
  tax: "Tax",
  other: "Other",
};

export default async function VehicleReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } }).catch(() => null);
  if (!vehicle) notFound();
  // notFound() throws, but TypeScript doesn't narrow the type — assert non-null.
  const v = vehicle!;

  const [expenses, bookings, earningsAgg] = await Promise.all([
    prisma.vehicleExpense.findMany({ where: { vehicleId: id }, orderBy: { date: "desc" } }),
    prisma.booking.findMany({ where: { vehicleId: id }, orderBy: { pickupDate: "desc" }, take: 50 }),
    prisma.invoiceLineItem.aggregate({ where: { vehicleId: id }, _sum: { amount: true } }),
  ]);

  const liability = expenses.filter((e) => e.category === "liability").reduce((s, e) => s + e.amount, 0);
  const otherExpenses = expenses.filter((e) => e.category !== "liability").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = liability + otherExpenses;
  const earnings = earningsAgg._sum.amount ?? 0;
  const profit = earnings - totalExpenses;

  const specs: { label: string; value: string }[] = [
    { label: "Purchase Price", value: v.purchasePrice ? money(v.purchasePrice) : "—" },
    { label: "Type", value: v.type ? String(v.type).toUpperCase() : "—" },
    { label: "Brand", value: v.make || "—" },
    { label: "Model", value: v.model || "—" },
    { label: "Capacity", value: v.capacityTons ? `${v.capacityTons} T` : "—" },
    { label: "Ownership", value: v.ownership ? v.ownership.charAt(0).toUpperCase() + v.ownership.slice(1) : "—" },
    { label: "Owner Name", value: v.ownerName || "—" },
    { label: "Registering Authority", value: v.registeringAuthority || "—" },
    { label: "Vehicle Class", value: v.vehicleClass || "—" },
    { label: "Fuel Type", value: v.fuelType ? v.fuelType.charAt(0).toUpperCase() + v.fuelType.slice(1) : "—" },
    { label: "Emission Norm", value: v.emissionNorm || "—" },
    { label: "Vehicle Age", value: vehicleAge(v.registrationDate) },
    { label: "Hypothecated", value: v.hypothecated ? "Yes" : "No" },
    { label: "RC Status", value: v.vehicleStatus ? v.vehicleStatus.charAt(0).toUpperCase() + v.vehicleStatus.slice(1) : "—" },
    { label: "Fleet Status", value: v.isActive ? "Active" : "Inactive" },
  ];

  const validity: { label: string; value: string }[] = [
    { label: "Registration Date", value: v.registrationDate ? formatDate(v.registrationDate) : "—" },
    { label: "Fitness Valid Upto", value: v.fitnessExpiry ? formatDate(v.fitnessExpiry) : "—" },
    { label: "Insurance Valid Upto", value: v.insuranceExpiry ? formatDate(v.insuranceExpiry) : "—" },
    { label: "Tax Valid Upto", value: v.taxValidUpto ? formatDate(v.taxValidUpto) : "—" },
    { label: "Permit Valid Upto", value: v.permitValidUpto ? formatDate(v.permitValidUpto) : "—" },
    { label: "PUCC Valid Upto", value: v.puccValidUpto ? formatDate(v.puccValidUpto) : "—" },
  ];

  const summary: { label: string; value: string; tone: string }[] = [
    { label: "Earnings", value: money(earnings), tone: "text-green-700" },
    { label: "Liability / EMI", value: money(liability), tone: "text-red-700" },
    { label: "Other Expenses", value: money(otherExpenses), tone: "text-amber-700" },
    { label: "Profit", value: money(profit), tone: profit >= 0 ? "text-green-700" : "text-red-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white print:p-0 sm:px-6 lg:px-8">
      <PrintActions title={`Vehicle: ${v.registrationNumber}`} backHref={`/vehicles/${v.id}`} />

      <div className="mx-auto max-w-4xl border border-gray-200 bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none sm:p-12">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-gray-200 pb-8 sm:flex-row sm:items-start">
          <div className="flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Hi Wood Transporting" className="mb-3 h-20 w-auto max-w-[260px] object-contain object-left" />
            <p className="text-xs text-gray-500">Transportation & Logistics Services</p>
            <p className="text-xs text-gray-500">Kerala, India</p>
          </div>
          <div className="text-left sm:text-right sm:shrink-0">
            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-wood-950">Vehicle Report</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">Reg. Number:</span> {v.registrationNumber}</p>
              <p><span className="font-semibold text-gray-800">Generated:</span> {formatDate(new Date())}</p>
            </div>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 py-8 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className={`mt-1 text-lg font-extrabold tracking-tight ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Specs */}
        <div className="border-b border-gray-100 py-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Vehicle Details</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {specs.map((s) => (
              <div key={s.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-sm font-semibold capitalize text-gray-800">{s.value}</p>
              </div>
            ))}
          </div>
          {v.notes && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{v.notes}</p>
            </div>
          )}
        </div>

        {/* Registration & validity */}
        <div className="border-b border-gray-100 py-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Registration & Validity</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {validity.map((s) => (
              <div key={s.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="border-b border-gray-100 py-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Liability & Expenses</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses recorded.</p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[25%]" />
                <col className="w-[35%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Note</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {expenses.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="py-2.5 pr-3">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                    <td className="py-2.5 pr-3 break-words">{e.note || "—"}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-bold text-gray-900">
                  <td colSpan={3} className="pt-3 text-right">Total Expenses</td>
                  <td className="pt-3 text-right font-mono tabular-nums whitespace-nowrap text-red-700">{money(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Trip history */}
        <div className="py-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Trip History</h3>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">No trips recorded.</p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[55%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3 text-right">Rate/Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">{formatDate(b.pickupDate)}</td>
                    <td className="py-2.5 pr-3 break-words">{b.pickupLocation} ➔ {b.dropLocation}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums whitespace-nowrap">{money(b.ratePerDay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
