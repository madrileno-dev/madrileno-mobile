import { z } from "zod";

export const clientFlagsDtoSchema = z.object({
        "flags": z.record(z.string(), z.object({}))});
export type ClientFlagsDto = z.infer<typeof clientFlagsDtoSchema>;
