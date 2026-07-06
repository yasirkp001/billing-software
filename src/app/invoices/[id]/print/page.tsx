"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface VehicleDetails {
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
  taxValidUpto?: string | null;
  puccValidUpto?: string | null;
  registrationDate?: string | null;
  emissionNorm?: string | null;
  vehicleClass?: string | null;
  registeringAuthority?: string | null;
  hypothecated?: boolean | null;
  area?: string | null;
  isActive?: boolean | null;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  startKm: number;
  endKm: number;
  km: number;
  status: string;
  vehicle?: VehicleDetails | null;
}

interface InvoiceData {
  id: string;
  vehicleId?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string;
  customer?: {
    name: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  } | null;
  vehicle?: VehicleDetails | null;
  driver?: { name: string; phone?: string } | null;
  lineItems?: LineItem[];
  tripSheet?: {
    id: string;
    startDate: string;
    endDate: string;
    distance: number;
    dieselCost: number;
    toll: number;
    otherExpenses: number;
    driver?: { name: string; phone: string } | null;
    booking?: {
      id: string;
      pickupLocation: string;
      dropLocation: string;
      pickupDate: string;
      dropDate: string;
      ratePerDay: number;
    } | null;
  } | null;
}

interface VehicleExpense {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string;
}

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const vehicleSummary = (vehicle?: VehicleDetails | null) =>
  [
    [vehicle?.make, vehicle?.model].filter(Boolean).join(" "),
    vehicle?.type ? vehicle.type.toUpperCase() : "",
    vehicle?.capacityTons ? `${vehicle.capacityTons} T` : "",
  ].filter(Boolean).join(" · ");

