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

  useEffect(() => {
    if (!loading && entries.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, entries]);

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
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; font-size: 11px; }
        th { background: #f3f4f6; font-weight: 700; text-transform: uppercase; font-size: 10px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
        .text-purple { color: #7c3aed; }
        .text-blue { color: #2563eb; }
        .text-amber { color: #d97706; }
        tfoot td { background: #f9fafb; font-weight: 700; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#dc2626", margin: 0 }}>HI WOOD TRANSPORTING</h1>
            <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: 12 }}>CR Diesel Ledger</p>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280" }}>
            <p style={{ margin: 0 }}>Date: {today}</p>
            <p style={{ margin: 0 }}>Total Entries: {entries.length}</p>
          </div>
        </div>
        <hr style={{ border: "2px solid #dc2626", margin: "10px 0" }} />
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Amount", value: money(totalAmount), color: "#7c3aed" },
          { label: "Total Adblue", value: money(totalAdblue), color: "#2563eb" },
          { label: "Total Paid", value: money(totalPaid), color: "#16a34a" },
          { label: "Balance Due", value: money(totalBalance), color: "#dc2626" },
        ].map((c) => (
          <div key={c.label} style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{c.label}</p>
            <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 800, color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="text-center">No</th>
              <th>Date</th>
              <th>Vehicle No</th>
              <th className="text-right">Prev Balance</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Adblue</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Balance</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const bal = balanceMap.get(e.id) ?? { prev: 0, current: 0 };
              const isGeneral = e.note?.includes("[GENERAL]");
              const paymentMatch = e.note?.match(/Payment: (\w+)/i);
              const paymentMethod = paymentMatch ? paymentMatch[1] : (e.paid ?? 0) > 0 ? "Cash" : "";
              return (
                <tr key={e.id}>
                  <td className="text-center" style={{ color: "#9ca3af" }}>{idx + 1}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(e.date)}</td>
                  <td className="font-bold text-red">{isGeneral ? "General" : (e.vehicle?.registrationNumber ?? "—")}</td>
                  <td className="text-right" style={{ color: "#6b7280" }}>{money(bal.prev)}</td>
                  <td className="text-right text-purple font-bold">{e.amount > 0 ? money(e.amount) : "—"}</td>
                  <td className="text-right text-blue">{(e.adblue ?? 0) > 0 ? money(e.adblue) : "—"}</td>
                  <td className="text-right text-green font-bold">{(e.paid ?? 0) > 0 ? money(e.paid) : "—"}</td>
                  <td className="text-right text-red font-bold">{money(bal.current)}</td>
                  <td style={{ fontSize: 10, color: "#2563eb", fontWeight: 600 }}>{paymentMethod}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="text-right">TOTAL</td>
              <td className="text-right text-purple">{money(totalAmount)}</td>
              <td className="text-right text-blue">{money(totalAdblue)}</td>
              <td className="text-right text-green">{money(totalPaid)}</td>
              <td className="text-right text-red">{money(totalBalance)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}

      {/* Print button */}
      <div className="no-print" style={{ marginTop: 20, textAlign: "center" }}>
        <button
          onClick={() => window.print()}
          style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          🖨️ Print / Save as PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ marginLeft: 10, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>
    </>
  );
}
