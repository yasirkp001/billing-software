import { getOneHandler, updateHandler, deleteHandler } from "@/lib/crud";
import { tripSheetResource } from "@/lib/resources";

export const GET = getOneHandler(tripSheetResource);
export const PUT = updateHandler(tripSheetResource);
export const DELETE = deleteHandler(tripSheetResource);
