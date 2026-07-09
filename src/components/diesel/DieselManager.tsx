"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { money, formatDate } from "@/lib/format";
import Link from "next/link";

type Vehicle = { id: string; registrationNumber: string; type: string };
type DieselEntry = {
  id: string;
  date: string;
  vehicleId: string;
  category: string;
  amount: number;
  liter: number;
  pricePerLiter: number;
  paid: number;
  adblue: number;
  note: string;
  vehicle?: { id: string; registrationNumber: string; type: string } | null;
};

const todayInput = () => new Date().toISOString().slice(0, 10);

export function DieselManager() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<DieselEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [vehicleId, setVehicleId] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [adblue, setAdblue] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, eRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/vehicles/expenses/diesel"),
      ]);
      const [vBody, eBody] = await Promise.all([vRes.json(), eRes.json()]);
      if (vBody.data) setVehicles(vBody.data);
      if (eBody.data) setEntries(eBody.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Use a simpler approach — fetch each vehicle's diesel expenses
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const vRes = await fetch("/api/vehicles");
      const vBody = await vRes.json();
      if (vBody.data) {
        setVehicles(vBody.data);
        // Fetch diesel expenses for all vehicles in parallel
        // Exclude general entries (marked with [GENERAL]) from vehicle loads
        const vehicleExpenses = await Promise.all(
          vBody.data.map((v: Vehicle) =>
            fetch(`/api/vehicles/${v.id}/expenses`)
              .then((r) => r.json())
              .then((b) =>
                (b.data || [])
                  .filter((e: DieselEntry) => 
                    e.category === "diesel" && 
                    !e.note?.startsWith("[GENERAL]")
                  )
                  .map((e: DieselEntry) => ({ ...e, vehicle: v }))
              )
              .catch(() => [])
          )
        );
        
        // Fetch general diesel entries
        const generalRes = await fetch("/api/diesel/general");
        const generalBody = await generalRes.json();
        const generalEntries = generalBody.data || [];
        
        // Combine and deduplicate by ID
        const combined = [...vehicleExpenses.flat(), ...generalEntries];
        const uniqueMap = new Map();
        combined.forEach((entry) => {
          uniqueMap.set(entry.id, entry);
        });
        
        const all = Array.from(uniqueMap.values()).sort((a: DieselEntry, b: DieselEntry) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (timeDiff !== 0) return timeDiff;

          const aIsPaymentOnly = a.amount === 0 && (a.paid ?? 0) > 0;
          const bIsPaymentOnly = b.amount === 0 && (b.paid ?? 0) > 0;
          if (aIsPaymentOnly !== bIsPaymentOnly) return aIsPaymentOnly ? 1 : -1;

          return b.id.localeCompare(a.id);
        });
        setEntries(all);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    const amt = amount === "" ? 0 : Number(amount);
    const paidAmt = paid === "" ? 0 : Number(paid);
    
    console.log("Validation:", { amt, paidAmt, amount, paid, vehicleId });
    
    // Allow entry with either amount or paid (or both)
    if (amt <= 0 && paidAmt <= 0) { 
      setError("Enter amount or paid value."); 
      return; 
    }
    
    // If amount is entered, vehicle is required
    if (amt > 0 && !vehicleId) {
      setError("Select a vehicle for amount entry.");
      return;
    }
    
    setSaving(true);
    try {
      const paidAmount = paid === "" ? 0 : Number(paid);
      const noteWithPayment = paidAmount > 0 
        ? `Payment: ${paymentMethod.toUpperCase()}${note ? ` | ${note}` : ''}`
        : note;
      
      // Use general API if no vehicle selected (paid-only entries)
      // Otherwise use vehicle-specific API (amount entries)
      const apiUrl = vehicleId 
        ? `/api/vehicles/${vehicleId}/expenses`
        : `/api/diesel/general`;
        
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "diesel",
          amount: amount === "" ? 0 : Number(amount),
          date,
          note: noteWithPayment,
          liter: 0,
          pricePerLiter: 0,
          paid: paidAmount,
          adblue: adblue === "" ? 0 : Number(adblue),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to add");
      // Reset form
      setAmount(""); setPaid(""); setAdblue(""); setNote(""); setPaymentMethod("cash");
      router.refresh();
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: DieselEntry) {
    if (!confirm("Delete this diesel entry?")) return;
    const res = await fetch(`/api/vehicles/${entry.vehicleId}/expenses/${entry.id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      router.refresh();
    }
  }

  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const totalPaid = entries.reduce((s, e) => s + (e.paid ?? 0), 0);
  const totalBalance = totalAmount - totalPaid;
  const totalLiter = entries.reduce((s, e) => s + (e.liter ?? 0), 0);
  const totalAdblue = entries.reduce((s, e) => s + (e.adblue ?? 0), 0);

  const dieselEntries = entries.filter((e) => e.amount > 0);
  const paymentEntries = entries.filter((e) => e.amount === 0 && (e.paid ?? 0) > 0);

  return (
    <div className="space-y-5">
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

      {/* Add Form */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">Add Diesel Entry</h3>
        </div>
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Vehicle No" className="sm:col-span-2">
              <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} autoComplete="off">
                <option value="">— Select Vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registrationNumber}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount">
              <Input type="number" step="any" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Adblue (L)">
              <Input type="number" step="any" value={adblue} placeholder="0" onChange={(e) => setAdblue(e.target.value)} />
            </Field>
            <Field label="Paid">
              <Input type="number" step="any" value={paid} placeholder="0" onChange={(e) => setPaid(e.target.value)} />
            </Field>
            <Field label="Payment Method">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="gpay">GPay</option>
                <option value="cheque">Cheque</option>
                <option value="bank">Bank Transfer</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Icon name="plus" size={15} /> {saving ? "Adding…" : "Add Diesel"}
            </Button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">All Diesel Entries</h3>
            <p className="mt-0.5 text-xs text-gray-400">{entries.length} records</p>
          </div>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{money(totalAmount)}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Icon name="expenses" size={28} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No diesel entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">No</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Vehicle No</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Adblue</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Paid</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Balance</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Payment</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dieselEntries.map((e, idx) => {
                  const bal = e.amount - (e.paid ?? 0);
                  const paymentMatch = e.note?.match(/Payment: (\w+)/i);
                  const paymentMethod = paymentMatch ? paymentMatch[1] : "";
                  const isGeneral = e.note?.startsWith("[GENERAL]");

                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">
                        {isGeneral ? (
                          <span className="text-sm font-semibold text-gray-400">General</span>
                        ) : (
                          <Link href={`/vehicles/${e.vehicleId}`} className="font-bold text-red-600 hover:underline">
                            {e.vehicle?.registrationNumber ?? "—"}
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-purple-700">{money(e.amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-blue-600">{(e.adblue ?? 0) > 0 ? `${e.adblue} L` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">{(e.paid ?? 0) > 0 ? money(e.paid) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-700">{bal > 0 ? money(bal) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {paymentMethod && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(e)} className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Delete">✕</button>
                      </td>
                    </tr>
                  );
                })}
                {paymentEntries.length > 0 && (
                  <tr className="bg-gray-100">
                    <td colSpan={9} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Payments</td>
                  </tr>
                )}
                {paymentEntries.map((e, idx) => {
                  const bal = e.amount - (e.paid ?? 0);
                  const paymentMatch = e.note?.match(/Payment: (\w+)/i);
                  const paymentMethod = paymentMatch ? paymentMatch[1] : "";
                  const isGeneral = e.note?.startsWith("[GENERAL]");

                  return (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-400">{dieselEntries.length + idx + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-4 py-3">
                        {isGeneral ? (
                          <span className="text-sm font-semibold text-gray-400">General</span>
                        ) : (
                          <Link href={`/vehicles/${e.vehicleId}`} className="font-bold text-red-600 hover:underline">
                            {e.vehicle?.registrationNumber ?? "—"}
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-purple-700">{money(e.amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-blue-600">{(e.adblue ?? 0) > 0 ? `${e.adblue} L` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">{(e.paid ?? 0) > 0 ? money(e.paid) : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-700">{bal > 0 ? money(bal) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {paymentMethod && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(e)} className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Delete">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/70 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">Total</td>
                  <td className="px-4 py-3 text-right text-purple-700">{money(totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{totalAdblue > 0 ? `${totalAdblue} L` : "—"}</td>
                  <td className="px-4 py-3 text-right text-green-700">{money(totalPaid)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{totalBalance > 0 ? money(totalBalance) : "—"}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
