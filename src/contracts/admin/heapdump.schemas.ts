import { z } from "zod";

export const heapdumpResultDtoSchema = z.object({
        "liveOnly": z.boolean(),
        "path": z.string(),
        "sizeBytes": z.number().int(),
        "tookMillis": z.number().int()});
export type HeapdumpResultDto = z.infer<typeof heapdumpResultDtoSchema>;
