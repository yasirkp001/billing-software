import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAdmin } from "@/lib/api";

const ROLES = ["admin", "staff"] as const;

/** List all team members (admin only). Never returns password hashes. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return ok(users);
  } catch (err) {
    return handleError(err);
  }
}

/** Create a new team member (admin only). */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const role = ROLES.includes(body.role) ? body.role : "staff";

    if (!name || !email || !password) {
      return fail("Name, email and password are required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Enter a valid email address.");
    }
    if (password.length < 6) {
      return fail("Password must be at least 6 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return ok(user, { status: 201 });
  } catch (err) {
    return handleError(err); // P2002 → "A record with that value already exists."
  }
}
