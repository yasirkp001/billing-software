import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VehicleExpenses, type Expense } from "@/components/vehicles/VehicleExpenses";
import { money, formatDate, vehicleAge } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id } }).catch(() => null);
  if (!vehicle) notFound();

  const [expenseRows, bookings, invoices] = await Promise.all([
    prisma.vehicleExpense.findMany({ where: { vehicleId: id }, orderBy: { date: "desc" } }),
    prisma.booking.findMany({ where: { vehicleId: id }, orderBy: { pickupDate: "desc" }, take: 20 }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { vehicleId: id },
          { lineItems: { some: { vehicleId: id } } },
        ],
      },
      include: {
        customer: true,
        driver: true,
        payments: { select: { method: true, amount: true, paymentDate: true, reference: true } },
        lineItems: { include: { vehicle: true }, orderBy: { createdAt: "asc" } },
        tripSheet: { include: { booking: true } },
      },
      orderBy: { invoiceDate: "desc" },
    }),
  ]);

  const expenses: Expense[] = expenseRows.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    category: e.category,
    amount: e.amount,
    liter: e.liter ?? 0,
    pricePerLiter: e.pricePerLiter ?? 0,
    paid: e.paid ?? 0,
    adblue: e.adblue ?? 0,
    note: e.note,
  }));

  const liability = expenseRows.filter((e) => e.category === "liability").reduce((s, e) => s + e.amount, 0);
  const otherExpenses = expenseRows.filter((e) => e.category !== "liability").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = liability + otherExpenses;
  const invoiceVehicleAmount = (invoice: (typeof invoices)[number]) => {
    const vehicleLines = invoice.lineItems.filter((li) => li.vehicleId === id);
    if (vehicleLines.length > 0) return vehicleLines.reduce((sum, li) => sum + li.amount, 0);
    return invoice.vehicleId === id ? invoice.subtotal : 0;
  };
  const invoiceVehicleLines = (invoice: (typeof invoices)[number]) => {
    const vehicleLines = invoice.lineItems.filter((li) => li.vehicleId === id);
    return vehicleLines.length > 0 ? vehicleLines : invoice.vehicleId === id ? invoice.lineItems : [];
  };

  const earnings = invoices.reduce((sum, invoice) => sum + invoiceVehicleAmount(invoice), 0);
  const profit = earnings - totalExpenses;

  const cards: { label: string; value: string; icon: IconName; tone: string; bg: string }[] = [
    { label: "Earnings", value: money(earnings), icon: "revenue", tone: "text-green-700", bg: "bg-green-100 text-green-600" },
    { label: "Liability / EMI", value: money(liability), icon: "outstanding", tone: "text-red-700", bg: "bg-red-100 text-red-600" },
    { label: "Other Expenses", value: money(otherExpenses), icon: "expenses", tone: "text-amber-700", bg: "bg-amber-100 text-amber-600" },
    {
      label: "Profit",
      value: money(profit),
      icon: "wallet",
      tone: profit >= 0 ? "text-green-700" : "text-red-700",
      bg: profit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
    },
  ];

  const specs: { label: string; value: string }[] = [
    { label: "Purchase Price", value: money(vehicle.purchasePrice ?? 0) },
    { label: "Type", value: String(vehicle.type || "—").toUpperCase() },
    { label: "Brand", value: vehicle.make || "—" },
    { label: "Model", value: vehicle.model || "—" },
    { label: "Capacity", value: vehicle.capacityTons ? `${vehicle.capacityTons} T` : "—" },
    { label: "Ownership", value: vehicle.ownership || "own" },
    { label: "Owner Name", value: vehicle.ownerName || "—" },
    { label: "Registering Authority", value: vehicle.registeringAuthority || "—" },
    { label: "Vehicle Class", value: vehicle.vehicleClass || "—" },
    { label: "Emission Norm", value: vehicle.emissionNorm || "—" },
    { label: "Vehicle Age", value: vehicleAge(vehicle.registrationDate) },
    { label: "Hypothecated", value: vehicle.hypothecated ? "Yes" : "No" },
    { label: "RC Status", value: vehicle.vehicleStatus || "—" },
    { label: "Area / Region", value: vehicle.area || "—" },
    { label: "Fleet Status", value: vehicle.isActive ? "Active" : "Inactive" },
  ];

  const validity: { label: string; value: string }[] = [
    { label: "Registration Date", value: vehicle.registrationDate ? formatDate(vehicle.registrationDate) : "—" },
    { label: "Fitness Valid Upto", value: vehicle.fitnessExpiry ? formatDate(vehicle.fitnessExpiry) : "—" },
    { label: "Insurance Valid Upto", value: vehicle.insuranceExpiry ? formatDate(vehicle.insuranceExpiry) : "—" },
    { label: "Tax Valid Upto", value: vehicle.taxValidUpto ? formatDate(vehicle.taxValidUpto) : "—" },
    { label: "Permit Valid Upto", value: vehicle.permitValidUpto ? formatDate(vehicle.permitValidUpto) : "—" },
    { label: "National Permit Valid Upto", value: vehicle.nationalPermitValidUpto ? formatDate(vehicle.nationalPermitValidUpto) : "—" },
    { label: "PUCC Valid Upto", value: vehicle.puccValidUpto ? formatDate(vehicle.puccValidUpto) : "—" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/vehicles" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700">
        <span className="rotate-180"><Icon name="chevron-right" size={14} /></span> Back to Vehicles
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gray-100 p-2.5 text-gray-600"><Icon name="vehicles" size={22} /></span>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{vehicle.registrationNumber}</h2>
            <p className="text-sm font-medium text-gray-500 capitalize">
              {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={vehicle.isActive
            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
            : "rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500"}>
            {vehicle.isActive ? "Active" : "Inactive"}
          </span>
          <a
            href={`/vehicles/${vehicle.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <Icon name="print" size={15} /> Download PDF
          </a>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{c.label}</span>
              <span className={`rounded-md p-1.5 ${c.bg}`}><Icon name={c.icon} size={15} /></span>
            </div>
            <p className={`mt-2 text-xl font-extrabold tracking-tight ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Specs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Vehicle Details</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {specs.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>
        {vehicle.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{vehicle.notes}</p>
          </div>
        )}
      </div>

      {/* Registration & validity */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-gray-900">Registration &amp; Validity</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {validity.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Liability & expenses ledger */}
      <VehicleExpenses vehicleId={vehicle.id} expenses={expenses} />

      {/* Invoice bills */}
      <div id="invoices" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Invoice Bills</h3>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              {invoices.length} bill{invoices.length === 1 ? "" : "s"} linked to this vehicle
            </p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            {money(earnings)}
          </span>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="invoices" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No invoice bills for this vehicle yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Invoice</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Customer / Driver</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Line Details</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle Amount</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Invoice Total</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Paid</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Balance</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((invoice) => {
                  const balance = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
                  const vehicleLines = invoiceVehicleLines(invoice);
                  return (
                    <tr key={invoice.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link href={`/invoices?q=${encodeURIComponent(invoice.invoiceNumber)}`} className="font-bold text-red-600 hover:text-red-700 hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="mt-0.5 text-xs font-medium text-gray-400">{formatDate(invoice.invoiceDate)}</p>
                        {invoice.tripSheet?.booking && (
                          <p className="mt-1 text-xs text-gray-500">
                            {invoice.tripSheet.booking.pickupLocation} ➔ {invoice.tripSheet.booking.dropLocation}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-700">{invoice.customer?.name || "—"}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{invoice.driver?.name ? `Driver: ${invoice.driver.name}` : "Driver: —"}</p>
                      </td>
                      <td className="px-5 py-3">
                        {vehicleLines.length === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            {vehicleLines.map((line) => (
                              <div key={line.id} className="rounded-lg bg-gray-50 px-2.5 py-2">
                                <p className="font-semibold text-gray-700">{line.description || "Line item"}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {line.quantity} days × {money(line.rate)} Ton/Day = <span className="font-bold text-gray-700">{money(line.amount)}</span>
                                </p>
                                {(line.startKm || line.endKm || line.km) && (
                                  <p className="mt-0.5 text-xs text-gray-400">
                                    KM: {line.startKm.toLocaleString("en-IN")} → {line.endKm.toLocaleString("en-IN")}
                                    {line.km > 0 ? ` (${line.km.toLocaleString("en-IN")} km)` : ""}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-green-700">{money(invoiceVehicleAmount(invoice))}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-700">{money(invoice.totalAmount)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-green-700">{money(invoice.paidAmount)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-amber-700">{balance > 0 ? money(balance) : "—"}</td>
                      <td className="px-5 py-3 text-right"><StatusBadge status={invoice.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={`/invoices/${invoice.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-wood-200 bg-white px-3 py-1.5 text-xs font-bold text-wood-700 hover:bg-wood-50"
                        >
                          <Icon name="print" size={13} /> Print
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trip history */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">Trip History</h3>
        </div>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="bookings" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No trips for this vehicle yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Route</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Rate/Day</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatDate(b.pickupDate)}</td>
                    <td className="px-5 py-3 font-medium text-gray-700">{b.pickupLocation} ➔ {b.dropLocation}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-700">{money(b.ratePerDay)}</td>
                    <td className="px-5 py-3 text-right"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
