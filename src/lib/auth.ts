import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  TOKEN_TTL_SECONDS,
  verifyToken,
  type SessionUser,
} from "@/lib/jwt";

export { signToken, verifyToken, AUTH_COOKIE } from "@/lib/jwt";
export type { SessionUser } from "@/lib/jwt";

/** Read the current session from the auth cookie (server components / route handlers). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Set the auth cookie as HTTP-only. */
export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}
