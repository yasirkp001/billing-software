"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface VehicleDetails {
  id?: string;
  registrationNumber: string;
  type?: string | null;
  make?: string | null;
  model?: string | null;
  capacityTons?: number | null;
  ownership?: string | null;
  ownerName?: string | null;
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
  vehicleId?: string | null;
  startKm: number;
  endKm: number;
  km: number;
  status: string;
  vehicle?: (VehicleDetails & { id?: string }) | null;
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
  customer?: { name: string; phone?: string; address?: string; gstNumber?: string } | null;
  vehicle?: VehicleDetails | null;
  driver?: { name: string; phone?: string } | null;
  lineItems?: LineItem[];
  tripSheet?: {
    id: string; startDate: string; endDate: string; distance: number;
    dieselCost: number; toll: number; otherExpenses: number;
    driver?: { name: string; phone: string } | null;
    booking?: { id: string; pickupLocation: string; dropLocation: string; pickupDate: string; dropDate: string; ratePerDay: number } | null;
  } | null;
}

interface VehicleExpense { id: string; category: string; amount: number; date: string; note: string; }

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Section header reused across the bill
function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-3.5 w-1 rounded-full bg-red-600" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
    </div>
  );
}

// Two-column detail grid row
function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`mt-0.5 text-xs ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>{value || "—"}</span>
    </div>
  );
}

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
          const vid =
            b.data.vehicleId || b.data.vehicle?.id ||
            b.data.lineItems?.find((li: { vehicleId?: string; vehicle?: { id?: string } }) => li.vehicleId || li.vehicle?.id)?.vehicleId ||
            b.data.lineItems?.find((li: { vehicle?: { id?: string } }) => li.vehicle?.id)?.vehicle?.id;
          if (vid) {
            fetch(`/api/vehicles/${vid}/expenses`)
              .then((r) => r.json())
              .then((eb) => { if (eb.data) setExpenses(eb.data); })
              .catch(() => {});
          }
        } else { setError(b.error || "Not found"); }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        <p className="text-sm font-medium text-gray-500">Loading invoice…</p>
      </div>
    </div>
  );

  if (error || !invoice) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-lg font-semibold text-red-600">Error</p>
        <p className="mt-1 text-sm text-gray-500">{error || "Invoice not found."}</p>
        <Link href="/invoices" className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Back to Invoices</Link>
      </div>
    </div>
  );

  const balance = Math.max(invoice.totalAmount - (invoice.paidAmount || 0), 0);
  const driverName = invoice.driver?.name || invoice.tripSheet?.driver?.name;
  const primaryVehicle = invoice.vehicle ?? invoice.lineItems?.find((li) => li.vehicle)?.vehicle ?? null;
  const hasLineItems = !!(invoice.lineItems && invoice.lineItems.length > 0);
  const showSubtotal = invoice.subtotal !== invoice.totalAmount;
  const invoiceExpenses = expenses.filter((e) =>
    e.note?.includes(invoice.invoiceNumber)
  );

  const groupedExpenses = invoiceExpenses.reduce((acc, e) => {
    const cat = e.category.toLowerCase().trim();
    if (!acc[cat]) {
      let label = e.category;
      if (cat === "fasttag") label = "FASTag";
      else if (cat === "diesel") label = "Diesel";
      else if (cat === "police") label = "Police";
      else label = e.category.charAt(0).toUpperCase() + e.category.slice(1);

      acc[cat] = {
        category: e.category,
        amount: 0,
        label,
      };
    }
    acc[cat].amount += e.amount;
    return acc;
  }, {} as Record<string, { category: string; amount: number; label: string }>);

  const expensesList = Object.values(groupedExpenses).filter((e) => e.amount > 0);
  const totalExpensesAmount = expensesList.reduce((s, e) => s + e.amount, 0);

  const statusStyles: Record<string, string> = {
    paid: "bg-green-100 text-green-800 border-green-200",
    sent: "bg-blue-100 text-blue-800 border-blue-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">

      {/* ── Print toolbar ── */}
      <div className="mx-auto mb-6 max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">Invoice {invoice.invoiceNumber}</p>
            <p className="text-xs text-gray-400">Ready to print or save as PDF</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
              🖨️ Print / Download PDF
            </button>
            <Link href="/invoices" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              ✕ Close
            </Link>
          </div>
        </div>
      </div>

      {/* ── Invoice Sheet ── */}
      <div className="mx-auto max-w-4xl bg-white shadow-sm print:shadow-none print:max-w-full">
        {/* Top red bar */}
        <div className="h-2 bg-red-600 print:bg-red-600" />

        <div className="p-8 print:p-7">

          {/* ══ HEADER ══ */}
          <div className="flex items-start justify-between gap-6">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" onError={(e) => { const i = e.currentTarget; if (!i.src.endsWith("/logo.svg")) i.src = "/logo.svg"; }}
                alt="Hi Wood Transporting" className="h-16 w-auto max-w-[200px] object-contain object-left" />
              <p className="mt-1.5 text-xs text-gray-500">Transportation &amp; Logistics Services · Kerala, India</p>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase">Invoice</h1>
              <div className="mt-2 space-y-0.5 text-sm">
                <p><span className="text-gray-500">No: </span><span className="font-bold text-gray-900">{invoice.invoiceNumber}</span></p>
                <p><span className="text-gray-500">Date: </span><span className="font-semibold text-gray-700">{fmtDate(invoice.invoiceDate)}</span></p>
              </div>
              <span className={`mt-2 inline-block rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[invoice.status] ?? statusStyles.draft}`}>
                {invoice.status}
              </span>
            </div>
          </div>

          <div className="my-5 border-t-2 border-gray-100" />

          {/* ══ BILL TO + BOOKING ══ */}
          {(invoice.customer || invoice.tripSheet?.booking) && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {invoice.customer && (
                  <div>
                    <SectionHead title="Bill To" />
                    <p className="text-base font-bold text-gray-900">{invoice.customer.name}</p>
                    {invoice.customer.address && <p className="mt-1 text-xs text-gray-500 whitespace-pre-line">{invoice.customer.address}</p>}
                    {invoice.customer.phone && <p className="mt-0.5 text-xs text-gray-500">📞 {invoice.customer.phone}</p>}
                    {invoice.customer.gstNumber && <p className="mt-0.5 text-xs text-gray-500">GSTIN: <span className="font-semibold">{invoice.customer.gstNumber}</span></p>}
                  </div>
                )}
                {invoice.tripSheet?.booking && (
                  <div>
                    <SectionHead title="Booking Details" />
                    <p className="text-sm font-bold text-gray-900">{invoice.tripSheet.booking.pickupLocation} ➔ {invoice.tripSheet.booking.dropLocation}</p>
                    <p className="mt-1 text-xs text-gray-500">Period: {fmtDate(invoice.tripSheet.booking.pickupDate)} — {fmtDate(invoice.tripSheet.booking.dropDate)}</p>
                    <p className="text-xs text-gray-500">Rate/Day: <span className="font-semibold">{fmt(invoice.tripSheet.booking.ratePerDay)}</span></p>
                  </div>
                )}
              </div>
              <div className="my-5 border-t border-gray-100" />
            </>
          )}

          {/* ══ SERVICE + VEHICLE DETAILS ══ */}
          {(primaryVehicle || driverName || invoice.tripSheet) && (
            <>
              {/* Driver / Trip period row */}
              {(driverName || invoice.tripSheet) && (
                <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {driverName && <DetailRow label="Driver" value={driverName} bold />}
                  {invoice.tripSheet && <>
                    <DetailRow label="Trip Start" value={fmtDate(invoice.tripSheet.startDate)} />
                    <DetailRow label="Trip End" value={fmtDate(invoice.tripSheet.endDate)} />
                    {invoice.tripSheet.distance > 0 && <DetailRow label="Distance" value={`${invoice.tripSheet.distance.toLocaleString("en-IN")} km`} />}
                  </>}
                </div>
              )}

              {/* Vehicle details card */}
              {primaryVehicle?.registrationNumber && (
                <>
                  <SectionHead title="Vehicle Details" />
                  <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
                    {/* Vehicle header strip */}
                    <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white tracking-tight">{primaryVehicle.registrationNumber}</span>
                        {primaryVehicle.type && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">{primaryVehicle.type}</span>}
                        {primaryVehicle.make && <span className="text-xs text-gray-300">{[primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(" ")}</span>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${primaryVehicle.isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
                        {primaryVehicle.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                      {[
                        { label: "Capacity", value: primaryVehicle.capacityTons ? `${primaryVehicle.capacityTons} T` : "" },
                        { label: "Vehicle Class", value: primaryVehicle.vehicleClass || "" },
                        { label: "Ownership", value: primaryVehicle.ownership || "" },
                        { label: "Owner Name", value: primaryVehicle.ownerName || "" },
                        { label: "Area / Region", value: primaryVehicle.area || "" },
                        { label: "Registering Auth.", value: primaryVehicle.registeringAuthority || "" },
                        { label: "Emission Norm", value: primaryVehicle.emissionNorm || "" },
                        { label: "RC Status", value: primaryVehicle.vehicleStatus || "" },
                        { label: "Hypothecated", value: primaryVehicle.hypothecated ? "Yes" : "No" },
                        { label: "Reg. Date", value: fmtDate(primaryVehicle.registrationDate) },
                        { label: "Insurance Expiry", value: fmtDate(primaryVehicle.insuranceExpiry) },
                        { label: "Fitness Expiry", value: fmtDate(primaryVehicle.fitnessExpiry) },
                        { label: "Tax Valid Upto", value: fmtDate(primaryVehicle.taxValidUpto) },
                        { label: "Permit Valid Upto", value: fmtDate(primaryVehicle.permitValidUpto) },
                        { label: "PUCC Valid Upto", value: fmtDate(primaryVehicle.puccValidUpto) },
                      ].map((item) => (
                        <div key={item.label} className="bg-white px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-gray-800">{item.value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="my-5 border-t border-gray-100" />
            </>
          )}

          {/* ══ ITEMS TABLE ══ */}
          <SectionHead title={hasLineItems ? "Items" : "Charges"} />
          {hasLineItems ? (
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[28%]"/><col className="w-[14%]"/><col className="w-[18%]"/><col className="w-[10%]"/><col className="w-[14%]"/><col className="w-[16%]"/></colgroup>
              <thead>
                <tr className="border-b-2 border-gray-900 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <th className="pb-2 text-left">Description</th>
                  <th className="pb-2 text-left">Vehicle</th>
                  <th className="pb-2 text-right">KM Start → End</th>
                  <th className="pb-2 text-right">Ton/Day</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems!.map((li, idx) => (
                  <tr key={idx} className="border-b border-gray-100 align-top">
                    <td className="py-2.5 pr-2 font-medium text-gray-800 break-words">{li.description || "—"}</td>
                    <td className="py-2.5 pr-2 break-words">
                      {li.vehicle?.registrationNumber ? (
                        <><span className="font-bold text-gray-800">{li.vehicle.registrationNumber}</span>
                        {li.vehicle.make && <span className="block text-[10px] text-gray-400">{[li.vehicle.make, li.vehicle.model].filter(Boolean).join(" ")}</span>}</>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-gray-700 text-xs">
                      {li.startKm || li.endKm ? <>{li.startKm.toLocaleString("en-IN")} → {li.endKm.toLocaleString("en-IN")}{li.km > 0 && <span className="block text-[10px] text-gray-400">{li.km.toLocaleString("en-IN")} km</span>}</> : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-gray-700">{li.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-gray-700">{fmt(li.rate)}</td>
                    <td className="py-2.5 text-right font-bold text-gray-900">{fmt(li.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <th className="pb-2 text-left">Description</th><th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.tripSheet ? (
                  <>
                    <tr className="border-b border-gray-100"><td className="py-2.5 font-medium text-gray-800">Logistics &amp; Transportation</td><td className="py-2.5 text-right font-bold text-gray-900">{fmt(invoice.subtotal)}</td></tr>
                    {invoice.tripSheet.dieselCost > 0 && <tr className="border-b border-gray-100"><td className="py-2.5 text-gray-500">Fuel / Diesel</td><td className="py-2.5 text-right text-gray-600">{fmt(invoice.tripSheet.dieselCost)}</td></tr>}
                    {invoice.tripSheet.toll > 0 && <tr className="border-b border-gray-100"><td className="py-2.5 text-gray-500">Toll Charges</td><td className="py-2.5 text-right text-gray-600">{fmt(invoice.tripSheet.toll)}</td></tr>}
                    {invoice.tripSheet.otherExpenses > 0 && <tr className="border-b border-gray-100"><td className="py-2.5 text-gray-500">Other Expenses</td><td className="py-2.5 text-right text-gray-600">{fmt(invoice.tripSheet.otherExpenses)}</td></tr>}
                  </>
                ) : (
                  <tr className="border-b border-gray-100"><td className="py-2.5 font-medium text-gray-800">Transportation Charge</td><td className="py-2.5 text-right font-bold text-gray-900">{fmt(invoice.subtotal)}</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* ══ VEHICLE EXPENSES ══ */}
          {expensesList.length > 0 && (
            <>
              <div className="my-5 border-t border-gray-100" />
              <SectionHead title="Vehicle Expenses" />
              <div className="grid grid-cols-3 gap-3 mb-2">
                {expensesList.map((exp) => (
                  <div key={exp.category} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'10px 12px'}}>
                    <p style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#9ca3af',margin:0}}>{exp.label}</p>
                    <p style={{fontSize:'14px',fontWeight:800,color:'#111827',margin:'2px 0 0'}}>{fmt(exp.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <div className="rounded-lg bg-gray-100 px-4 py-2 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total Vehicle Expenses</p>
                  <p className="text-base font-extrabold text-gray-900">{fmt(totalExpensesAmount)}</p>
                </div>
              </div>
            </>
          )}

          {/* ══ TOTALS ══ */}
          <div className="my-5 border-t-2 border-gray-900" />
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              {showSubtotal && (
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span className="font-mono">{fmt(invoice.subtotal)}</span>
                </div>
              )}
              {invoice.gstAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>GST ({invoice.gstPercentage}%)</span><span className="font-mono">{fmt(invoice.gstAmount)}</span>
                </div>
              )}
              {totalExpensesAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Vehicle Expenses Deducted</span><span className="font-mono text-red-600">-{fmt(totalExpensesAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-900">
                <span>Total</span><span className="font-mono">{fmt(invoice.totalAmount)}</span>
              </div>
              {(invoice.paidAmount || 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span className="font-medium">Paid</span><span className="font-mono font-bold">{fmt(invoice.paidAmount)}</span>
                </div>
              )}
              <div className={`flex justify-between border-t-2 pt-2 text-base font-extrabold ${balance <= 0 ? "border-gray-200 text-gray-400" : "border-red-200 text-red-700"}`}>
                <span>Balance Due</span><span className="font-mono">{fmt(balance)}</span>
              </div>
            </div>
          </div>

          {/* ══ SIGNATURE BOXES ══ */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-8">Customer Signature</p>
              <div className="border-t border-gray-300 pt-2">
                <p className="text-[9px] text-gray-400">Name &amp; Signature</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-8">Authorized Signatory</p>
              <div className="border-t border-gray-300 pt-2">
                <p className="text-[9px] text-gray-400">Hi Wood Transporting</p>
              </div>
            </div>
          </div>

          {/* ══ NOTES ══ */}
          {invoice.notes && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3.5">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* ══ FOOTER ══ */}
          <div className="mt-8 border-t border-gray-200 pt-6 text-xs text-gray-400">
            <p className="mb-1.5 font-bold text-gray-500">Terms &amp; Conditions</p>
            <p>1. Please pay within 15 days of invoice date.</p>
            <p>2. Interest of 18% p.a. will be charged for delayed payments.</p>
          </div>

        </div>
        {/* Bottom strip */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
      </div>
    </div>
  );
}
