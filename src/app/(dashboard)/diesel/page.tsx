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

  const totalDiesel = expenses.reduce((s, e) => s + e.amount, 0);

  // Group by vehicle
  const byVehicle = expenses.reduce<Record<string, { regNumber: string; type: string; vehicleId: string; total: number; count: number }>>((acc, e) => {
    const vid = e.vehicleId;
    if (!acc[vid]) {
      acc[vid] = {
        vehicleId: vid,
        regNumber: e.vehicle?.registrationNumber ?? "—",
        type: e.vehicle?.type ?? "—",
        total: 0,
        count: 0,
      };
    }
    acc[vid].total += e.amount;
    acc[vid].count += 1;
    return acc;
  }, {});

  const vehicleSummary = Object.values(byVehicle).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Diesel</h2>
        <p className="text-sm font-medium text-gray-500">Track diesel expenses across all vehicles.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Diesel</span>
            <span className="rounded-md bg-purple-100 p-1.5 text-purple-600"><Icon name="expenses" size={15} /></span>
          </div>
          <p className="mt-2 text-xl font-extrabold tracking-tight text-purple-700">{money(totalDiesel)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Entries</span>
            <span className="rounded-md bg-gray-100 p-1.5 text-gray-600"><Icon name="bookings" size={15} /></span>
          </div>
          <p className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">{expenses.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicles</span>
            <span className="rounded-md bg-gray-100 p-1.5 text-gray-600"><Icon name="vehicles" size={15} /></span>
          </div>
          <p className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">{vehicleSummary.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Avg / Entry</span>
            <span className="rounded-md bg-amber-100 p-1.5 text-amber-600"><Icon name="revenue" size={15} /></span>
          </div>
          <p className="mt-2 text-xl font-extrabold tracking-tight text-amber-700">
            {expenses.length > 0 ? money(totalDiesel / expenses.length) : "—"}
          </p>
        </div>
      </div>

      {/* Per-vehicle summary */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">By Vehicle</h3>
        </div>
        {vehicleSummary.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="expenses" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No diesel entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Entries</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicleSummary.map((v) => (
                  <tr key={v.vehicleId} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/vehicles/${v.vehicleId}`} className="font-bold text-red-600 hover:underline">
                        {v.regNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500 uppercase text-xs">{v.type}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{v.count}</td>
                    <td className="px-5 py-3 text-right font-extrabold text-purple-700">{money(v.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/70">
                  <td colSpan={3} className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Total</td>
                  <td className="px-5 py-3 text-right font-extrabold text-purple-700">{money(totalDiesel)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* All entries */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">All Entries</h3>
          <p className="mt-0.5 text-xs text-gray-400">{expenses.length} record{expenses.length !== 1 ? "s" : ""}</p>
        </div>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="expenses" size={24} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No diesel entries yet</p>
            <p className="text-xs text-gray-400">Add diesel expenses from the vehicle detail page</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Note</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatDate(e.date)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/vehicles/${e.vehicleId}`} className="font-bold text-red-600 hover:underline">
                        {e.vehicle?.registrationNumber ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{e.note || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-purple-700">{money(e.amount)}</td>
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
