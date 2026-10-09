import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { clientFlagsDtoSchema } from "./featureFlags.schemas";

export const v1FeatureFlags = {
  get: oc
    .route({
      method: 'GET',
      path: '/v1/feature-flags',
      summary: 'Evaluate all client-exposed flags for the current user',
      description: 'Bootstrap payload for clients: every client-exposed flag evaluated against the authenticated user (targeting key = user id). Flags not marked client-exposed are never present in the response.',
      tags: ['Feature flags'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ bearer: [] }] })
    })
    .output(clientFlagsDtoSchema)
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    })
};
