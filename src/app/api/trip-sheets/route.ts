import { listHandler, createHandler } from "@/lib/crud";
import { tripSheetResource } from "@/lib/resources";

export const GET = listHandler(tripSheetResource);
export const POST = createHandler(tripSheetResource);
