import { vehicleResource } from "@/lib/resources";
import { getOneHandler, updateHandler, deleteHandler } from "@/lib/crud";

export const GET = getOneHandler(vehicleResource);
export const PUT = updateHandler(vehicleResource);
export const DELETE = deleteHandler(vehicleResource);
