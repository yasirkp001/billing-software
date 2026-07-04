import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { fail, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return fail("Email and password are required.");
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });
    if (!user) return fail("Invalid email or password.", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return fail("Invalid email or password.", 401);

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "staff",
    });
    await setAuthCookie(token);

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
