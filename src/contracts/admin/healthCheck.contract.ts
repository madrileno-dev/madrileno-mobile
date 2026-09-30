import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { adminHealthCheckDtoSchema } from "./healthCheck.schemas";

export const adminHealthCheck = {
  get: oc
    .route({
      method: 'GET',
      path: '/admin/health-check',
      summary: 'Admin readiness probe',
      description: 'Admin-only deep health check — probes Postgres and SMTP, returns 503 if any dep is down. Gated by Basic Auth.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .output(adminHealthCheckDtoSchema)
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    })
};
