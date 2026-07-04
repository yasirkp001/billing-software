import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";
import { round2 } from "@/lib/invoices";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Delete a payment. If it was applied to an invoice, reverse it: reduce the
 * invoice's paidAmount and recompute its status so the ledger stays correct.
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return fail("Payment not found.", 404);

    const inv = payment.invoiceId
      ? await prisma.invoice.findUnique({ where: { id: payment.invoiceId } })
      : null;

    if (inv) {
      const paidAmount = Math.max(round2(inv.paidAmount - payment.amount), 0);
      const fullyPaid = inv.totalAmount > 0 && paidAmount >= inv.totalAmount;
      const status = fullyPaid ? "paid" : inv.status === "paid" ? "sent" : inv.status;
      await prisma.$transaction([
        prisma.payment.delete({ where: { id } }),
        prisma.invoice.update({ where: { id: inv.id }, data: { paidAmount, status } }),
      ]);
    } else {
      await prisma.payment.delete({ where: { id } });
    }

    return ok({ success: true });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") return fail("Not found.", 404);
    return handleError(err);
  }
}
