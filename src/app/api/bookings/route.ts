import { listHandler, createHandler } from "@/lib/crud";
import { bookingResource } from "@/lib/resources";

export const GET = listHandler(bookingResource);
export const POST = createHandler(bookingResource);
