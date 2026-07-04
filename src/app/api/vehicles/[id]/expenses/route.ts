import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const CATEGORIES = ["liability", "maintenance", "insurance", "fuel", "tax", "other"];

/** List all expense entries for a vehicle, newest first. */
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const rows = await prisma.vehicleExpense.findMany({
      where: { vehicleId: id },
      orderBy: { date: "desc" },
    });
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

/** Add an expense entry to a vehicle. */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return fail("Vehicle not found.", 404);

    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a valid amount.");

    const category = String(body.category ?? "other").trim() || "other";
    const d = body.date ? new Date(body.date) : new Date();

    const row = await prisma.vehicleExpense.create({
      data: {
        vehicleId: id,
        amount,
        category,
        date: Number.isNaN(d.getTime()) ? new Date() : d,
        note: String(body.note ?? "").trim(),
      },
    });
    return ok(row, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
