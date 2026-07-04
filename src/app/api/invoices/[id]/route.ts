import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";
import { getOneHandler, deleteHandler } from "@/lib/crud";
import { invoiceResource } from "@/lib/resources";
import { buildInvoiceData } from "@/lib/invoices";

type Ctx = { params: Promise<{ id: string }> };

// Read + delete stay generic (line items cascade-delete via the schema).
export const GET = getOneHandler(invoiceResource);
export const DELETE = deleteHandler(invoiceResource);

// Update rewrites line items and recomputes totals server-side.
export async function PUT(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { data, lineItems } = buildInvoiceData(body);
    const row = await prisma.invoice.update({
      where: { id },
      data: { ...data, lineItems: { deleteMany: {}, create: lineItems } },
      include: { lineItems: { include: { vehicle: true } }, customer: true, vehicle: true, driver: true },
    });
    return ok(row);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") return fail("Not found.", 404);
    return handleError(err);
  }
}
