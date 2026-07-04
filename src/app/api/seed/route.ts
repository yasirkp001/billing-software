import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/api";

/**
 * One-time setup endpoint: creates the default admin account using the
 * SEED_ADMIN_* environment variables, but only if no users exist yet.
 * Visit /api/seed once after configuring the database.
 */
export async function GET() {
  try {
    const existing = await prisma.user.count();
    if (existing > 0) {
      return NextResponse.json({
        data: { created: false, message: "Users already exist. Skipped." },
      });
    }

    const email = (process.env.SEED_ADMIN_EMAIL || "admin@hiwood.com").toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const name = process.env.SEED_ADMIN_NAME || "Hi Wood Admin";

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, passwordHash, role: "admin" },
    });

    return NextResponse.json({
      data: {
        created: true,
        message: `Admin created. Login with ${email}`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
