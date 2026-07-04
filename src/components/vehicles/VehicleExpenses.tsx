"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { money, formatDate } from "@/lib/format";

export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
};

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "liability", label: "Liability / EMI" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "diesel", label: "Diesel" },
  { value: "fasttag", label: "FASTag" },
  { value: "tax", label: "Tax" },
  { value: "police", label: "Police" },
  { value: "other", label: "Other" },
  { value: "custom", label: "Custom (Type new...)" },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);

const CATEGORY_TONE: Record<string, string> = {
  liability: "bg-red-100 text-red-700",
  maintenance: "bg-amber-100 text-amber-700",
  insurance: "bg-blue-100 text-blue-700",
  diesel: "bg-purple-100 text-purple-700",
  fasttag: "bg-cyan-100 text-cyan-700",
  tax: "bg-gray-100 text-gray-600",
  police: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

const todayInput = () => new Date().toISOString().slice(0, 10);

export function VehicleExpenses({
  vehicleId,
  expenses,
}: {
  vehicleId: string;
  expenses: Expense[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Expense[]>(expenses);
  const [category, setCategory] = useState("liability");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    const finalCategory = category === "custom" ? customCategory.trim() : category;
    if (category === "custom" && !finalCategory) {
      setError("Enter a custom category name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: finalCategory, amount: amt, date, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to add expense");
      setRows((prev) =>
        [body.data, ...prev].sort((a, b) => +new Date(b.date) - +new Date(a.date))
      );
      setAmount("");
      setNote("");
      setCustomCategory("");
      setCategory("liability");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense entry?")) return;
    const res = await fetch(`/api/vehicles/${vehicleId}/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
    }
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-bold text-gray-900">Liability &amp; Expenses</h3>
        <span className="text-sm font-extrabold text-red-700">{money(total)}</span>
      </div>

      {/* Add form */}
      <form onSubmit={addExpense} className="grid grid-cols-1 gap-3 border-b border-gray-100 px-5 py-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Category">
          <div className="flex flex-col gap-2">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
            {category === "custom" && (
              <Input
                type="text"
                value={customCategory}
                placeholder="Enter custom category..."
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            )}
          </div>
        </Field>
        <Field label="Amount">
          <Input type="number" step="any" min="0" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button type="submit" disabled={saving} className="h-[38px]">
          <Icon name="plus" size={15} /> {saving ? "Adding…" : "Add"}
        </Button>
        <div className="sm:col-span-4">
          <Input value={note} placeholder="Note (optional) — e.g. EMI June, tyre change…" onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-xs font-medium text-red-600 sm:col-span-4">{error}</p>}
      </form>

      {/* List */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="outstanding" size={24} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-400">No expenses recorded yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Category</th>
                <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Note</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500">{formatDate(r.date)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_TONE[r.category] ?? CATEGORY_TONE.other}`}>
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.note || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-gray-800">{money(r.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteExpense(r.id)}
                      className="text-gray-300 transition-colors hover:text-red-500"
                      aria-label="Delete expense"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50/70">
                <td colSpan={3} className="px-5 py-3 text-right font-bold text-gray-700">Total</td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-extrabold text-red-700">{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
