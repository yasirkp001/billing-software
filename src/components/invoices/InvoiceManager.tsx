"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { money, formatDate } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */

type LineItem = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  vehicleId: string | null;
  startKm: number;
  endKm: number;
  km: number;
  status: string;
  vehicle?: VehicleDetails | null;
};
type VehicleDetails = {
  registrationNumber: string;
  type?: string | null;
  make?: string | null;
  model?: string | null;
  capacityTons?: number | null;
  ownership?: string | null;
  ownerName?: string | null;
  fuelType?: string | null;
  vehicleStatus?: string | null;
  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  permitValidUpto?: string | null;
  isActive?: boolean | null;
};
type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes: string;
  customerId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  tripSheetId: string | null;
  tripSheet?: { bookingId: string | null } | null;
  customer?: { name: string } | null;
  vehicle?: VehicleDetails | null;
  driver?: { name: string } | null;
  lineItems?: LineItem[];
  payments?: { method: string; amount: number }[];
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  upi: "UPI",
  cheque: "Cheque",
  other: "Other",
};
const METHOD_ORDER = ["upi", "cash", "bank", "cheque", "other"];

/** Ordered, distinct payment-method labels used on an invoice. */
function methodsOf(inv: { payments?: { method: string }[] }): string[] {
  const set = new Set((inv.payments ?? []).map((p) => p.method));
  return METHOD_ORDER.filter((m) => set.has(m)).map((m) => METHOD_LABEL[m] ?? m);
}

/** True when any payment on the invoice was made via UPI. */
function isUpiPaid(inv: { payments?: { method: string }[] }): boolean {
  return (inv.payments ?? []).some((p) => p.method === "upi");
}

type Option = { value: string; label: string };
type VehicleOption = Option & VehicleDetails;
type FormLine = {
  description: string;
  quantity: string;
  rate: string;
  vehicleId: string;
  startKm: string;
  endKm: string;
  status: string;
};

const LINE_STATUS_OPTIONS = ["pending", "running", "completed"];
type FormState = {
  customerId: string;
  vehicleId: string;
  driverId: string;
  invoiceNumber: string;
  invoiceDate: string;
  lineItems: FormLine[];
  paidAmount: string;
  dieselAmount: string;
  fastagAmount: string;
  policeAmount: string;
  status: string;
  notes: string;
};

const STATUS_TABS = ["all", "draft", "sent", "paid", "overdue"] as const;
type Tab = (typeof STATUS_TABS)[number];

const num = (v: string) => (v === "" ? 0 : Number(v) || 0);
const todayInput = () => new Date().toISOString().slice(0, 10);
const toDateInput = (v: unknown) => {
  if (!v) return todayInput();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? todayInput() : d.toISOString().slice(0, 10);
};

function blankLine(): FormLine {
  return { description: "", quantity: "1", rate: "", vehicleId: "", startKm: "", endKm: "", status: "pending" };
}

function vehicleSummary(vehicle?: VehicleDetails | null): string {
  if (!vehicle) return "";
  return [
    [vehicle.make, vehicle.model].filter(Boolean).join(" "),
    vehicle.type ? vehicle.type.toUpperCase() : "",
    vehicle.capacityTons ? `${vehicle.capacityTons} T` : "",
  ].filter(Boolean).join(" · ");
}

function vehicleOwnerStatus(vehicle?: VehicleDetails | null): string {
  if (!vehicle) return "";
  return [
    vehicle.ownerName || vehicle.ownership,
    vehicle.fuelType,
    vehicle.vehicleStatus ? `RC ${vehicle.vehicleStatus}` : "",
  ].filter(Boolean).join(" · ");
}

function VehicleInlineDetails({ vehicle }: { vehicle?: VehicleDetails | null }) {
  const summary = vehicleSummary(vehicle);
  const ownerStatus = vehicleOwnerStatus(vehicle);
  if (!summary && !ownerStatus) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[10px] font-medium leading-tight text-gray-500">
      {summary && <p className="break-words">{summary}</p>}
      {ownerStatus && <p className="break-words">{ownerStatus}</p>}
    </div>
  );
}

