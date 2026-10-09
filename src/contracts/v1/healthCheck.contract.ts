import { oc } from "@orpc/contract";
import { healthCheckDtoSchema } from "./healthCheck.schemas";

export const v1HealthCheck = {
  get: oc
    .route({
      method: 'GET',
      path: '/v1/health-check',
      summary: 'Returns app metadata',
      description: 'Liveness probe — does not touch dependencies',
      tags: ['Health Check'],
      successStatus: 200,
      inputStructure: 'detailed'
    })
    .output(healthCheckDtoSchema)
};
