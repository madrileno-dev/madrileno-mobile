import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";

export const adminThreaddump = {
  get: oc
    .route({
      method: 'GET',
      path: '/admin/threaddump',
      summary: 'Inspect JVM threads + cats-effect fibers',
      description: 'Returns a snapshot of the JVM thread state (Spring-Actuator shape) alongside the cats-effect live fiber snapshot. Use this for \'what is this process stuck doing?\' debugging. `jvmThreads` exposes non-fiber threads (Netty I/O, Skunk pool, scheduler, finalizer); `fibers.workers` shows fibers queued on each compute worker, `fibers.external` shows suspended fibers (Deferred.get, Sleep, etc.). Fiber traces depend on `-Dcats.effect.tracing.mode` — default `cached` populates them with the captured async-boundary frames.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .output(z.object({}))
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    })
};
