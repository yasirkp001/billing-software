import { customerResource } from "@/lib/resources";
import { getOneHandler, updateHandler, deleteHandler } from "@/lib/crud";

export const GET = getOneHandler(customerResource);
export const PUT = updateHandler(customerResource);
export const DELETE = deleteHandler(customerResource);
