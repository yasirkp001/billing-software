"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
};

function RoleBadge({ role }: { role: string }) {
  const admin = role === "admin";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
        admin ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {admin && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
      {role}
    </span>
  );
}

export function UserManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [showPw, setShowPw] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load");
      setUsers(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ name: "", email: "", password: "", role: "admin" });
    setFormError("");
    setShowPw(false);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create user");
      setOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Remove ${u.email}? They will lose access immediately.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } else {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Delete failed");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Team Members</h3>
          <p className="text-xs font-medium text-gray-500">
            Add admins or staff who can log in to the billing system.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Icon name="plus" size={15} /> Add Member
        </Button>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <Icon name="overdue" size={15} /> {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          <span className="text-sm font-medium">Loading team…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <Icon name="drivers" size={26} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-400">No team members yet</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {["Name", "Email", "Role", "Added", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className={`whitespace-nowrap px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 ${
                        i === 4 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-800">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">You</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-medium text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      {u.id !== currentUserId && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>Remove</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-800">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">You</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-gray-500">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs font-medium text-gray-400">{formatDate(u.createdAt)}</span>
                  {u.id !== currentUserId && (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>Remove</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add member modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Team Member">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div>
          )}

          <Field label="Full Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Yasir KP"
              required
              autoFocus
            />
          </Field>

          <Field label="Email Address" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@hiwood.com"
              required
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Password" required>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] font-bold text-gray-400 hover:text-gray-700"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin — full access</option>
                <option value="staff">Staff — standard access</option>
              </Select>
            </Field>
          </div>

          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            The member can log in immediately with this email and password. Share the
            credentials securely; they can be changed later.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add Member"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
