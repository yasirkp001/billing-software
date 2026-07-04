import { customerResource } from "@/lib/resources";
import { listHandler, createHandler } from "@/lib/crud";

export const GET = listHandler(customerResource);
export const POST = createHandler(customerResource);
