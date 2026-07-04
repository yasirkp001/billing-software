import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";

/** Change the signed-in user's own password after verifying the current one. */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return fail("Current and new passwords are required.");
    }
    if (newPassword.length < 6) {
      return fail("New password must be at least 6 characters.");
    }

    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return fail("Account not found.", 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return fail("Current password is incorrect.", 400);

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return fail("New password must be different from the current one.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return ok({ updated: true });
  } catch (err) {
    return handleError(err);
  }
}
