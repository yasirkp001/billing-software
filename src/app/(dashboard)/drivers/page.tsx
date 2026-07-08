"use client";

import Link from "next/link";
import { ResourceManager } from "@/components/crud/ResourceManager";
import type { Column, FormField, Row } from "@/components/crud/types";

function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
}

const columns: Column<Row>[] = [
  {
    key: "name",
    label: "Name",
    className: "font-medium",
    render: (r) => (
      <Link href={`/drivers/${r.id}`} className="font-bold text-red-600 hover:text-red-700 hover:underline">
        {String(r.name ?? "—")}
      </Link>
    ),
  },
  { key: "phone", label: "Phone" },
  { key: "licenseNumber", label: "License No." },
  { key: "licenseExpiry", label: "License Expiry", render: (r) => fmtDate(r.licenseExpiry) },
  {
    key: "salary",
    label: "Salary",
    render: (r) => (
      <span className="font-bold text-green-700">
        {r.salary ? `₹${Number(r.salary).toLocaleString("en-IN")}` : "—"}
      </span>
    ),
  },
  {
    key: "isActive",
    label: "Status",
    render: (r) => (
      <span
        className={
          r.isActive
            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
        }
      >
        {r.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];

const fields: FormField[] = [
  { name: "name", label: "Driver Name", type: "text", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "licenseNumber", label: "License Number", type: "text" },
  { name: "licenseExpiry", label: "License Expiry", type: "date" },
  { name: "salary", label: "Monthly Salary (₹)", type: "number" },
  { name: "address", label: "Address", type: "textarea", span: 2 },
  { name: "notes", label: "Notes", type: "textarea", span: 2 },
  { name: "isActive", label: "Active", type: "checkbox", defaultValue: true, span: 2 },
];

export default function DriversPage() {
  return (
    <ResourceManager
      title="Drivers"
      subtitle="Your drivers and their license details."
      endpoint="/api/drivers"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search by name, phone, license…"
    />
  );}