import { z } from "zod";

export const depCheckSchema = z.object({
        "error": z.string().nullish(),
        "latencyMs": z.number().int().nullish(),
        "status": z.enum(["Down","Up"])});
export type DepCheck = z.infer<typeof depCheckSchema>;

export const adminHealthCheckDtoSchema = z.object({
        "postgres": depCheckSchema,
        "smtp": depCheckSchema,
        "status": z.enum(["Down","Up"])});
export type AdminHealthCheckDto = z.infer<typeof adminHealthCheckDtoSchema>;
