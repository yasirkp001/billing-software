"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { money, formatDate } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  invoice?: { invoiceNumber: string } | null;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};
const METHOD_ORDER = ["upi", "cash", "bank", "cheque", "other"];

export function PaymentsManager() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payments${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load");
      setRows(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  // Rows after applying the method dropdown filter.
  const filtered = useMemo(
    () => (methodFilter === "all" ? rows : rows.filter((p) => p.method === methodFilter)),
    [rows, methodFilter]
  );

  // Stats reflect the selected method (so picking UPI shows only UPI received).
  const summary = useMemo(() => {
    const total = filtered.reduce((s, p) => s + p.amount, 0);
    const now = new Date();
    const thisMonth = filtered
      .filter((p) => {
        const d = new Date(p.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + p.amount, 0);
    return { total, thisMonth, count: filtered.length };
  }, [filtered]);

  // ── Received, split by payment method ──
  const methodTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of rows) totals[p.method] = (totals[p.method] ?? 0) + p.amount;
    return METHOD_ORDER.filter((m) => (totals[m] ?? 0) > 0).map((m) => ({
      method: m,
      label: METHOD_LABEL[m] ?? m,
      amount: totals[m],
    }));
  }, [rows]);

  async function handleDelete(p: Payment) {
    if (!confirm(`Delete this ${money(p.amount)} payment? The invoice balance will be restored.`)) return;
    const res = await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== p.id));
    else {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
    }
  }

  const receivedLabel =
    methodFilter === "all" ? "Total Received" : `${METHOD_LABEL[methodFilter] ?? methodFilter} Received`;

  const stats = [
    { label: receivedLabel, value: money(summary.total), tone: "text-green-700", bg: "bg-green-100 text-green-600", icon: "wallet" as const },
    { label: "This Month", value: money(summary.thisMonth), tone: "text-gray-900", bg: "bg-gray-100 text-gray-600", icon: "revenue" as const },
    { label: "Payments", value: String(summary.count), tone: "text-gray-900", bg: "bg-red-100 text-red-600", icon: "payments" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Payments</h2>
        <p className="text-sm font-medium text-gray-500">Every payment received, across all invoices.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</span>
              <span className={`rounded-md p-1.5 ${s.bg}`}><Icon name={s.icon} size={15} /></span>
            </div>
            <p className={`mt-2 text-xl font-extrabold tracking-tight ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Received — split by payment method */}
      {methodTotals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Received by method</span>
          {methodTotals.map((m) => (
            <span key={m.method} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              <span className="text-gray-400">{m.label}</span>
              <span className="font-bold text-green-700">{money(m.amount)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" size={16} /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference…"
            className="w-full rounded-lg border border-wood-200 bg-wood-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-wood-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wood-200"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-lg border border-wood-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-gray-700 focus:border-wood-400 focus:outline-none focus:ring-2 focus:ring-wood-200 sm:w-44"
        >
          <option value="all">All Methods</option>
          {METHOD_ORDER.map((m) => (
            <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Icon name="overdue" size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-12 text-gray-400 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          <span className="text-sm font-medium">Loading payments…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
          <Icon name="payments" size={28} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-400">
            {methodFilter === "all" ? "No payments recorded yet" : `No ${METHOD_LABEL[methodFilter] ?? methodFilter} payments`}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {["Date", "Invoice", "Method", "Reference", "Amount"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-600">{formatDate(p.paymentDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-800">{p.invoice?.invoiceNumber ?? "—"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{METHOD_LABEL[p.method] ?? p.method}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.reference || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-green-700">{money(p.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800">{p.invoice?.invoiceNumber ?? "Advance"}</div>
                    <div className="text-xs font-medium text-gray-400">{formatDate(p.paymentDate)}</div>
                  </div>
                  <span className="font-bold text-green-700">{money(p.amount)}</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex flex-wrap gap-x-2 text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{METHOD_LABEL[p.method] ?? p.method}</span>
                    {p.reference && <span className="self-center text-xs">Ref: {p.reference}</span>}
                  </div>
                </div>
                <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                  <Button variant="danger" size="sm" onClick={() => handleDelete(p)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
