import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAdmin } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Remove a team member (admin only). Guards against self-deletion and
 *  deleting the last remaining admin. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;

    if (id === auth.user.id) {
      return fail("You cannot remove your own account.", 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("Not found.", 404);

    if (target.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return fail("Cannot remove the last admin account.", 400);
      }
    }

    await prisma.user.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
