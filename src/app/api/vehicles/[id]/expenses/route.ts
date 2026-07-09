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
    const paid = Number(body.paid) || 0;
    
    // Allow entry with either amount or paid (or both)
    if ((!Number.isFinite(amount) || amount < 0) && paid <= 0) {
      return fail("Enter a valid amount or paid value.");
    }
    if (!Number.isFinite(amount) || amount < 0) {
      // If amount is invalid but paid is valid, set amount to 0
      body.amount = 0;
    }

    const category = String(body.category ?? "other").trim() || "other";
    const d = body.date ? new Date(body.date) : new Date();

    const row = await prisma.vehicleExpense.create({
      data: {
        vehicleId: id,
        amount: Number(body.amount) || 0,
        category,
        date: Number.isNaN(d.getTime()) ? new Date() : d,
        note: String(body.note ?? "").trim(),
        liter: Number(body.liter) || 0,
        pricePerLiter: Number(body.pricePerLiter) || 0,
        paid: Number(body.paid) || 0,
        adblue: Number(body.adblue) || 0,
      },
    });
    return ok(row, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
