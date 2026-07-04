"use client";

import Link from "next/link";
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

const FUEL_OPTIONS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "cng", label: "CNG" },
  { value: "electric", label: "Electric" },
  { value: "other", label: "Other" },
];

const RC_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "scrapped", label: "Scrapped" },
  { value: "other", label: "Other" },
];

function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
}

const columns: Column<Row>[] = [
  {
    key: "registrationNumber",
    label: "Reg. Number",
    className: "font-medium",
    render: (r) => (
      <Link
        href={`/vehicles/${r.id}`}
        className="font-bold text-red-600 hover:text-red-700 hover:underline"
      >
        {String(r.registrationNumber ?? "—")}
      </Link>
    ),
  },
  { key: "type", label: "Type", render: (r) => String(r.type ?? "").toUpperCase() },
  { key: "make", label: "Brand" },
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
    key: "invoiceBills",
    label: "Invoice Bills",
    render: (r) => (
      <Link
        href={`/vehicles/${r.id}#invoices`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center rounded-lg border border-wood-200 bg-white px-3 py-1.5 text-xs font-bold text-wood-700 hover:bg-wood-50"
      >
        View bills
      </Link>
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
  { name: "registrationNumber", label: "Registration Number", type: "text", required: true, format: "vehicleReg", placeholder: "KL-10-AU-5330" },
  { name: "type", label: "Type", type: "select", options: TYPE_OPTIONS, defaultValue: "truck" },
  { name: "make", label: "Brand", type: "text" },
  { name: "model", label: "Model", type: "text" },
  { name: "capacityTons", label: "Capacity (tons)", type: "number" },
  { name: "purchasePrice", label: "Total Purchase Price", type: "number" },
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
  { name: "ownerName", label: "Owner Name", type: "text" },
  { name: "registeringAuthority", label: "Registering Authority (RTO)", type: "text" },
  { name: "vehicleClass", label: "Vehicle Class", type: "text", placeholder: "Goods Carrier (HGV)" },
  { name: "fuelType", label: "Fuel Type", type: "select", options: FUEL_OPTIONS },
  { name: "emissionNorm", label: "Emission Norm", type: "text", placeholder: "BS6" },
  { name: "vehicleStatus", label: "RC Status", type: "select", options: RC_STATUS_OPTIONS, defaultValue: "active" },
  { name: "hypothecated", label: "Hypothecated", type: "checkbox" },
  { name: "registrationDate", label: "Registration Date", type: "date" },
  { name: "insuranceExpiry", label: "Insurance Valid Upto", type: "date" },
  { name: "fitnessExpiry", label: "Fitness Valid Upto", type: "date" },
  { name: "taxValidUpto", label: "Tax Valid Upto", type: "date" },
  { name: "permitValidUpto", label: "Permit Valid Upto", type: "date" },
  { name: "puccValidUpto", label: "PUCC Valid Upto", type: "date" },
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
      searchPlaceholder="Search by reg. number, brand…"
      rowHref={(r) => `/vehicles/${r.id}`}
    />
  );
}
