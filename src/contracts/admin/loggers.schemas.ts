import { z } from "zod";

export const loggerLevelDtoSchema = z.object({
        "configuredLevel": z.string().nullish(),
        "effectiveLevel": z.string(),
        "name": z.string()});
export type LoggerLevelDto = z.infer<typeof loggerLevelDtoSchema>;

export const setLoggerLevelRequestSchema = z.object({
        "level": z.string().nullish()});
export type SetLoggerLevelRequest = z.infer<typeof setLoggerLevelRequestSchema>;
