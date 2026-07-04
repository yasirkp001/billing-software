"use client";

import { ResourceManager } from "@/components/crud/ResourceManager";
import type { Column, FormField, Row } from "@/components/crud/types";

const TYPE_OPTIONS = [
  { value: "truck", label: "Truck" },
  { value: "lorry", label: "Lorry" },
  { value: "tipper", label: "Tipper" },
  { value: "trailer", label: "Trailer" },
  { value: "crane", label: "Crane" },
  { value: "excavator", label: "Excavator" },
  { value: "other", label: "Other" },
];

function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
}

const columns: Column<Row>[] = [
  { key: "registrationNumber", label: "Reg. Number", className: "font-medium" },
  { key: "type", label: "Type", render: (r) => String(r.type ?? "").toUpperCase() },
  { key: "make", label: "Make" },
  {
    key: "capacityTons",
    label: "Capacity",
    render: (r) => (r.capacityTons ? `${r.capacityTons} T` : "—"),
  },
  {
    key: "ownership",
    label: "Ownership",
    render: (r) => (
      <span className="capitalize">{String(r.ownership ?? "own")}</span>
    ),
  },
  { key: "insuranceExpiry", label: "Insurance", render: (r) => fmtDate(r.insuranceExpiry) },
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
  { name: "registrationNumber", label: "Registration Number", type: "text", required: true, format: "vehicleReg", placeholder: "KL-10-AU-5330" },
  { name: "type", label: "Type", type: "select", options: TYPE_OPTIONS, defaultValue: "truck" },
  { name: "make", label: "Make", type: "text" },
  { name: "model", label: "Model", type: "text" },
  { name: "capacityTons", label: "Capacity (tons)", type: "number" },
  {
    name: "ownership",
    label: "Ownership",
    type: "select",
    options: [
      { value: "own", label: "Own" },
      { value: "hired", label: "Hired" },
    ],
    defaultValue: "own",
  },
  { name: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
  { name: "fitnessExpiry", label: "Fitness Expiry", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", span: 2 },
  { name: "isActive", label: "Active", type: "checkbox", defaultValue: true, span: 2 },
];

export default function VehiclesPage() {
  return (
    <ResourceManager
      title="Vehicles"
      subtitle="Your fleet of trucks and equipment."
      endpoint="/api/vehicles"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search by reg. number, make…"
    />
  );
}