function VehicleDetailsPanel({ vehicle, className = "" }: { vehicle?: VehicleDetails | null; className?: string }) {
  if (!vehicle) return null;
  const items = [
    { label: "Model", value: [vehicle.make, vehicle.model].filter(Boolean).join(" ") },
    { label: "Type", value: vehicle.type ? vehicle.type.toUpperCase() : "" },
    { label: "Capacity", value: vehicle.capacityTons ? `${vehicle.capacityTons} T` : "" },
    { label: "Owner", value: vehicle.ownerName || vehicle.ownership || "" },
    { label: "Fuel", value: vehicle.fuelType || "" },
    { label: "RC Status", value: vehicle.vehicleStatus || "" },
    { label: "Insurance", value: formatDate(vehicle.insuranceExpiry) },
    { label: "Fitness", value: formatDate(vehicle.fitnessExpiry) },
    { label: "Permit", value: formatDate(vehicle.permitValidUpto) },
  ].filter((item) => item.value && item.value !== "—");

  return (
    <div className={`rounded-lg border border-wood-100 bg-wood-50/70 px-3 py-2 text-xs ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-gray-900">{vehicle.registrationNumber}</span>
        <span className={vehicle.isActive === false ? "rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600" : "rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"}>
          {vehicle.isActive === false ? "Inactive" : "Active"}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
              <p className="mt-0.5 font-semibold capitalize text-gray-700">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function emptyForm(): FormState {
  return {
    customerId: "",
    vehicleId: "",
    driverId: "",
    invoiceNumber: "",
    invoiceDate: todayInput(),
    lineItems: [blankLine()],
    paidAmount: "0",
    dieselAmount: "0",
    fastagAmount: "0",
    policeAmount: "0",
    status: "draft",
    notes: "",
  };
}

export function InvoiceManager() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") || "";
    }
    return "";
  });
  const [tab, setTab] = useState<Tab>("all");
  const [error, setError] = useState("");

  // Dynamic select options
  const [customers, setCustomers] = useState<Option[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);

  // Edit / create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Payment modal
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(todayInput());
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices${q ? `?q=${encodeURIComponent(q)}` : ""}`);
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

  // Load dropdown options once.
  useEffect(() => {
    const fetchOpts = async (
      url: string,
      labelKey: "name" | "registrationNumber",
      set: (o: Option[]) => void
    ) => {
      try {
        const res = await fetch(url);
        const body = await res.json();
        if (res.ok && body.data) {
          set(body.data.map((d: any) => ({ value: d.id, label: d[labelKey] || d.id })));
        }
      } catch {
        /* ignore — selects just stay empty */
      }
    };
    const fetchVehicleOpts = async () => {
      try {
        const res = await fetch("/api/vehicles");
        const body = await res.json();
        if (res.ok && body.data) {
          setVehicles(
            body.data.map((d: any) => ({
              ...d,
              value: d.id,
              label: d.registrationNumber || d.id,
              registrationNumber: d.registrationNumber || d.id,
            }))
          );
        }
      } catch {
        /* ignore — selects just stay empty */
      }
    };
    fetchOpts("/api/customers", "name", setCustomers);
    fetchVehicleOpts();
    fetchOpts("/api/drivers", "name", setDrivers);
  }, []);

  // ── Summary (over the loaded result set) ──
  const summary = useMemo(() => {
    let billed = 0,
      collected = 0,
      overdue = 0;
    for (const r of rows) {
      billed += r.totalAmount;
      collected += r.paidAmount;
      if (r.status === "overdue") overdue += r.totalAmount - r.paidAmount;
    }
    return { billed, collected, outstanding: billed - collected, overdue };
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  // ── Collected, split by payment method ──
  const methodTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) {
      for (const p of r.payments ?? []) {
        totals[p.method] = (totals[p.method] ?? 0) + p.amount;
      }
    }
    return METHOD_ORDER.filter((m) => (totals[m] ?? 0) > 0).map((m) => ({
      method: m,
      label: METHOD_LABEL[m] ?? m,
      amount: totals[m],
    }));
  }, [rows]);

  const visible = tab === "all" ? rows : rows.filter((r) => r.status === tab);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.value, v])), [vehicles]);

  // ── Live form totals ──
  const totals = useMemo(() => {
    const subtotal = form.lineItems.reduce((s, l) => s + num(l.quantity) * num(l.rate), 0);
    return { subtotal, total: subtotal };
  }, [form.lineItems]);

  const vehicleForLine = (line: FormLine) => vehicleById.get(line.vehicleId || form.vehicleId);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(inv: Invoice) {
    setEditingId(inv.id);
    setForm({
      customerId: inv.customerId ?? "",
      vehicleId: inv.vehicleId ?? "",
      driverId: inv.driverId ?? "",
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: toDateInput(inv.invoiceDate),
      lineItems:
        inv.lineItems && inv.lineItems.length
          ? inv.lineItems.map((l) => ({
              description: l.description,
              quantity: String(l.quantity),
              rate: String(l.rate),
              vehicleId: l.vehicleId ?? "",
              startKm: l.startKm ? String(l.startKm) : "",
              endKm: l.endKm ? String(l.endKm) : "",
              status: l.status || "pending",
            }))
          : [{ ...blankLine(), rate: String(inv.subtotal || "") }],
      paidAmount: String(inv.paidAmount ?? 0),
      dieselAmount: "0",
      fastagAmount: "0",
      policeAmount: "0",
      status: inv.status,
      notes: inv.notes ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function setLine(i: number, key: keyof FormLine, value: string) {
    setForm((f) => {
      const lineItems = f.lineItems.map((l, idx) => (idx === i ? { ...l, [key]: value } : l));
      return { ...f, lineItems };
    });
  }
  function setBillVehicle(vehicleId: string) {
    setForm((f) => ({
      ...f,
      vehicleId,
      lineItems: f.lineItems.map((line) =>
        !line.vehicleId || line.vehicleId === f.vehicleId ? { ...line, vehicleId } : line
      ),
    }));
  }
  const addLine = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, { ...blankLine(), vehicleId: f.vehicleId }] }));
  const removeLine = (i: number) =>
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.length > 1 ? f.lineItems.filter((_, idx) => idx !== i) : f.lineItems,
    }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        gstPercentage: 0,
        paidAmount: num(form.paidAmount),
        lineItems: form.lineItems
          .filter((l) => l.description.trim() || num(l.rate) !== 0 || num(l.startKm) !== 0 || num(l.endKm) !== 0)
          .map((l) => ({
            description: l.description.trim(),
            quantity: num(l.quantity),
            rate: num(l.rate),
            vehicleId: l.vehicleId || form.vehicleId || null,
            startKm: num(l.startKm),
            endKm: num(l.endKm),
            status: l.status,
          })),
      };
      const url = editingId ? `/api/invoices/${editingId}` : "/api/invoices";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");

      // Save Diesel / FASTag / Police as vehicle expenses if amounts > 0
      const savedInvoice = body.data;
      const vehicleId = form.vehicleId ||
        form.lineItems.find((l) => l.vehicleId)?.vehicleId || null;
      if (vehicleId) {
        const today = new Date().toISOString().slice(0, 10);
        const expenseEntries = [
          { category: "diesel", amount: num(form.dieselAmount), label: "Diesel" },
          { category: "fasttag", amount: num(form.fastagAmount), label: "FASTag" },
          { category: "police", amount: num(form.policeAmount), label: "Police" },
        ].filter((e) => e.amount > 0);
        await Promise.all(
          expenseEntries.map((e) =>
            fetch(`/api/vehicles/${vehicleId}/expenses`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category: e.category,
                amount: e.amount,
                date: today,
                note: `Invoice ${savedInvoice?.invoiceNumber || ""}`,
              }),
            })
          )
        );
      }

      setModalOpen(false);
      load(query);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== inv.id));
    else {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
    }
  }

  function openPayment(inv: Invoice) {
    setPayTarget(inv);
    setPayAmount(String(Math.max(inv.totalAmount - inv.paidAmount, 0) || ""));
    setPayMethod("cash");
    setPayReference("");
    setPayDate(todayInput());
    setPayError("");
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch(`/api/invoices/${payTarget.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num(payAmount),
          method: payMethod,
          reference: payReference,
          paymentDate: payDate,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Payment failed");
      setPayTarget(null);
      // Reload so the method breakdown + per-invoice method chips reflect the
      // newly recorded payment (the payment endpoint can't return it inline).
      load(query);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  const stats: { label: string; value: string; icon: IconName; tone: string; bg: string }[] = [
    { label: "Billed", value: money(summary.billed), icon: "revenue", tone: "text-gray-900", bg: "bg-gray-100 text-gray-600" },
    { label: "Collected", value: money(summary.collected), icon: "wallet", tone: "text-green-700", bg: "bg-green-100 text-green-600" },
    { label: "Outstanding", value: money(summary.outstanding), icon: "outstanding", tone: "text-amber-700", bg: "bg-amber-100 text-amber-600" },
    { label: "Overdue", value: money(summary.overdue), icon: "overdue", tone: "text-red-700", bg: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Invoices</h2>
        <p className="text-sm font-medium text-gray-500">Generate, itemize and collect on invoices.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</span>
              <span className={`rounded-md p-1.5 ${s.bg}`}>
                <Icon name={s.icon} size={15} />
              </span>
            </div>
            <p className={`mt-2 text-xl font-extrabold tracking-tight ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Collected — split by payment method */}
      {methodTotals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Collected by method</span>
          {methodTotals.map((m) => (
            <span key={m.method} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              <span className="text-gray-400">{m.label}</span>
              <span className="font-bold text-green-700">{money(m.amount)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Toolbar: tabs + search + add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                tab === t ? "bg-red-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t} <span className={tab === t ? "text-red-100" : "text-gray-400"}>({counts[t] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon name="search" size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice #…"
              className="w-full rounded-lg border border-wood-200 bg-wood-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-wood-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wood-200 sm:w-52"
            />
          </div>
          <Button onClick={openCreate} className="shrink-0 whitespace-nowrap">
            <Icon name="plus" size={16} /> Add
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Icon name="overdue" size={16} /> {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-12 text-gray-400 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          <span className="text-sm font-medium">Loading invoices…</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
          <Icon name="invoices" size={28} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-400">No invoices here</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {["Invoice #", "Vehicle", "Total", "Paid", "Method", "Balance Due", "Check Balance", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((inv) => {
                  const balance = inv.totalAmount - inv.paidAmount;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-bold text-gray-800">{inv.invoiceNumber}</div>
                        <div className="text-xs font-medium text-gray-400">{formatDate(inv.invoiceDate)}</div>
                        <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                          {inv.tripSheetId && (
                            <a
                              href={`/trip-sheets?q=${inv.tripSheetId}`}
                              className="font-semibold text-red-600 hover:text-red-700 hover:underline"
                            >
                              Trip Sheet ↗
                            </a>
                          )}
                          {inv.tripSheet?.bookingId && (
                            <a
                              href={`/bookings?q=${inv.tripSheet.bookingId}`}
                              className="font-medium text-wood-600 hover:text-wood-800 hover:underline"
                            >
                              Booking ↗
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {inv.vehicleId && inv.vehicle ? (
                          <div>
                            <a
                              href={`/vehicles/${inv.vehicleId}`}
                              className="font-semibold text-wood-700 hover:text-wood-950 hover:underline"
                            >
                              {inv.vehicle.registrationNumber}
                            </a>
                            <VehicleInlineDetails vehicle={inv.vehicle} />
                          </div>
                        ) : (
                          <div className="text-gray-400">—</div>
                        )}
                        {inv.driver && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            Driver:{" "}
                            <a
                              href={`/drivers?q=${encodeURIComponent(inv.driver.name)}`}
                              className="hover:text-gray-700 hover:underline"
                            >
                              {inv.driver.name}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-800">{money(inv.totalAmount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-green-700">{money(inv.paidAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {methodsOf(inv).length ? (
                            methodsOf(inv).map((m) => (
                              <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{m}</span>
                            ))
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 font-bold ${balance > 0 ? "text-amber-700" : "text-gray-400"}`}>
                        {balance > 0 ? money(balance) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-gray-700">
                        {isUpiPaid(inv) ? money(balance) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {balance > 0 && (
                            <Button variant="success" size="sm" onClick={() => openPayment(inv)}>
                              <Icon name="wallet" size={13} /> Pay
                            </Button>
                          )}
                          <a
                            href={`/invoices/${inv.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-wood-200 bg-white px-3 py-1.5 text-sm font-semibold text-wood-700 hover:bg-wood-50 transition-colors"
                          >
                            <Icon name="print" size={13} /> Print
                          </a>
                          <Button variant="secondary" size="sm" onClick={() => openEdit(inv)}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(inv)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {visible.map((inv) => {
              const balance = inv.totalAmount - inv.paidAmount;
              return (
                <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-800">{inv.invoiceNumber}</div>
                      <div className="text-xs font-medium text-gray-400">{formatDate(inv.invoiceDate)}</div>
                      <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                        {inv.tripSheetId && (
                          <a
                            href={`/trip-sheets?q=${inv.tripSheetId}`}
                            className="font-semibold text-red-600 hover:text-red-700 hover:underline"
                          >
                            Trip Sheet ↗
                          </a>
                        )}
                        {inv.tripSheet?.bookingId && (
                          <a
                            href={`/bookings?q=${inv.tripSheet.bookingId}`}
                            className="font-medium text-wood-600 hover:text-wood-800 hover:underline"
                          >
                            Booking ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="mt-3 space-y-1 text-sm border-t border-gray-100/50 pt-2">
                    {inv.vehicleId && inv.vehicle && (
                      <div className="flex flex-wrap gap-x-1.5 text-gray-600">
                        <span className="text-gray-400">Vehicle:</span>
                        <div className="min-w-0">
                          <a
                            href={`/vehicles/${inv.vehicleId}`}
                            className="font-bold text-wood-700 hover:text-wood-950 hover:underline"
                          >
                            {inv.vehicle.registrationNumber}
                          </a>
                          <VehicleInlineDetails vehicle={inv.vehicle} />
                        </div>
                      </div>
                    )}
                    {inv.driver && (
                      <div className="flex flex-wrap gap-x-1.5 text-gray-600">
                        <span className="text-gray-400">Driver:</span>
                        <a
                          href={`/drivers?q=${encodeURIComponent(inv.driver.name)}`}
                          className="font-medium text-gray-700 hover:text-gray-900 hover:underline"
                        >
                          {inv.driver.name}
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-800">{money(inv.totalAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-700">{money(inv.paidAmount)}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance Due</span>
                      <span className={`font-bold ${balance > 0 ? "text-amber-700" : "text-gray-400"}`}>{balance > 0 ? money(balance) : "—"}</span>
                    </div>
                    {isUpiPaid(inv) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Check Balance (UPI)</span>
                        <span className="font-bold text-gray-700">{money(balance)}</span>
                      </div>
                    )}
                    {methodsOf(inv).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-gray-500">Method</span>
                        {methodsOf(inv).map((m) => (
                          <span key={m} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-gray-100 pt-3">
                    {balance > 0 && (
                      <Button variant="success" size="sm" onClick={() => openPayment(inv)} className="w-full">
                        <Icon name="wallet" size={13} /> Pay
                      </Button>
                    )}
                    <a
                      href={`/invoices/${inv.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-wood-200 bg-white px-3 py-1.5 text-sm font-semibold text-wood-700 hover:bg-wood-50 transition-colors"
                    >
                      <Icon name="print" size={13} /> Print
                    </a>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(inv)} className="w-full">Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(inv)} className="w-full">Delete</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editingId ? "Edit" : "New"} Invoice`} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Customer">
              <Select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}>
                <option value="">— Select —</option>
                {customers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Bill Vehicle">
              <Select value={form.vehicleId} onChange={(e) => setBillVehicle(e.target.value)}>
                <option value="">— Select —</option>
                {vehicles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="Driver">
              <Select value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}>
                <option value="">— Select —</option>
                {drivers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            {vehicleById.get(form.vehicleId) && (
              <div className="sm:col-span-3">
                <VehicleDetailsPanel vehicle={vehicleById.get(form.vehicleId)} />
              </div>
            )}
            <Field label="Invoice Number" required>
              <Input value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} required />
            </Field>
            <Field label="Invoice Date" required>
              <Input type="date" value={form.invoiceDate} onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))} required />
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Line Items</span>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700">
                <Icon name="plus" size={13} /> Add row
              </button>
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 sm:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="w-48 px-2 py-2 text-left">Bill Vehicle</th>
                    <th className="w-24 px-2 py-2 text-right">Start KM</th>
                    <th className="w-24 px-2 py-2 text-right">End KM</th>
                    <th className="w-16 px-2 py-2 text-right">Days</th>
                    <th className="w-24 px-2 py-2 text-right">Ton/Day</th>
                    <th className="w-24 px-2 py-2 text-right">Amount</th>
                    <th className="w-28 px-2 py-2 text-left">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {form.lineItems.map((l, i) => (
                    <tr key={i} className="border-t border-gray-100 align-top">
                      <td className="px-2 py-1.5">
                        <input
                          value={l.description}
                          onChange={(e) => setLine(i, "description", e.target.value)}
                          placeholder="Transport charge, etc."
                          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm focus:border-wood-300 focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={l.vehicleId}
                          onChange={(e) => setLine(i, "vehicleId", e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-wood-400 focus:outline-none"
                        >
                          <option value="">{form.vehicleId ? "Use bill vehicle" : "—"}</option>
                          {vehicles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <VehicleInlineDetails vehicle={vehicleForLine(l)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="any" value={l.startKm}
                          onChange={(e) => setLine(i, "startKm", e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="any" value={l.endKm}
                          onChange={(e) => setLine(i, "endKm", e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none"
                        />
                        {num(l.endKm) > num(l.startKm) && (
                          <p className="mt-0.5 text-right text-[10px] font-medium text-gray-400">
                            {(num(l.endKm) - num(l.startKm)).toLocaleString("en-IN")} km
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="any" value={l.quantity}
                          onChange={(e) => setLine(i, "quantity", e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number" step="any" value={l.rate}
                          onChange={(e) => setLine(i, "rate", e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-gray-700">
                        {money(num(l.quantity) * num(l.rate))}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={l.status}
                          onChange={(e) => setLine(i, "status", e.target.value)}
                          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm capitalize focus:border-wood-400 focus:outline-none"
                        >
                          {LINE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-500" aria-label="Remove row">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile line-item cards */}
            <div className="space-y-3 sm:hidden">
              {form.lineItems.map((l, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Item {i + 1}</span>
                    <button type="button" onClick={() => removeLine(i)} className="text-gray-300 hover:text-red-500" aria-label="Remove row">✕</button>
                  </div>
                  <input
                    value={l.description}
                    onChange={(e) => setLine(i, "description", e.target.value)}
                    placeholder="Description (transport charge, etc.)"
                    className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm focus:border-wood-400 focus:outline-none"
                  />
                  <select
                    value={l.vehicleId}
                    onChange={(e) => setLine(i, "vehicleId", e.target.value)}
                    className="mt-2 w-full rounded-md border border-gray-200 px-2 py-2 text-sm focus:border-wood-400 focus:outline-none"
                  >
                    <option value="">{form.vehicleId ? "Use bill vehicle" : "— Vehicle —"}</option>
                    {vehicles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <VehicleDetailsPanel vehicle={vehicleForLine(l)} className="mt-2" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-gray-500">
                      Start KM
                      <input type="number" step="any" value={l.startKm} onChange={(e) => setLine(i, "startKm", e.target.value)} placeholder="0"
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none" />
                    </label>
                    <label className="text-xs font-medium text-gray-500">
                      End KM
                      <input type="number" step="any" value={l.endKm} onChange={(e) => setLine(i, "endKm", e.target.value)} placeholder="0"
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none" />
                    </label>
                  </div>
                  {num(l.endKm) > num(l.startKm) && (
                    <p className="mt-1 text-right text-[11px] font-medium text-gray-400">
                      Distance: {(num(l.endKm) - num(l.startKm)).toLocaleString("en-IN")} km
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs font-medium text-gray-500">
                      Days
                      <input type="number" step="any" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)}
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none" />
                    </label>
                    <label className="text-xs font-medium text-gray-500">
                      Ton/Day
                      <input type="number" step="any" value={l.rate} onChange={(e) => setLine(i, "rate", e.target.value)}
                        className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-wood-400 focus:outline-none" />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <select
                      value={l.status}
                      onChange={(e) => setLine(i, "status", e.target.value)}
                      className="rounded-md border border-gray-200 px-2 py-1.5 text-sm capitalize focus:border-wood-400 focus:outline-none"
                    >
                      {LINE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="text-sm font-bold text-gray-700">{money(num(l.quantity) * num(l.rate))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + Paid Amount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Field label="Paid Amount">
                <Input type="number" step="any" min="0" value={form.paidAmount} onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))} placeholder="0" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Diesel">
                  <Input type="number" step="any" min="0" value={form.dieselAmount} onChange={(e) => setForm((f) => ({ ...f, dieselAmount: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="FASTag">
                  <Input type="number" step="any" min="0" value={form.fastagAmount} onChange={(e) => setForm((f) => ({ ...f, fastagAmount: e.target.value }))} placeholder="0" />
                </Field>
                <Field label="Police">
                  <Input type="number" step="any" min="0" value={form.policeAmount} onChange={(e) => setForm((f) => ({ ...f, policeAmount: e.target.value }))} placeholder="0" />
                </Field>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between py-1 text-gray-600">
                <span className="font-medium">Subtotal</span><span className="font-bold">{money(totals.subtotal, { decimals: true })}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 text-gray-900">
                <span className="font-bold">Total</span><span className="text-base font-extrabold text-red-600">{money(totals.total, { decimals: true })}</span>
              </div>
              {num(form.paidAmount) > 0 && (
                <>
                  <div className="flex justify-between py-1 text-green-700">
                    <span className="font-medium">Paid</span><span className="font-bold">{money(num(form.paidAmount), { decimals: true })}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-500">
                    <span className="font-medium">Balance Due</span>
                    <span className="font-bold text-amber-700">{money(Math.max(totals.total - num(form.paidAmount), 0), { decimals: true })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes shown on the invoice" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Update Invoice" : "Create Invoice"}</Button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Record Payment">
        {payTarget && (
          <form onSubmit={handlePayment} className="space-y-4">
            {payError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{payError}</div>}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between py-0.5 text-gray-600"><span className="font-medium">Invoice</span><span className="font-bold">{payTarget.invoiceNumber}</span></div>
              <div className="flex justify-between py-0.5 text-gray-600"><span className="font-medium">Total</span><span className="font-bold">{money(payTarget.totalAmount)}</span></div>
              <div className="flex justify-between py-0.5 text-gray-600"><span className="font-medium">Already Paid</span><span className="font-bold text-green-700">{money(payTarget.paidAmount)}</span></div>
              <div className="mt-1 flex justify-between border-t border-gray-200 pt-2"><span className="font-bold text-gray-800">Balance Due</span><span className="font-extrabold text-amber-700">{money(payTarget.totalAmount - payTarget.paidAmount)}</span></div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Payment Amount" required>
                <Input type="number" step="any" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required autoFocus />
              </Field>
              <Field label="Payment Date">
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </Field>
              <Field label="Method">
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Reference / Txn No.">
                <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="UTR, cheque #, etc." />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setPayAmount(String(Math.max(payTarget.totalAmount - payTarget.paidAmount, 0)))}
              className="text-xs font-bold text-red-600 hover:text-red-700"
            >
              Pay full balance
            </button>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button type="submit" variant="success" disabled={paying}>{paying ? "Recording…" : "Record Payment"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
