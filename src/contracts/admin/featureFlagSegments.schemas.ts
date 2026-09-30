import { z } from "zod";

export const createSegmentRequestSchema = z.object({
        "conditions": z.array(z.object({})),
        "description": z.string(),
        "name": z.string()});
export type CreateSegmentRequest = z.infer<typeof createSegmentRequestSchema>;

export const segmentDtoSchema = z.object({
        "conditions": z.array(z.object({})),
        "createdAt": z.iso.datetime({ offset: true }),
        "description": z.string(),
        "id": z.uuid(),
        "name": z.string(),
        "updatedAt": z.iso.datetime({ offset: true })});
export type SegmentDto = z.infer<typeof segmentDtoSchema>;

export const updateSegmentRequestSchema = z.object({
        "conditions": z.array(z.object({})),
        "description": z.string()});
export type UpdateSegmentRequest = z.infer<typeof updateSegmentRequestSchema>;
