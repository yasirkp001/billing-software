import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; expenseId: string }> };

/** Delete a single expense entry from a vehicle. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { expenseId } = await ctx.params;
    await prisma.vehicleExpense.delete({ where: { id: expenseId } });
    return ok({ success: true });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2025") {
      return fail("Expense not found.", 404);
    }
    return handleError(err);
  }
}
