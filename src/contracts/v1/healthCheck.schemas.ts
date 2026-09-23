import { z } from "zod";

export const healthCheckDtoSchema = z.object({
        "apiVersion": z.string(),
        "environment": z.enum(["Dev","Prod","Staging","Test"]),
        "name": z.string(),
        "version": z.string()});
export type HealthCheckDto = z.infer<typeof healthCheckDtoSchema>;
