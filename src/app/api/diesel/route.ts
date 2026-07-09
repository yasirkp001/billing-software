import { prisma } from "@/lib/db";
import { ok, handleError, requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List all diesel expense and payment entries */
export async function GET() {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  try {
    const rows = await prisma.vehicleExpense.findMany({
      where: { 
        category: "diesel"
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
