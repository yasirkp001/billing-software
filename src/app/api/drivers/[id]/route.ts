import { driverResource } from "@/lib/resources";
import { getOneHandler, updateHandler, deleteHandler } from "@/lib/crud";

export const GET = getOneHandler(driverResource);
export const PUT = updateHandler(driverResource);
export const DELETE = deleteHandler(driverResource);
