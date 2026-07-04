import { prisma } from "@/lib/db";
import { ok, fail, handleError, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Workflow step 1 — turn a booking into a trip sheet.
 * Pre-fills the trip sheet from the booking (driver + dates) and advances the
 * booking to "in-progress". Returns the created trip sheet.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await ctx.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return fail("Booking not found.", 404);
    if (booking.status === "cancelled") return fail("This booking is cancelled.");

    const [tripSheet] = await prisma.$transaction([
      prisma.tripSheet.create({
        data: {
          bookingId: booking.id,
          driverId: booking.driverId,
          startDate: booking.pickupDate,
          endDate: booking.dropDate,
          distance: 0,
          dieselUsed: 0,
          dieselCost: 0,
          toll: 0,
          otherExpenses: 0,
          remarks: "",
          status: "pending",
        },
      }),
      prisma.booking.update({ where: { id }, data: { status: "in-progress" } }),
    ]);

    return ok(tripSheet, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
