import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { createFlagRequestSchema, evaluateFlagRequestSchema, evaluationResultDtoSchema, featureFlagDtoSchema, pageSchema, toggleFlagRequestSchema, updateFlagRequestSchema } from "./featureFlags.schemas";

export const adminFeatureFlags = {
  get: oc
    .route({
      method: 'GET',
      path: '/admin/feature-flags',
      summary: 'List feature flags',
      description: 'List all feature flags with their rules.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .output(z.array(featureFlagDtoSchema))
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    }),
  post: oc
    .route({
      method: 'POST',
      path: '/admin/feature-flags',
      summary: 'Create a feature flag',
      description: 'Create a feature flag. The key is immutable; rules are validated against the flag\'s variant type.',
      tags: ['Admin'],
      successStatus: 201,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .input(z.object({
      body: createFlagRequestSchema
    }))
    .output(featureFlagDtoSchema)
    .errors({
      'result:flag-invalid': {
        status: 400,
        data: errorSchema.extend({type: z.enum(["result:flag-invalid"]).describe("A URI reference identifying the problem type")})
      },
      'result:flag-key-exists': {
        status: 409,
        data: errorSchema.extend({type: z.enum(["result:flag-key-exists"]).describe("A URI reference identifying the problem type")})
      }
    }),
  byKey: {
    delete: oc
      .route({
        method: 'DELETE',
        path: '/admin/feature-flags/{key}',
        summary: 'Delete a feature flag',
        description: 'Delete a flag and its rules. Audit entries survive with the flag reference detached.',
        tags: ['Admin'],
        successStatus: 204,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({key: z.string()})
      }))
      .output(z.void())
      .errors({
        'result:flag-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:flag-not-found"]).describe("A URI reference identifying the problem type")})
        }
      }),
    get: oc
      .route({
        method: 'GET',
        path: '/admin/feature-flags/{key}',
        summary: 'Get a feature flag',
        description: 'Fetch one feature flag by key.',
        tags: ['Admin'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({key: z.string()})
      }))
      .output(featureFlagDtoSchema)
      .errors({
        'result:flag-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:flag-not-found"]).describe("A URI reference identifying the problem type")})
        }
      }),
    put: oc
      .route({
        method: 'PUT',
        path: '/admin/feature-flags/{key}',
        summary: 'Update a feature flag',
        description: 'Replace a flag\'s mutable fields (description, enabled, default value, client exposure, rules). Key, id and createdAt are preserved.',
        tags: ['Admin'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({key: z.string()}),
        body: updateFlagRequestSchema
      }))
      .output(featureFlagDtoSchema)
      .errors({
        'result:flag-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:flag-not-found"]).describe("A URI reference identifying the problem type")})
        }
      }),
    audit: {
      get: oc
        .route({
          method: 'GET',
          path: '/admin/feature-flags/{key}/audit',
          summary: 'List a flag\'s audit entries',
          description: 'Audit trail for a flag (paginated, newest first by default). Entries survive flag deletion.',
          tags: ['Admin'],
          successStatus: 200,
          inputStructure: 'detailed',
          spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
        })
        .input(z.object({
          params: z.object({key: z.string()}),
          query: z.object({"sort-by": z.enum(["CreatedAt"]).nullish(), "sort-dir": z.enum(["Asc","Desc"]).nullish(), limit: z.number().int().nullish(), offset: z.number().int().nullish()}).optional()
        }))
        .output(pageSchema)
    },
    evaluate: {
      post: oc
        .route({
          method: 'POST',
          path: '/admin/feature-flags/{key}/evaluate',
          summary: 'Evaluate a flag for a given context',
          description: 'Dry-run a flag against an arbitrary evaluation context, bypassing caches. For debugging targeting rules.',
          tags: ['Admin'],
          successStatus: 200,
          inputStructure: 'detailed',
          spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
        })
        .input(z.object({
          params: z.object({key: z.string()}),
          body: evaluateFlagRequestSchema
        }))
        .output(evaluationResultDtoSchema)
        .errors({
          'result:flag-not-found': {
            status: 404,
            data: errorSchema.extend({type: z.enum(["result:flag-not-found"]).describe("A URI reference identifying the problem type")})
          }
        })
    },
    toggle: {
      post: oc
        .route({
          method: 'POST',
          path: '/admin/feature-flags/{key}/toggle',
          summary: 'Toggle a feature flag',
          description: 'Enable or disable a flag without touching its rules.',
          tags: ['Admin'],
          successStatus: 200,
          inputStructure: 'detailed',
          spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
        })
        .input(z.object({
          params: z.object({key: z.string()}),
          body: toggleFlagRequestSchema
        }))
        .output(featureFlagDtoSchema)
        .errors({
          'result:flag-not-found': {
            status: 404,
            data: errorSchema.extend({type: z.enum(["result:flag-not-found"]).describe("A URI reference identifying the problem type")})
          }
        })
    }
  }
};
