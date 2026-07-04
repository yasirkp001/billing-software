"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function AccountDetails({
  initialName,
  initialEmail,
  role,
}: {
  initialName: string;
  initialEmail: string;
  role: string;
}) {
  const router = useRouter();
  const isAdmin = role === "admin";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Draft values while editing, so Cancel restores the saved ones.
  const [draftName, setDraftName] = useState(initialName);
  const [draftEmail, setDraftEmail] = useState(initialEmail);

  function startEdit() {
    setDraftName(name);
    setDraftEmail(email);
    setError("");
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, email: draftEmail }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save changes.");
      setName(body.data.name);
      setEmail(body.data.email);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-gray-900">{name}</p>
        <p className="truncate text-sm text-gray-500">{email}</p>
        <div className="mt-1 flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
              isAdmin ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {isAdmin && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
            {role}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="min-w-0 space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}
      <Field label="Full Name">
        <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Email Address">
        <Input
          type="email"
          value={draftEmail}
          onChange={(e) => setDraftEmail(e.target.value)}
          required
          autoComplete="off"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
