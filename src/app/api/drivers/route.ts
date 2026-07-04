import { driverResource } from "@/lib/resources";
import { listHandler, createHandler } from "@/lib/crud";

export const GET = listHandler(driverResource);
export const POST = createHandler(driverResource);
