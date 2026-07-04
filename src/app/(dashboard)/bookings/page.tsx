"use client";

import { ResourceManager } from "@/components/crud/ResourceManager";
import { ConvertButton } from "@/components/crud/ConvertButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Column, FormField } from "@/components/crud/types";

const columns: Column[] = [
  { key: "id", label: "ID" },
  { key: "pickupLocation", label: "From" },
  { key: "dropLocation", label: "To" },
  { key: "pickupDate", label: "Pickup Date" },
  { key: "ratePerDay", label: "Rate/Day" },
  {
    key: "startKm",
    label: "KM",
    render: (row: any) =>
      row.endKm > row.startKm
        ? `${Number(row.startKm).toLocaleString("en-IN")} → ${Number(row.endKm).toLocaleString("en-IN")}`
        : row.startKm
        ? Number(row.startKm).toLocaleString("en-IN")
        : "—",
  },
  {
    key: "documents",
    label: "Documents",
    render: (row: any) => {
      const ts = row.tripSheets?.[0];
      if (!ts) return <span className="text-gray-300">—</span>;
      const inv = ts.invoices?.[0];
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <a
            href={`/trip-sheets?q=${ts.id}`}
            className="font-medium text-wood-700 hover:text-wood-950 hover:underline"
          >
            Trip Sheet ↗
          </a>
          {inv && (
            <a
              href={`/invoices?q=${encodeURIComponent(inv.invoiceNumber)}`}
              className="font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              Invoice ({inv.invoiceNumber}) ↗
            </a>
          )}
        </div>
      );
    },
  },
  { key: "status", label: "Status", render: (row: any) => <StatusBadge status={row.status} /> },
];

const fields: FormField[] = [
  {
    name: "vehicleId",
    label: "Vehicle (NB)",
    type: "select",
    required: true,
    optionsEndpoint: "/api/vehicles",
    getOptionLabel: (item) => `${item.registrationNumber} (${item.make} ${item.model})`,
  },
  {
    name: "driverId",
    label: "Driver",
    type: "select",
    required: true,
    optionsEndpoint: "/api/drivers",
    getOptionLabel: (item) => item.name || item.id,
  },
  { name: "pickupLocation", label: "Pickup Location", type: "text", required: true },
  { name: "dropLocation", label: "Drop Location", type: "text", required: true },
  { name: "pickupDate", label: "Pickup Date", type: "date", required: true },
  { name: "dropDate", label: "Drop Date", type: "date", required: true },
  { name: "ratePerDay", label: "Rate per Day", type: "number", required: true },
  { name: "startKm", label: "Starting KM", type: "number" },
  { name: "endKm", label: "Ending KM", type: "number" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "pending", label: "Pending" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ]},
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function BookingsPage() {
  return (
    <ResourceManager
      title="Bookings"
      subtitle="Manage vehicle bookings and assignments"
      endpoint="/api/bookings"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search by pickup or drop location…"
      extraActions={(row) =>
        row.status !== "cancelled" ? (
          <ConvertButton
            endpoint={`/api/bookings/${row.id}/trip-sheet`}
            redirectTo="/trip-sheets"
            label="Trip Sheet"
            icon="trip-sheets"
            confirmText="Create a trip sheet from this booking? The booking will move to In Progress."
          />
        ) : null
      }
    />
  );
}
