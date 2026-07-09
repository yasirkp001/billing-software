import { prisma } from "@/lib/db";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DieselPage() {
  const expenses = await prisma.vehicleExpense.findMany({
    where: { category: "diesel" },
    orderBy: { date: "desc" },
    include: { vehicle: { select: { id: true, registrationNumber: true, type: true } } },
  });

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.reduce((s, e) => s + (e.paid ?? 0), 0);
  const totalBalance = totalAmount - totalPaid;
  const totalLiter = expenses.reduce((s, e) => s + (e.liter ?? 0), 0);
  const totalAdblue = expenses.reduce((s, e) => s + (e.adblue ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Diesel</h2>
        <p className="text-sm font-medium text-gray-500">Diesel expenses across all vehicles.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Total Amount", value: money(totalAmount), color: "text-purple-700", bg: "bg-purple-100 text-purple-600" },
          { label: "Total Paid", value: money(totalPaid), color: "text-green-700", bg: "bg-green-100 text-green-600" },
          { label: "Balance", value: money(totalBalance), color: totalBalance > 0 ? "text-red-700" : "text-gray-400", bg: "bg-red-100 text-red-600" },
          { label: "Total Liters", value: `${totalLiter.toLocaleString("en-IN")} L`, color: "text-blue-700", bg: "bg-blue-100 text-blue-600" },
          { label: "Total Adblue", value: `${totalAdblue.toLocaleString("en-IN")} L`, color: "text-amber-700", bg: "bg-amber-100 text-amber-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{c.label}</span>
              <span className={`rounded-md p-1.5 ${c.bg}`}><Icon name="expenses" size={14} /></span>
            </div>
            <p className={`mt-2 text-lg font-extrabold tracking-tight ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* All entries table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">All Diesel Entries</h3>
            <p className="mt-0.5 text-xs text-gray-400">{expenses.length} record{expenses.length !== 1 ? "s" : ""}</p>
          </div>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{money(totalAmount)}</span>
        </div>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Icon name="expenses" size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No diesel entries yet</p>
            <p className="text-xs text-gray-400">Add diesel from vehicle detail page → Liability &amp; Expenses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">No</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Liter</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Price/L</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Paid</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Balance</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Adblue</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((e, idx) => {
                  const bal = e.amount - (e.paid ?? 0);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-gray-400 text-xs">{expenses.length - idx}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/vehicles/${e.vehicleId}`} className="font-bold text-red-600 hover:underline">
                          {e.vehicle?.registrationNumber ?? "—"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {(e.liter ?? 0) > 0 ? `${e.liter} L` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">
                        {(e.pricePerLiter ?? 0) > 0 ? money(e.pricePerLiter) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-purple-700">{money(e.amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                        {(e.paid ?? 0) > 0 ? money(e.paid) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-700">
                        {bal > 0 ? money(bal) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-blue-600">
                        {(e.adblue ?? 0) > 0 ? `${e.adblue} L` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/70 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">Total</td>
                  <td className="px-4 py-3 text-right text-blue-700">{totalLiter > 0 ? `${totalLiter} L` : "—"}</td>
                  <td />
                  <td className="px-4 py-3 text-right text-purple-700">{money(totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{money(totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{totalBalance > 0 ? money(totalBalance) : "—"}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{totalAdblue > 0 ? `${totalAdblue} L` : "—"}</td>
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
