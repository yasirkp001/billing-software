// Invoice-specific business logic: line-item normalization, GST/total
// computation and status derivation. Shared by the create/update/payment
// API routes so totals are always server-authoritative (never trusted from
// the client).

import type { Prisma } from "@prisma/client";

const OBJECT_ID = /^[a-f\d]{24}$/i;
const RELATION_KEYS = ["customerId", "vehicleId", "driverId", "tripSheetId"] as const;
const ALLOWED_STATUS = ["draft", "sent", "paid", "overdue"];
const LINE_STATUS = ["pending", "running", "completed"];

const objId = (v: unknown) => (typeof v === "string" && OBJECT_ID.test(v) ? v : null);

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type LineItem = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  vehicleId: string | null;
  startKm: number;
  endKm: number;
  km: number;
  status: string;
};

/** Coerce raw client line items, dropping empty rows. Each row carries an
 *  optional vehicle, its KM reading and a per-vehicle trip status. */
export function normalizeLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((li) => {
      const o = (li ?? {}) as Record<string, unknown>;
      const quantity = num(o.quantity);
      const rate = num(o.rate);
      const startKm = num(o.startKm);
      const endKm = num(o.endKm);
      // Distance = end − start when both readings are present; otherwise fall
      // back to a directly-supplied `km` (e.g. trip-sheet conversions).
      const km = endKm > startKm ? round2(endKm - startKm) : num(o.km);
      const status = String(o.status ?? "");
      return {
        description: String(o.description ?? "").trim(),
        quantity,
        rate,
        amount: round2(quantity * rate),
        vehicleId: objId(o.vehicleId),
        startKm,
        endKm,
        km,
        status: LINE_STATUS.includes(status) ? status : "pending",
      };
    })
    .filter(
      (li) =>
        li.description !== "" ||
        li.amount !== 0 ||
        li.km !== 0 ||
        li.startKm !== 0 ||
        li.endKm !== 0 ||
        li.vehicleId
    );
}

/** Subtotal/GST/total. Subtotal comes from line items when present, else the
 *  flat `subtotal` field (kept for invoices created without itemization). */
export function computeTotals(
  lineItems: LineItem[],
  gstPercentage: unknown,
  fallbackSubtotal: unknown,
  totalExpenses: number = 0
) {
  const subtotal = lineItems.length
    ? round2(lineItems.reduce((s, li) => s + li.amount, 0))
    : round2(num(fallbackSubtotal));
  const gstPercent = num(gstPercentage);
  const gstAmount = round2((subtotal * gstPercent) / 100);
  const totalAmount = round2(Math.max(subtotal + gstAmount - totalExpenses, 0));
  return { subtotal, gstPercent, gstAmount, totalAmount };
}

/** A fully-paid invoice is always "paid"; otherwise respect the requested
 *  status but never let it claim "paid" while a balance remains. */
export function deriveStatus(
  requested: string,
  paidAmount: number,
  totalAmount: number
): string {
  if (totalAmount > 0 && paidAmount >= totalAmount) return "paid";
  const status = ALLOWED_STATUS.includes(requested) ? requested : "draft";
  return status === "paid" ? "sent" : status;
}

/** Build the Prisma scalar `data` for an invoice plus its normalized line
 *  items. Totals are recomputed here, ignoring any client-sent values. */
export function buildInvoiceData(body: Record<string, unknown>) {
  const lineItems = normalizeLineItems(body.lineItems);

  const diesel = num(body.dieselAmount);
  const fasttag = num(body.fastagAmount);
  const police = num(body.policeAmount);
  const custom = Array.isArray(body.customExpenses)
    ? body.customExpenses.reduce((sum, ce: any) => sum + num(ce?.amount), 0)
    : 0;
  const totalExpenses = diesel + fasttag + police + custom;

  const { gstPercent, subtotal, gstAmount, totalAmount } = computeTotals(
    lineItems,
    body.gstPercentage,
    body.subtotal,
    totalExpenses
  );
  const paidAmount = round2(num(body.paidAmount));
  const status = deriveStatus(String(body.status ?? ""), paidAmount, totalAmount);

  const d = body.invoiceDate ? new Date(body.invoiceDate as string) : null;

  // Optional ObjectId relations — keep only valid 24-hex ids, else null.
  const relId = (key: (typeof RELATION_KEYS)[number]) => {
    const v = body[key];
    return typeof v === "string" && OBJECT_ID.test(v) ? v : null;
  };

  const data: Prisma.InvoiceUncheckedCreateInput = {
    invoiceNumber: String(body.invoiceNumber ?? "").trim(),
    invoiceDate: d && !Number.isNaN(d.getTime()) ? d : new Date(),
    gstPercentage: gstPercent,
    subtotal,
    gstAmount,
    totalAmount,
    paidAmount,
    status,
    notes: String(body.notes ?? "").trim(),
    customerId: relId("customerId"),
    vehicleId: relId("vehicleId"),
    driverId: relId("driverId"),
    tripSheetId: relId("tripSheetId"),
  };

  return { data, lineItems };
}
