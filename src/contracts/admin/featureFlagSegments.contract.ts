import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { createSegmentRequestSchema, segmentDtoSchema, updateSegmentRequestSchema } from "./featureFlagSegments.schemas";

export const adminFeatureFlagSegments = {
  get: oc
    .route({
      method: 'GET',
      path: '/admin/feature-flag-segments',
      summary: 'List segments',
      description: 'List all segments.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .output(z.array(segmentDtoSchema)),
  post: oc
    .route({
      method: 'POST',
      path: '/admin/feature-flag-segments',
      summary: 'Create a segment',
      description: 'Create a reusable segment referenced from rules via SegmentMatch.',
      tags: ['Admin'],
      successStatus: 201,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .input(z.object({
      body: createSegmentRequestSchema
    }))
    .output(segmentDtoSchema)
    .errors({
      'result:segment-name-exists': {
        status: 409,
        data: errorSchema.extend({type: z.enum(["result:segment-name-exists"]).describe("A URI reference identifying the problem type")})
      }
    }),
  byName: {
    delete: oc
      .route({
        method: 'DELETE',
        path: '/admin/feature-flag-segments/{name}',
        summary: 'Delete a segment',
        description: 'Delete a segment. Rules still referencing it stop matching (missing segment never matches).',
        tags: ['Admin'],
        successStatus: 204,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({name: z.string()})
      }))
      .output(z.void())
      .errors({
        'result:segment-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:segment-not-found"]).describe("A URI reference identifying the problem type")})
        }
      }),
    put: oc
      .route({
        method: 'PUT',
        path: '/admin/feature-flag-segments/{name}',
        summary: 'Update a segment',
        description: 'Replace a segment\'s description and conditions. Name, id and createdAt are preserved.',
        tags: ['Admin'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({name: z.string()}),
        body: updateSegmentRequestSchema
      }))
      .output(segmentDtoSchema)
      .errors({
        'result:segment-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:segment-not-found"]).describe("A URI reference identifying the problem type")})
        }
      })
  }
};