const vehicleInfo = (vehicle?: VehicleDetails | null) =>
  [
    { label: "Owner", value: vehicle?.ownerName || vehicle?.ownership || "" },
    { label: "Fuel", value: vehicle?.fuelType || "" },
    { label: "RC", value: vehicle?.vehicleStatus || "" },
    { label: "Insurance", value: fmtDate(vehicle?.insuranceExpiry) },
    { label: "Fitness", value: fmtDate(vehicle?.fitnessExpiry) },
    { label: "Permit", value: fmtDate(vehicle?.permitValidUpto) },
  ].filter((item) => item.value && item.value !== "—");

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((b) => {
        if (b.data) {
          setInvoice(b.data);
          // Fetch vehicle expenses — use top-level vehicleId or first line-item vehicleId
          const vid = b.data.vehicleId
            || b.data.vehicle?.id
            || b.data.lineItems?.[0]?.vehicleId;
          if (vid) {
            fetch(`/api/vehicles/${vid}/expenses`)
              .then((r) => r.json())
              .then((eb) => { if (eb.data) setExpenses(eb.data); })
              .catch(() => {});
          }
        } else {
          setError(b.error || "Not found");
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading invoice…</p>
        </div>
      </div>
    );

  if (error || !invoice)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Error</p>
          <p className="mt-1 text-sm text-gray-500">{error || "Invoice not found."}</p>
          <Link href="/invoices" className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Back to Invoices
          </Link>
        </div>
      </div>
    );

  const balance = invoice.totalAmount - (invoice.paidAmount || 0);
  const driverName = invoice.driver?.name || invoice.tripSheet?.driver?.name;
  // Use top-level vehicle or fall back to first line item's vehicle
  const primaryVehicle = invoice.vehicle ?? invoice.lineItems?.find((li) => li.vehicle)?.vehicle ?? null;
  const hasServiceDetails = !!(primaryVehicle?.registrationNumber || driverName || invoice.tripSheet);
  const hasLineItems = !!(invoice.lineItems && invoice.lineItems.length > 0);
  const showSubtotal = invoice.subtotal !== invoice.totalAmount;

  // Vehicle expense totals by category
  const dieselTotal = expenses.filter((e) => e.category === "diesel").reduce((s, e) => s + e.amount, 0);
  const fastagTotal = expenses.filter((e) => e.category === "fasttag").reduce((s, e) => s + e.amount, 0);
  const policeTotal = expenses.filter((e) => e.category === "police").reduce((s, e) => s + e.amount, 0);
  const hasVehicleExpenses = dieselTotal > 0 || fastagTotal > 0 || policeTotal > 0;

  const statusStyles: Record<string, string> = {
    paid: "bg-green-100 text-green-800 border border-green-200",
    sent: "bg-blue-100 text-blue-800 border border-blue-200",
    overdue: "bg-red-100 text-red-800 border border-red-200",
    draft: "bg-gray-100 text-gray-600 border border-gray-200",
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* Print action bar — hidden on print */}
      <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm no-print print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">Invoice {invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-400">Ready to print or save as PDF</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              🖨️ Print / Download PDF
            </button>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✕ Close
            </Link>
          </div>
        </div>
      </div>

      {/* ── Invoice Sheet ── */}
      <div
        id="invoice-sheet"
        className="mx-auto max-w-3xl bg-white shadow-sm print:shadow-none print:max-w-full"
      >
        {/* ── TOP STRIP — red accent bar ── */}
        <div className="h-1.5 bg-red-600 print:bg-red-600" />

        <div className="p-8 sm:p-10 print:p-8">

          {/* ── HEADER ── */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: logo + company */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                onError={(e) => { const img = e.currentTarget; if (!img.src.endsWith("/logo.svg")) img.src = "/logo.svg"; }}
                alt="Hi Wood Transporting"
                className="h-16 w-auto max-w-[220px] object-contain object-left"
              />
              <p className="mt-2 text-xs text-gray-500">Transportation &amp; Logistics Services</p>
              <p className="text-xs text-gray-500">Kerala, India</p>
            </div>

            {/* Right: invoice meta */}
            <div className="sm:text-right">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Invoice</h1>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-gray-500">
                  <span className="font-semibold text-gray-700">No:</span>{" "}
                  <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                </p>
                <p className="text-gray-500">
                  <span className="font-semibold text-gray-700">Date:</span>{" "}
                  {fmtDate(invoice.invoiceDate)}
                </p>
                <p className="mt-2">
                  <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusStyles[invoice.status] ?? statusStyles.draft}`}>
                    {invoice.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="my-6 border-t border-gray-200" />

          {/* ── BILL TO & BOOKING DETAILS ── */}
          {(invoice.customer || invoice.tripSheet?.booking) && (
            <>
              <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
                {/* Left: Customer Bill To */}
                {invoice.customer && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Bill To</p>
                    <p className="font-bold text-gray-900 text-base">{invoice.customer.name}</p>
                    {invoice.customer.address && <p className="mt-1 text-gray-500 whitespace-pre-line leading-relaxed">{invoice.customer.address}</p>}
                    {invoice.customer.phone && <p className="mt-1 text-gray-500">Phone: {invoice.customer.phone}</p>}
                    {invoice.customer.gstNumber && (
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">GSTIN:</span> {invoice.customer.gstNumber}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Right: Booking Details */}
                {invoice.tripSheet?.booking && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Booking Details</p>
                    <div className="space-y-1.5">
                      <p className="text-gray-500">
                        <span className="font-semibold text-gray-700">Route:</span>{" "}
                        <span className="font-bold text-gray-900">
                          {invoice.tripSheet.booking.pickupLocation} ➔ {invoice.tripSheet.booking.dropLocation}
                        </span>
                      </p>
                      <p className="text-gray-500">
                        <span className="font-semibold text-gray-700">Period:</span>{" "}
                        {fmtDate(invoice.tripSheet.booking.pickupDate)} — {fmtDate(invoice.tripSheet.booking.dropDate)}
                      </p>
                      <p className="text-gray-500">
                        <span className="font-semibold text-gray-700">Rate/Day:</span> {fmt(invoice.tripSheet.booking.ratePerDay)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="my-6 border-t border-gray-200" />
            </>
          )}

          {/* ── SERVICE DETAILS (only when data exists) ── */}
          {hasServiceDetails && (
            <>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Service Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  {driverName && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Driver</p>
                      <p className="mt-0.5 font-bold text-gray-800">{driverName}</p>
                    </div>
                  )}
                  {invoice.tripSheet && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Period</p>
                      <p className="mt-0.5 font-bold text-gray-800">
                        {fmtDate(invoice.tripSheet.startDate)} — {fmtDate(invoice.tripSheet.endDate)}
                      </p>
                      {invoice.tripSheet.distance > 0 && (
                        <p className="text-xs text-gray-500">{invoice.tripSheet.distance.toLocaleString("en-IN")} km</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── VEHICLE DETAILS full table ── */}
              {primaryVehicle?.registrationNumber && (
                <div className="mt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Vehicle Details</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-500 w-1/3">Registration No.</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{primaryVehicle.registrationNumber}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500 w-1/3">Type</td>
                          <td className="px-3 py-2 font-semibold text-gray-700 uppercase">{primaryVehicle.type || "—"}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-500">Brand</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.make || "—"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Model</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.model || "—"}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-500">Capacity</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.capacityTons ? `${primaryVehicle.capacityTons} T` : "—"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Vehicle Class</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.vehicleClass || "—"}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-500">Ownership</td>
                          <td className="px-3 py-2 text-gray-700 capitalize">{primaryVehicle.ownership || "—"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Owner Name</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.ownerName || "—"}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-500">Area / Region</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.area || "—"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Registering Auth.</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.registeringAuthority || "—"}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-500">Emission Norm</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.emissionNorm || "—"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">RC Status</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.vehicleStatus || "—"}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-500">Hypothecated</td>
                          <td className="px-3 py-2 text-gray-700">{primaryVehicle.hypothecated ? "Yes" : "No"}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Reg. Date</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.registrationDate)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-500">Insurance Expiry</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.insuranceExpiry)}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Fitness Expiry</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.fitnessExpiry)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-500">Tax Valid Upto</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.taxValidUpto)}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Permit Valid Upto</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.permitValidUpto)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-500">PUCC Valid Upto</td>
                          <td className="px-3 py-2 text-gray-700">{fmtDate(primaryVehicle.puccValidUpto)}</td>
                          <td className="px-3 py-2 font-semibold text-gray-500">Status</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${primaryVehicle.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {primaryVehicle.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                        {(dieselTotal > 0 || fastagTotal > 0 || policeTotal > 0) && (
                          <tr className="bg-purple-50">
                            <td colSpan={4} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              Vehicle Expenses
                            </td>
                          </tr>
                        )}
                        {dieselTotal > 0 && (
                          <tr>
                            <td className="px-3 py-2 font-semibold text-gray-500">Diesel</td>
                            <td className="px-3 py-2 font-semibold text-purple-700">{fmt(dieselTotal)}</td>
                            <td className="px-3 py-2 font-semibold text-gray-500">FASTag</td>
                            <td className="px-3 py-2 font-semibold text-cyan-700">{fastagTotal > 0 ? fmt(fastagTotal) : "—"}</td>
                          </tr>
                        )}
                        {policeTotal > 0 && (
                          <tr className="bg-gray-50">
                            <td className="px-3 py-2 font-semibold text-gray-500">Police</td>
                            <td className="px-3 py-2 font-semibold text-orange-700">{fmt(policeTotal)}</td>
                            <td className="px-3 py-2 font-semibold text-gray-500">Total Expenses</td>
                            <td className="px-3 py-2 font-extrabold text-gray-900">{fmt(dieselTotal + fastagTotal + policeTotal)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="my-6 border-t border-gray-200" />
            </>
          )}

          {/* ── LINE ITEMS TABLE ── */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {hasLineItems ? "Items" : "Charges"}
            </p>

            {hasLineItems ? (
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[15%]" />
                  <col className="w-[19%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <th className="pb-2.5 text-left">Description</th>
                    <th className="pb-2.5 text-left">Vehicle</th>
                    <th className="pb-2.5 text-right">KM (Start → End)</th>
                    <th className="pb-2.5 text-right">Days</th>
                    <th className="pb-2.5 text-right">Ton/Day</th>
                    <th className="pb-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems!.map((li, idx) => (
                    <tr key={idx} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3 font-medium text-gray-800 break-words">
                        {li.description || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 pr-3 text-gray-600 break-words">
                        {li.vehicle?.registrationNumber ? (
                          <>
                            <span className="font-semibold text-gray-700">{li.vehicle.registrationNumber}</span>
                            {vehicleSummary(li.vehicle) && (
                              <span className="mt-0.5 block text-xs text-gray-400">{vehicleSummary(li.vehicle)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-gray-700">
                        {li.startKm || li.endKm ? (
                          <>
                            <span className="whitespace-nowrap">
                              {li.startKm.toLocaleString("en-IN")} → {li.endKm.toLocaleString("en-IN")}
                            </span>
                            {li.km > 0 && (
                              <span className="block text-[10px] text-gray-400">{li.km.toLocaleString("en-IN")} km</span>
                            )}
                          </>
                        ) : li.km ? (
                          <span className="whitespace-nowrap">{li.km.toLocaleString("en-IN")} km</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{li.quantity}</td>
                      <td className="py-3 text-right font-mono tabular-nums text-gray-700 whitespace-nowrap">{fmt(li.rate)}</td>
                      <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <th className="pb-2.5 text-left">Description</th>
                    <th className="pb-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.tripSheet ? (
                    <>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-medium text-gray-800">Logistics &amp; Transportation</td>
                        <td className="py-3 text-right font-mono tabular-nums font-semibold text-gray-900">{fmt(invoice.subtotal)}</td>
                      </tr>
                      {invoice.tripSheet.dieselCost > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-3 pr-3 text-gray-500">Fuel / Diesel Charges</td>
                          <td className="py-3 text-right font-mono tabular-nums text-gray-400">{fmt(invoice.tripSheet.dieselCost)}</td>
                        </tr>
                      )}
                      {invoice.tripSheet.toll > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-3 pr-3 text-gray-500">Toll Charges</td>
                          <td className="py-3 text-right font-mono tabular-nums text-gray-400">{fmt(invoice.tripSheet.toll)}</td>
                        </tr>
                      )}
                      {invoice.tripSheet.otherExpenses > 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-3 pr-3 text-gray-500">Other Expenses</td>
                          <td className="py-3 text-right font-mono tabular-nums text-gray-400">{fmt(invoice.tripSheet.otherExpenses)}</td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-3 font-medium text-gray-800">Transportation Charge</td>
                      <td className="py-3 text-right font-mono tabular-nums font-semibold text-gray-900">{fmt(invoice.subtotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ── VEHICLE EXPENSES (Diesel / FASTag / Police) ── */}
          {hasVehicleExpenses && (
            <>
              <div className="my-6 border-t border-gray-200" />
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Vehicle Expenses
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <th className="pb-2.5 text-left">Expense</th>
                      <th className="pb-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dieselTotal > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-medium text-gray-800">Diesel</td>
                        <td className="py-3 text-right font-mono tabular-nums font-semibold text-gray-900">{fmt(dieselTotal)}</td>
                      </tr>
                    )}
                    {fastagTotal > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-medium text-gray-800">FASTag</td>
                        <td className="py-3 text-right font-mono tabular-nums font-semibold text-gray-900">{fmt(fastagTotal)}</td>
                      </tr>
                    )}
                    {policeTotal > 0 && (
                      <tr className="border-b border-gray-100">
                        <td className="py-3 pr-3 font-medium text-gray-800">Police</td>
                        <td className="py-3 text-right font-mono tabular-nums font-semibold text-gray-900">{fmt(policeTotal)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="py-2.5 pr-3 text-xs font-bold uppercase tracking-wider text-gray-500">Total Vehicle Expenses</td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-extrabold text-gray-900">
                        {fmt(dieselTotal + fastagTotal + policeTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* ── TOTALS ── */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-0 text-sm">
              {showSubtotal && (
                <div className="flex justify-between py-2 text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{fmt(invoice.subtotal)}</span>
                </div>
              )}
              <div className={`flex justify-between ${showSubtotal ? "border-t border-gray-200 pt-2" : "py-2"} text-base font-bold text-gray-900`}>
                <span>Total</span>
                <span className="font-mono tabular-nums">{fmt(invoice.totalAmount)}</span>
              </div>
              {(invoice.paidAmount || 0) > 0 && (
                <div className="flex justify-between py-2 text-green-700">
                  <span className="font-medium">Paid</span>
                  <span className="font-mono tabular-nums font-bold">{fmt(invoice.paidAmount)}</span>
                </div>
              )}
              <div className={`flex justify-between border-t-2 ${balance <= 0 ? "border-gray-200" : "border-red-100"} mt-1 pt-3 text-base font-extrabold ${balance <= 0 ? "text-gray-400" : "text-red-700"}`}>
                <span>Balance Due</span>
                <span className="font-mono tabular-nums">{fmt(Math.max(balance, 0))}</span>
              </div>
            </div>
          </div>

          {/* ── NOTES ── */}
          {invoice.notes && (
            <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="mt-10 border-t border-gray-200 pt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 text-xs text-gray-400">
            <div>
              <p className="mb-1.5 font-bold text-gray-500">Terms &amp; Conditions</p>
              <p>1. Please pay within 15 days of invoice date.</p>
              <p>2. Interest of 18% p.a. will be charged for delayed payments.</p>
            </div>
            <div className="flex flex-col items-start sm:items-end justify-end">
              <div className="w-44 border-t border-gray-300 pt-2 text-center">
                <p className="font-bold text-gray-600">Authorized Signatory</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Hi Wood Transporting</p>
              </div>
            </div>
          </div>

        </div>

        {/* ── BOTTOM STRIP ── */}
        <div className="h-1 bg-gray-100 print:bg-gray-100" />
      </div>
    </div>
  );
}
