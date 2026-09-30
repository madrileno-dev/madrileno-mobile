import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createContractsClient, type ContractsClient } from '@/contracts/client'
import { env } from '@/env'
import { makeAuthorizedFetch } from './authFetch'

export type ApiClient = ContractsClient

export function makeApiClient(baseUrl: string = env.apiBaseUrl): ApiClient {
  return createContractsClient(baseUrl, { fetch: makeAuthorizedFetch(baseUrl) })
}

export const client: ApiClient = makeApiClient()

export const orpc = createTanstackQueryUtils(client)

export type OrpcUtils = typeof orpc
