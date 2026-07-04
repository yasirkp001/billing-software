"use client";

import { ResourceManager } from "@/components/crud/ResourceManager";
import { ConvertButton } from "@/components/crud/ConvertButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Column, FormField } from "@/components/crud/types";

const columns: Column[] = [
  { key: "id", label: "ID" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "distance", label: "Distance (km)" },
  { key: "dieselCost", label: "Diesel Cost" },
  {
    key: "invoice",
    label: "Invoice",
    render: (row: any) => {
      const inv = row.invoices?.[0];
      if (!inv) return <span className="text-gray-300">—</span>;
      return (
        <a
          href={`/invoices?q=${encodeURIComponent(inv.invoiceNumber)}`}
          className="font-semibold text-red-600 hover:text-red-700 hover:underline"
        >
          {inv.invoiceNumber}
        </a>
      );
    },
  },
  { key: "status", label: "Status", render: (row: any) => <StatusBadge status={row.status} /> },
];

const fields: FormField[] = [
  {
    name: "bookingId",
    label: "Booking",
    type: "select",
    required: true,
    optionsEndpoint: "/api/bookings",
    getOptionLabel: (item) => `${item.pickupLocation} ➔ ${item.dropLocation} (${new Date(item.pickupDate).toLocaleDateString()})`,
  },
  {
    name: "driverId",
    label: "Driver",
    type: "select",
    required: true,
    optionsEndpoint: "/api/drivers",
    getOptionLabel: (item) => item.name || item.id,
  },
  { name: "startDate", label: "Start Date", type: "date", required: true },
  { name: "endDate", label: "End Date", type: "date", required: true },
  { name: "distance", label: "Distance (km)", type: "number" },
  { name: "dieselUsed", label: "Diesel Used (liters)", type: "number" },
  { name: "dieselCost", label: "Diesel Cost", type: "number" },
  { name: "toll", label: "Toll Charges", type: "number" },
  { name: "otherExpenses", label: "Other Expenses", type: "number" },
  { name: "remarks", label: "Remarks", type: "textarea" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "pending", label: "Pending" },
    { value: "invoiced", label: "Invoiced" },
    { value: "paid", label: "Paid" },
  ]},
];

export default function TripSheetsPage() {
  return (
    <ResourceManager
      title="Trip Sheets"
      subtitle="Track trip details, fuel, and expenses"
      endpoint="/api/trip-sheets"
      columns={columns}
      fields={fields}
      searchPlaceholder="Search trip sheets…"
      extraActions={(row) =>
        row.status === "pending" ? (
          <ConvertButton
            endpoint={`/api/trip-sheets/${row.id}/invoice`}
            redirectTo="/invoices"
            label="Invoice"
            icon="invoices"
            confirmText="Generate a draft invoice from this trip sheet?"
          />
        ) : null
      }
    />
  );
}
