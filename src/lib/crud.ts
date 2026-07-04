import { ok, fail, handleError, requireAuth } from "@/lib/api";

/**
 * Generic REST handlers shared by all resource endpoints, backed by Prisma.
 * Each resource provides its Prisma delegate plus a field spec used to
 * whitelist + coerce incoming data (Prisma does not cast strings like Mongoose).
 */

export interface FieldSpec {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  transform?: "upper" | "lower";
}

/**
 * Minimal shape of a Prisma model delegate (prisma.customer, etc).
 * Methods use `any` so the concrete, heavily-generic Prisma delegates remain
 * structurally assignable to this interface.
 */
export interface Delegate {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  findMany(args?: any): Promise<any[]>;
  create(args: { data: any }): Promise<any>;
  findUnique(args: { where: { id: string } }): Promise<any | null>;
  update(args: { where: { id: string }; data: any }): Promise<any>;
  delete(args: { where: { id: string } }): Promise<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export interface Resource {
  model: Delegate;
  fields: FieldSpec[];
  searchFields?: string[];
  include?: any;
}

/** Whitelist + coerce a request body to the resource's known fields. */
function coerce(body: Record<string, unknown>, fields: FieldSpec[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!(f.name in body)) continue;
    const raw = body[f.name];

    if (f.type === "number") {
      const n = raw === "" || raw == null ? 0 : Number(raw);
      out[f.name] = Number.isNaN(n) ? 0 : n;
    } else if (f.type === "boolean") {
      out[f.name] = Boolean(raw);
    } else if (f.type === "date") {
      if (!raw) {
        out[f.name] = null;
      } else {
        const d = new Date(raw as string);
        out[f.name] = Number.isNaN(d.getTime()) ? null : d;
      }
    } else {
      let s = raw == null ? "" : String(raw).trim();
      if (f.transform === "upper") s = s.toUpperCase();
      if (f.transform === "lower") s = s.toLowerCase();
      out[f.name] = s;
    }
  }
  return out;
}

// Prisma "record not found" during update/delete.
function isNotFound(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { code?: string }).code === "P2025"
  );
}

export function listHandler(res: Resource) {
  return async (req: Request) => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;
    try {
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q")?.trim();

      let where = undefined;
      if (q) {
        const orConditions: any[] = [];
        if (/^[0-9a-fA-F]{24}$/.test(q)) {
          orConditions.push({ id: q });
        }
        if (res.searchFields && res.searchFields.length > 0) {
          res.searchFields.forEach((f) => {
            if (f !== "id") {
              orConditions.push({ [f]: { contains: q } });
            }
          });
        }
        if (orConditions.length > 0) {
          where = { OR: orConditions };
        }
      }


      const rows = await res.model.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(res.include ? { include: res.include } : {}),
      });
      return ok(rows);
    } catch (err) {
      return handleError(err);
    }
  };
}

export function createHandler(res: Resource) {
  return async (req: Request) => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;
    try {
      const body = await req.json();
      const data = coerce(body, res.fields);
      const row = await res.model.create({ data });
      return ok(row, { status: 201 });
    } catch (err) {
      return handleError(err);
    }
  };
}

type Ctx = { params: Promise<{ id: string }> };

export function getOneHandler(res: Resource) {
  return async (_req: Request, ctx: Ctx) => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;
    try {
      const { id } = await ctx.params;
      const row = await res.model.findUnique({
        where: { id },
        ...(res.include ? { include: res.include } : {}),
      });
      if (!row) return fail("Not found.", 404);
      return ok(row);
    } catch (err) {
      return handleError(err);
    }
  };
}

export function updateHandler(res: Resource) {
  return async (req: Request, ctx: Ctx) => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;
    try {
      const { id } = await ctx.params;
      const body = await req.json();
      const data = coerce(body, res.fields);
      const row = await res.model.update({ where: { id }, data });
      return ok(row);
    } catch (err) {
      if (isNotFound(err)) return fail("Not found.", 404);
      return handleError(err);
    }
  };
}

export function deleteHandler(res: Resource) {
  return async (_req: Request, ctx: Ctx) => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;
    try {
      const { id } = await ctx.params;
      await res.model.delete({ where: { id } });
      return ok({ success: true });
    } catch (err) {
      if (isNotFound(err)) return fail("Not found.", 404);
      return handleError(err);
    }
  };
}
