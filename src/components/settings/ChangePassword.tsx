"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePassword() {
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(key: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
    setDone(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not update password.");
      setForm(empty);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-base font-bold text-gray-900">Password</h3>
      <p className="mb-4 text-xs font-medium text-gray-500">
        Change the password you use to sign in.
      </p>

      <form onSubmit={save} className="max-w-md space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            <Icon name="overdue" size={15} /> {error}
          </div>
        )}
        {done && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            Password updated successfully.
          </div>
        )}

        <Field label="Current Password" required>
          <Input
            type={show ? "text" : "password"}
            value={form.currentPassword}
            onChange={(e) => set("currentPassword", e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New Password" required>
            <Input
              type={show ? "text" : "password"}
              value={form.newPassword}
              onChange={(e) => set("newPassword", e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm New Password" required>
            <Input
              type={show ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-500">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show passwords
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
