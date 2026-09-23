import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { heapdumpResultDtoSchema } from "./heapdump.schemas";

export const adminHeapdump = {
  post: oc
    .route({
      method: 'POST',
      path: '/admin/heapdump',
      summary: 'Trigger an HPROF heap dump',
      description: 'Triggers an HPROF heap dump via `HotSpotDiagnosticMXBean.dumpHeap(...)`. The dump is written to a server-side path (not streamed in the response — heap dumps can be multi-GB). Returns the path, size, the `live` flag used, and how long the dump took. Operator workflow: hit this endpoint, then `scp` the file off the host and open in Eclipse MAT / VisualVM / jhat.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .input(z.object({
      query: z.object({live: z.boolean().nullish(), path: z.string().nullish()}).optional()
    }))
    .output(heapdumpResultDtoSchema)
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    })
};
