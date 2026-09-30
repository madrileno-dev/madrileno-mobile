import { act, renderHook } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { useAuth } from '@/features/auth/useAuth'
import { makeApiClient } from '@/api/orpc'
import { server } from '../mswServer'

const BASE = 'http://api.test'
const USER = { id: '019ed9bb-0000-7000-8000-000000000042', emailVerified: true }
const REFRESHED = {
  jwt: 'fresh-jwt',
  refreshToken: '22222222-2222-4222-8222-222222222222',
  userCreated: false,
}

let onSessionExpired: jest.Mock

beforeEach(() => {
  onSessionExpired = jest.fn()
  registerAuthTokenProvider({ onSessionExpired })
})

function loggedIn() {
  tokenStore.set({
    jwt: 'stale-jwt',
    refreshToken: '11111111-1111-4111-8111-111111111111',
    email: 'test@example.com',
  })
}

const reject401 = () =>
  HttpResponse.json(
    { type: 'rejection:authentication-failed', status: 401, title: 'Could not authorize' },
    { status: 401 },
  )

function usersMe401Until(fresh: string) {
  return http.get(`${BASE}/v1/users/me`, ({ request }) => {
    if (request.headers.get('authorization') === `Bearer ${fresh}`) {
      return HttpResponse.json(USER)
    }
    return reject401()
  })
}

describe('the authorized fetch behind the oRPC client', () => {
  it('injects the bearer token, refreshes once on 401, and retries', async () => {
    loggedIn()
    let refreshCalls = 0
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () => {
        refreshCalls += 1
        return HttpResponse.json(REFRESHED)
      }),
    )

    const user = await makeApiClient(BASE).v1.users.me.get()

    expect(user.id).toBe(USER.id)
    expect(refreshCalls).toBe(1)
    expect(tokenStore.get()?.jwt).toBe('fresh-jwt')
    expect(tokenStore.get()?.refreshToken).toBe(REFRESHED.refreshToken)
  })

  it('deduplicates concurrent 401s into a single refresh (token rotation safety)', async () => {
    loggedIn()
    let refreshCalls = 0
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, async () => {
        refreshCalls += 1
        await new Promise((r) => setTimeout(r, 25))
        return HttpResponse.json(REFRESHED)
      }),
    )

    const client = makeApiClient(BASE)
    const [a, b] = await Promise.all([client.v1.users.me.get(), client.v1.users.me.get()])

    expect(refreshCalls).toBe(1)
    expect(a.id).toBe(USER.id)
    expect(b.id).toBe(USER.id)
    expect(tokenStore.get()?.jwt).toBe('fresh-jwt')
  })

  it('keeps the session when the refresh endpoint fails transiently (5xx)', async () => {
    loggedIn()
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () =>
        HttpResponse.json(
          { type: 'about:blank', status: 502, title: 'Upstream unavailable' },
          { status: 502 },
        ),
      ),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokenStore.get()?.refreshToken).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('keeps the session when the refresh request fails at the network level', async () => {
    loggedIn()
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () => HttpResponse.error()),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokenStore.get()?.refreshToken).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('logs out and reports the session as expired when the refresh call itself is rejected', async () => {
    loggedIn()
    server.use(
      http.get(`${BASE}/v1/users/me`, reject401),
      http.post(`${BASE}/v1/auth/refresh-token`, reject401),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokenStore.get()).toBeNull()
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the refresh succeeds but the retried request is still 401', async () => {
    loggedIn()
    server.use(
      http.get(`${BASE}/v1/users/me`, reject401),
      http.post(`${BASE}/v1/auth/refresh-token`, () => HttpResponse.json(REFRESHED)),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    // A fresh JWT refused by one route is a per-resource failure, not an expired session.
    expect(tokenStore.get()?.jwt).toBe('fresh-jwt')
    expect(tokenStore.get()?.refreshToken).toBe(REFRESHED.refreshToken)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('does not report the session as expired when the refresh endpoint fails transiently (5xx)', async () => {
    loggedIn()
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () =>
        HttpResponse.json(
          { type: 'about:blank', status: 502, title: 'Upstream unavailable' },
          { status: 502 },
        ),
      ),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('does not report the session as expired on a deliberate logout', async () => {
    loggedIn()
    const { result, unmount } = await renderHook(() => useAuth())

    await act(() => {
      result.current.logout()
    })
    await unmount()

    expect(tokenStore.get()).toBeNull()
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('sends no bearer header when logged out', async () => {
    let sawAuthHeader: string | null = 'unset'
    server.use(
      http.get(`${BASE}/v1/users/me`, ({ request }) => {
        sawAuthHeader = request.headers.get('authorization')
        return HttpResponse.json(USER)
      }),
    )

    const user = await makeApiClient(BASE).v1.users.me.get()

    expect(user.id).toBe(USER.id)
    expect(sawAuthHeader).toBeNull()
  })

  it('drops refreshed tokens when the session changed while the refresh was in flight', async () => {
    loggedIn()
    let refreshStarted = false
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, async () => {
        refreshStarted = true
        await gate
        return HttpResponse.json(REFRESHED)
      }),
    )

    const call = makeApiClient(BASE).v1.users.me.get()
    while (!refreshStarted) await new Promise((r) => setTimeout(r, 5))
    const other = {
      jwt: 'other-jwt',
      refreshToken: '33333333-3333-4333-8333-333333333333',
      email: 'other@example.com',
    }
    tokenStore.set(other)
    release()

    await expect(call).rejects.toThrow()
    expect(tokenStore.get()).toEqual(other)
  })
})
