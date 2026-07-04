import { listHandler } from "@/lib/crud";
import { paymentResource } from "@/lib/resources";

export const GET = listHandler(paymentResource);
