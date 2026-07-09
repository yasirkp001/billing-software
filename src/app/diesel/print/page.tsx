"use client";

import { useEffect, useState } from "react";
import { money, formatDate } from "@/lib/format";

type DieselEntry = {
  id: string;
  date: string;
  vehicleId: string;
  category?: string;
  amount: number;
  adblue: number;
  paid: number;
  note: string;
  vehicle?: { id: string; registrationNumber: string } | null;
};

function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-3.5 w-1 rounded-full bg-red-600" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
    </div>
  );
}

export default function DieselPrintPage() {
  const [entries, setEntries] = useState<DieselEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    async function load() {
      try {
        const vRes = await fetch("/api/vehicles");
        if (!vRes.ok) { setLoading(false); return; }
        const vBody = await vRes.json();
        if (vBody.data) {
          const vehicleExpenses = await Promise.all(
            vBody.data.map((v: { id: string; registrationNumber: string }) =>
              fetch(`/api/vehicles/${v.id}/expenses`)
                .then((r) => r.ok ? r.json() : { data: [] })
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
          const generalRes = await fetch("/api/diesel/general");
          const generalEntries = generalRes.ok ? (await generalRes.json()).data || [] : [];
          const combined = [...vehicleExpenses.flat(), ...generalEntries];
          const uniqueMap = new Map();
          combined.forEach((e) => uniqueMap.set(e.id, e));
          const all = Array.from(uniqueMap.values()).sort(
            (a: DieselEntry, b: DieselEntry) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setEntries(all);
        }
      } catch (err) {
        console.error("Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const totalAdblue = entries.reduce((s, e) => s + (e.adblue ?? 0), 0);
  const totalPaid = entries.reduce((s, e) => s + (e.paid ?? 0), 0);
  const totalBalance = totalAmount + totalAdblue - totalPaid;

  // Build balance map oldest-first
  let runningBalance = 0;
  const balanceMap = new Map<string, { prev: number; current: number }>();
  entries.forEach((e) => {
    const prev = runningBalance;
    runningBalance += e.amount + (e.adblue ?? 0) - (e.paid ?? 0);
    balanceMap.set(e.id, { prev, current: runningBalance });
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* ── Print toolbar ── */}
      <div className="mx-auto mb-6 max-w-5xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">CR Diesel Ledger</p>
            <p className="text-xs text-gray-400">Ready to print or save as PDF</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              🖨️ Print / Download PDF
            </button>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Sheet ── */}
      <div className="mx-auto max-w-5xl bg-white shadow-sm print:shadow-none print:max-w-full">
        {/* Top red bar */}
        <div className="h-2 bg-red-600 print:bg-red-600" />

        <div className="p-8 print:p-7">

          {/* ══ HEADER ══ */}
          <div className="flex items-start justify-between gap-6">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                onError={(e) => { const i = e.currentTarget; if (!i.src.endsWith("/logo.svg")) i.src = "/logo.svg"; }}
                alt="Hi Wood Transporting"
                className="h-16 w-auto max-w-[200px] object-contain object-left"
              />
              <p className="mt-1.5 text-xs text-gray-500">Transportation &amp; Logistics Services · Kerala, India</p>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase">CR Diesel</h1>
              <p className="mt-1 text-sm text-gray-500">Ledger Statement</p>
              <div className="mt-2 space-y-0.5 text-sm">
                <p><span className="text-gray-500">Date: </span><span className="font-semibold text-gray-700">{today}</span></p>
                <p><span className="text-gray-500">Entries: </span><span className="font-bold text-gray-900">{entries.length}</span></p>
              </div>
            </div>
          </div>

          <div className="my-5 border-t-2 border-gray-100" />

          {/* ══ SUMMARY CARDS ══ */}
          <div className="mb-6">
            <SectionHead title="Summary" />
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Amount", value: money(totalAmount), color: "text-purple-700", border: "border-purple-200", bg: "bg-purple-50" },
                { label: "Total Adblue", value: money(totalAdblue), color: "text-blue-700", border: "border-blue-200", bg: "bg-blue-50" },
                { label: "Total Paid",   value: money(totalPaid),   color: "text-green-700", border: "border-green-200", bg: "bg-green-50" },
                { label: "Balance Due",  value: money(totalBalance), color: "text-red-700", border: "border-red-200", bg: "bg-red-50" },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
                  <p className={`mt-1.5 text-lg font-extrabold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="my-5 border-t border-gray-100" />

          {/* ══ ENTRIES TABLE ══ */}
          <SectionHead title="All Diesel Entries" />
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <th className="pb-2 text-center">No</th>
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-left">Vehicle No</th>
                  <th className="pb-2 text-right">Prev Balance</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Adblue</th>
                  <th className="pb-2 text-right">Paid</th>
                  <th className="pb-2 text-right">Balance</th>
                  <th className="pb-2 text-left pl-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => {
                  const bal = balanceMap.get(e.id) ?? { prev: 0, current: 0 };
                  const isGeneral = e.note?.includes("[GENERAL]");
                  const paymentMatch = e.note?.match(/Payment: (\w+)/i);
                  const paymentMethod = paymentMatch ? paymentMatch[1] : (e.paid ?? 0) > 0 ? "Cash" : "";
                  return (
                    <tr key={e.id} className="border-b border-gray-100 align-top">
                      <td className="py-2.5 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 pr-2 text-gray-600 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="py-2.5 pr-2 font-bold" style={{ color: isGeneral ? "#16a34a" : "#dc2626" }}>
                        {isGeneral ? "General" : (e.vehicle?.registrationNumber ?? "—")}
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-gray-400">{money(bal.prev)}</td>
                      <td className="py-2.5 text-right font-bold text-purple-700">{e.amount > 0 ? money(e.amount) : "—"}</td>
                      <td className="py-2.5 text-right font-semibold text-blue-700">{(e.adblue ?? 0) > 0 ? money(e.adblue) : "—"}</td>
                      <td className="py-2.5 text-right font-bold text-green-700">{(e.paid ?? 0) > 0 ? money(e.paid) : "—"}</td>
                      <td className="py-2.5 text-right font-extrabold text-red-700">{money(bal.current)}</td>
                      <td className="py-2.5 pl-3 text-xs font-semibold text-blue-600">{paymentMethod}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ══ TOTALS ══ */}
          <div className="my-5 border-t-2 border-gray-900" />
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Total Amount</span>
                <span className="font-mono font-semibold text-purple-700">{money(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Total Adblue</span>
                <span className="font-mono font-semibold text-blue-700">{money(totalAdblue)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Total Paid</span>
                <span className="font-mono font-semibold text-green-700">{money(totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-red-200 pt-2 text-base font-extrabold text-red-700">
                <span>Balance Due</span>
                <span className="font-mono">{money(totalBalance)}</span>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══ */}
          <div className="mt-8 border-t border-gray-200 pt-6 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <p>Hi Wood Transporting — CR Diesel Ledger</p>
              <p>Generated: {today}</p>
            </div>
          </div>

        </div>
        {/* Bottom strip */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
      </div>
    </div>
  );
}
