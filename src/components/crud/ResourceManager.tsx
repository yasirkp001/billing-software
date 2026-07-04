"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formatVehicleReg } from "@/lib/format";
import type { Column, FormField, Row } from "@/components/crud/types";

function emptyForm(fields: FormField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.name] =
      f.defaultValue ?? (f.type === "checkbox" ? false : f.type === "number" ? 0 : "");
  }
  return out;
}

// Convert an ISO date string to yyyy-mm-dd for <input type="date">.
function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function ResourceManager({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  searchPlaceholder = "Search…",
  extraActions,
  rowHref,
}: {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: Column<Row>[];
  fields: FormField[];
  searchPlaceholder?: string;
  extraActions?: (row: Row) => React.ReactNode;
  // When set, clicking anywhere on a row/card navigates here (e.g. a detail page).
  rowHref?: (row: Row) => string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("q") || "";
    }
    return "";
  });
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm(fields));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  useEffect(() => {
    const fetchDynamicOptions = async () => {
      const selectFields = fields.filter((f) => f.type === "select" && f.optionsEndpoint);
      for (const f of selectFields) {
        try {
          const res = await fetch(f.optionsEndpoint!);
          const body = await res.json();
          if (res.ok && body.data) {
            const mapped = body.data.map((item: any) => {
              let label = "";
              if (f.getOptionLabel) {
                label = f.getOptionLabel(item);
              } else if (f.optionsLabelKey) {
                label = String(item[f.optionsLabelKey]);
              } else {
                label = String(item.name || item.registrationNumber || item.id || item);
              }
              return {
                value: item.id || item.value || String(item),
                label,
              };
            });
            setDynamicOptions((prev) => ({ ...prev, [f.name]: mapped }));
          }
        } catch (err) {
          console.error(`Failed to load options for field ${f.name}:`, err);
        }
      }
    };
    fetchDynamicOptions();
  }, [fields]);

  const load = useCallback(
    async (q = "") => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${endpoint}${q ? `?q=${encodeURIComponent(q)}` : ""}`
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load");
        setRows(body.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(fields));
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    const next: Record<string, unknown> = {};
    for (const f of fields) {
      next[f.name] =
        f.type === "date" ? toDateInput(row[f.name]) : row[f.name] ?? emptyForm(fields)[f.name];
    }
    setForm(next);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const url = editingId ? `${endpoint}/${editingId}` : endpoint;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setModalOpen(false);
      load(query);
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    const res = await fetch(`${endpoint}/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Delete failed");
    }
  }

  function setField(name: string, value: unknown) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Page Header Card */}
      <div className="rounded-2xl border border-wood-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-wood-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-wood-200 bg-wood-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-wood-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wood-200 transition-colors sm:w-56"
              />
            </div>
            <Button onClick={openCreate} className="shrink-0 whitespace-nowrap">
              <Icon name="plus" size={16} /> Add
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-wood-100 bg-white py-12 text-gray-400 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-wood-400 border-t-transparent" />
          <span className="text-sm">Loading data…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-wood-100 bg-white py-16 shadow-sm">
          <span className="text-4xl opacity-30">📭</span>
          <p className="text-sm font-medium text-gray-400">No records yet</p>
          <p className="text-xs text-gray-300">Click &quot;+ Add&quot; above to create one</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-wood-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-wood-100 bg-gradient-to-r from-wood-50 to-wood-50/60">
                  {columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={rowHref ? () => router.push(rowHref(row)) : undefined}
                    className={`group transition-colors hover:bg-wood-50/40 ${rowHref ? "cursor-pointer" : ""} ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-5 py-3.5 text-sm text-gray-700 ${c.className ?? ""}`}>
                        {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {extraActions && extraActions(row)}
                        <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={rowHref ? () => router.push(rowHref(row)) : undefined}
                className={`rounded-2xl border border-wood-100 bg-white p-4 shadow-sm ${rowHref ? "cursor-pointer" : ""}`}
              >
                <dl className="space-y-1.5">
                  {columns.map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400">{c.label}</dt>
                      <dd className={`text-right text-gray-700 ${c.className ?? ""}`}>
                        {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div
                  className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-gray-100 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {extraActions && extraActions(row)}
                  <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingId ? "Edit" : "Add"} ${title.replace(/s$/, "")}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const value = form[f.name];
              if (f.type === "checkbox") {
                return (
                  <label
                    key={f.name}
                    className={`flex items-center gap-2 ${f.span === 2 ? "sm:col-span-2" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setField(f.name, e.target.checked)}
                      className="h-4 w-4 rounded border-wood-300 text-wood-700 focus:ring-wood-400"
                    />
                    <span className="text-sm font-medium text-gray-700">{f.label}</span>
                  </label>
                );
              }
              return (
                <Field
                  key={f.name}
                  label={f.label}
                  required={f.required}
                  className={f.span === 2 ? "sm:col-span-2" : ""}
                >
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={String(value ?? "")}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={String(value ?? "")}
                      onChange={(e) => setField(f.name, e.target.value)}
                      required={f.required}
                    >
                      <option value="">-- Select {f.label} --</option>
                      {(f.options || dynamicOptions[f.name] || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.format === "vehicleReg" ? (
                    <Input
                      type="text"
                      value={String(value ?? "")}
                      onChange={(e) => setField(f.name, formatVehicleReg(e.target.value))}
                      placeholder={f.placeholder ?? "KL-10-AU-5330"}
                      required={f.required}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={14}
                      pattern="[A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{1,4}"
                      title="Format: KL-10-AU-5330"
                    />
                  ) : (
                    <Input
                      type={f.type}
                      value={String(value ?? "")}
                      onChange={(e) =>
                        setField(
                          f.name,
                          f.type === "number"
                            ? e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                            : e.target.value
                        )
                      }
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
