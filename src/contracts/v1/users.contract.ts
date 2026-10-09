import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { userDtoSchema } from "./users.schemas";

export const v1Users = {
  me: {
    delete: oc
      .route({
        method: 'DELETE',
        path: '/v1/users/me',
        summary: 'Delete own account (idempotent)',
        description: 'Delete the authenticated user\'s account: anonymizes the profile, revokes all refresh tokens (already-issued access tokens stay valid until they expire), and asynchronously cleans up the user\'s auctions',
        tags: ['Users'],
        successStatus: 204,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ bearer: [] }] })
      })
      .output(z.void()),
    get: oc
      .route({
        method: 'GET',
        path: '/v1/users/me',
        summary: 'Returns the current user (id, fullName, emailAddress, emailVerified, avatarUrl)',
        description: 'Get the authenticated user\'s profile',
        tags: ['Users'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ bearer: [] }] })
      })
      .output(userDtoSchema)
      .errors({
        'result:account-deleted': {
          status: 401,
          data: errorSchema.extend({type: z.enum(["result:account-deleted"]).describe("A URI reference identifying the problem type")})
        }
      })
  }
};
