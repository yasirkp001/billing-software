import { vehicleResource } from "@/lib/resources";
import { listHandler, createHandler } from "@/lib/crud";

export const GET = listHandler(vehicleResource);
export const POST = createHandler(vehicleResource);
