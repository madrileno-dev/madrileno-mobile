import { z } from "zod";

export const evaluateFlagRequestSchema = z.object({
        "attributes": z.record(z.string(), z.string()),
        "targetingKey": z.string()});
export type EvaluateFlagRequest = z.infer<typeof evaluateFlagRequestSchema>;

export const evaluationResultDtoSchema = z.object({
        "reason": z.enum(["Default","Disabled","Error","Split","TargetingMatch"]),
        "value": z.object({})});
export type EvaluationResultDto = z.infer<typeof evaluationResultDtoSchema>;

export const ruleDtoSchema = z.object({
        "conditions": z.array(z.object({})),
        "createdAt": z.iso.datetime({ offset: true }),
        "description": z.string(),
        "id": z.uuid(),
        "outcome": z.object({}),
        "position": z.number().int()});
export type RuleDto = z.infer<typeof ruleDtoSchema>;

export const ruleRequestSchema = z.object({
        "conditions": z.array(z.object({})),
        "description": z.string(),
        "outcome": z.object({}),
        "position": z.number().int()});
export type RuleRequest = z.infer<typeof ruleRequestSchema>;

export const toggleFlagRequestSchema = z.object({
        "enabled": z.boolean()});
export type ToggleFlagRequest = z.infer<typeof toggleFlagRequestSchema>;

export const createFlagRequestSchema = z.object({
        "clientExposed": z.boolean(),
        "defaultValue": z.object({}),
        "description": z.string(),
        "enabled": z.boolean(),
        "key": z.string(),
        "rules": z.array(ruleRequestSchema)});
export type CreateFlagRequest = z.infer<typeof createFlagRequestSchema>;

export const featureFlagDtoSchema = z.object({
        "clientExposed": z.boolean(),
        "createdAt": z.iso.datetime({ offset: true }),
        "defaultValue": z.object({}),
        "description": z.string(),
        "enabled": z.boolean(),
        "id": z.uuid(),
        "key": z.string(),
        "rules": z.array(ruleDtoSchema),
        "updatedAt": z.iso.datetime({ offset: true })});
export type FeatureFlagDto = z.infer<typeof featureFlagDtoSchema>;

export const featureFlagDtoSchema4496 = z.object({
        "clientExposed": z.boolean(),
        "createdAt": z.iso.datetime({ offset: true }),
        "defaultValue": z.object({}),
        "description": z.string(),
        "enabled": z.boolean(),
        "id": z.uuid(),
        "key": z.string(),
        "rules": z.array(ruleDtoSchema),
        "updatedAt": z.iso.datetime({ offset: true })});
export type FeatureFlagDto4496 = z.infer<typeof featureFlagDtoSchema4496>;

export const updateFlagRequestSchema = z.object({
        "clientExposed": z.boolean(),
        "defaultValue": z.object({}),
        "description": z.string(),
        "enabled": z.boolean(),
        "rules": z.array(ruleRequestSchema)});
export type UpdateFlagRequest = z.infer<typeof updateFlagRequestSchema>;

export const auditEntryDtoSchema = z.object({
        "action": z.enum(["Created","Deleted","Toggled","Updated"]),
        "actor": z.string(),
        "after": featureFlagDtoSchema4496.nullish(),
        "before": featureFlagDtoSchema4496.nullish(),
        "createdAt": z.iso.datetime({ offset: true }),
        "flagId": z.uuid().nullish(),
        "flagKey": z.string(),
        "id": z.uuid()});
export type AuditEntryDto = z.infer<typeof auditEntryDtoSchema>;

export const pageSchema = z.object({
        "items": z.array(auditEntryDtoSchema),
        "limit": z.number().int(),
        "offset": z.number().int(),
        "total": z.number().int()});
export type Page = z.infer<typeof pageSchema>;
