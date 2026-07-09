import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";

/** List all general diesel payment entries */
export async function GET() {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    // For now, we'll store general payments with a special note marker
    // Later can create a separate table if needed
    const rows = await prisma.vehicleExpense.findMany({
      where: { 
        category: "diesel",
        note: { contains: "[GENERAL]" }
      },
      orderBy: { date: "desc" },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            type: true,
          }
        }
      }
    });
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

/** Add a general diesel payment entry (not tied to specific vehicle) */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const amount = Number(body.amount) || 0;
    const paid = Number(body.paid) || 0;
    
    // Allow entry with either amount or paid (or both)
    if (amount <= 0 && paid <= 0) {
      return fail("Enter a valid amount or paid value.");
    }

    // Get any vehicle to attach (required by schema, but marked as general)
    const anyVehicle = await prisma.vehicle.findFirst();
    if (!anyVehicle) {
      return fail("No vehicles available. Please add a vehicle first.");
    }

    const d = body.date ? new Date(body.date) : new Date();
    const note = `[GENERAL]${body.note ? ` ${body.note}` : ''}`;

    const row = await prisma.vehicleExpense.create({
      data: {
        vehicleId: anyVehicle.id,
        amount,
        category: "diesel",
        date: Number.isNaN(d.getTime()) ? new Date() : d,
        note,
        liter: 0,
        pricePerLiter: 0,
        paid,
        adblue: Number(body.adblue) || 0,
      },
    });
    return ok(row, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
