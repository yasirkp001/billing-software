import { getOneHandler, updateHandler, deleteHandler } from "@/lib/crud";
import { bookingResource } from "@/lib/resources";

export const GET = getOneHandler(bookingResource);
export const PUT = updateHandler(bookingResource);
export const DELETE = deleteHandler(bookingResource);
