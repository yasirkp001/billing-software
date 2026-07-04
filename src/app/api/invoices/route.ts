import { prisma } from "@/lib/db";
import { ok, handleError, requireAuth } from "@/lib/api";
import { listHandler } from "@/lib/crud";
import { invoiceResource } from "@/lib/resources";
import { buildInvoiceData } from "@/lib/invoices";

// List stays generic (search + includes via the resource config).
export const GET = listHandler(invoiceResource);

// Create is invoice-specific: server-computed totals + nested line items.
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { data, lineItems } = buildInvoiceData(body);
    const row = await prisma.invoice.create({
      data: { ...data, lineItems: { create: lineItems } },
      include: { lineItems: { include: { vehicle: true } }, customer: true, vehicle: true, driver: true },
    });
    return ok(row, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
