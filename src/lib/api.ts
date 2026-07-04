import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Ensure there is a valid session. Returns the user, or a NextResponse 401
 * that the caller should return immediately.
 */
export async function requireAuth(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getSession();
  if (!user) {
    return { response: fail("Unauthorized", 401) };
  }
  return { user };
}

/**
 * Like requireAuth, but additionally requires the user to be an admin.
 * Returns the user, or a 401/403 NextResponse the caller should return.
 */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getSession();
  if (!user) return { response: fail("Unauthorized", 401) };
  if (user.role !== "admin") return { response: fail("Admin access required.", 403) };
  return { user };
}

/** Convert thrown errors (including Prisma known errors) into a response. */
export function handleError(err: unknown) {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string };
    // Prisma: unique constraint failed
    if (e.code === "P2002") {
      return fail("A record with that value already exists.", 409);
    }
    // Prisma: record not found
    if (e.code === "P2025") {
      return fail("Not found.", 404);
    }
  }
  console.error(err);
  return fail("Something went wrong.", 500);
}
