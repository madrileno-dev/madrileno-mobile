import { ORPCError } from '@orpc/client'
import { errorSchema, type ErrorType } from '@/contracts/schemas'

// RFC 9457 Problem Details; dispatch on `type`, never on the human-readable text.
export type Problem = ErrorType

export function asProblem(body: unknown): Problem | null {
  const result = errorSchema.safeParse(body)
  return result.success ? result.data : null
}

// Expected API failures arrive as ORPCErrors with the Problem envelope decoded
// into error.data by the link; anything else is not a Problem.
export function problemFrom(error: unknown): Problem | null {
  return error instanceof ORPCError ? asProblem(error.data) : null
}

export function problemTag(problem: Problem): string {
  return problem.type.split(':').pop() ?? problem.type
}
