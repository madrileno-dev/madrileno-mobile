import { z } from "zod";
import { oc } from "@orpc/contract";
import { errorSchema } from "../schemas";
import { loggerLevelDtoSchema, setLoggerLevelRequestSchema } from "./loggers.schemas";

export const adminLoggers = {
  get: oc
    .route({
      method: 'GET',
      path: '/admin/loggers',
      summary: 'Inspect Logback loggers',
      description: 'List all configured loggers with their effective and configured levels.',
      tags: ['Admin'],
      successStatus: 200,
      inputStructure: 'detailed',
      spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
    })
    .output(z.array(loggerLevelDtoSchema))
    .errors({
      'rejection:authentication-failed': {
        status: 401,
        data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
      }
    }),
  byName: {
    get: oc
      .route({
        method: 'GET',
        path: '/admin/loggers/{name}',
        summary: 'Inspect one Logback logger',
        description: 'Get one logger\'s configured + effective level. 404 if Logback has never been told about the name.',
        tags: ['Admin'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({name: z.string()})
      }))
      .output(loggerLevelDtoSchema)
      .errors({
        'result:logger-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:logger-not-found"]).describe("A URI reference identifying the problem type")})
        }
      }),
    post: oc
      .route({
        method: 'POST',
        path: '/admin/loggers/{name}',
        summary: 'Set a Logback logger\'s level',
        description: 'Set a logger\'s configured level. Send `{"level":"DEBUG"}` to set; `{"level":null}` (or `{}`) to clear and inherit from parent. 404 if the logger doesn\'t exist — Logback only knows about a logger after something has named it.',
        tags: ['Admin'],
        successStatus: 200,
        inputStructure: 'detailed',
        spec: (current) => ({ ...current, security: [{ "admin-basic": [] }] })
      })
      .input(z.object({
        params: z.object({name: z.string()}),
        body: setLoggerLevelRequestSchema
      }))
      .output(loggerLevelDtoSchema)
      .errors({
        'rejection:authentication-failed': {
          status: 401,
          data: errorSchema.extend({type: z.enum(["rejection:authentication-failed"]).describe("A URI reference identifying the problem type")})
        },
        'result:invalid-log-level': {
          status: 400,
          data: errorSchema.extend({type: z.enum(["result:invalid-log-level"]).describe("A URI reference identifying the problem type")})
        },
        'result:logger-not-found': {
          status: 404,
          data: errorSchema.extend({type: z.enum(["result:logger-not-found"]).describe("A URI reference identifying the problem type")})
        }
      })
  }
};
