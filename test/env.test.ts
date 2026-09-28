function setOrDelete(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

function loadEnv(): typeof import('@/env') {
  let loaded: typeof import('@/env') | undefined
  jest.isolateModules(() => {
    // Must be a synchronous require (not a dynamic import) so each call
    // re-evaluates src/env.ts against the current process.env.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/env') as typeof import('@/env')
  })
  if (loaded === undefined) throw new Error('@/env did not load')
  return loaded
}

describe('env', () => {
  const originalClientToken = process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN
  const originalEndpoint = process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT
  const originalApplicationId = process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID
  const originalRumEnv = process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENV

  afterEach(() => {
    setOrDelete('EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN', originalClientToken)
    setOrDelete('EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT', originalEndpoint)
    setOrDelete('EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID', originalApplicationId)
    setOrDelete('EXPO_PUBLIC_OPENOBSERVE_RUM_ENV', originalRumEnv)
  })

  it('rum is null without a client token or endpoint', () => {
    delete process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN
    delete process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT

    expect(loadEnv().env.rum).toBeNull()
  })

  it('rum is null with only a client token set', () => {
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN = 'test-token'
    delete process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT

    expect(loadEnv().env.rum).toBeNull()
  })

  it('rum is populated when both the client token and endpoint are set', () => {
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN = 'test-token'
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT = 'http://10.0.2.2:55080'
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID = 'my-app'
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENV = 'staging'

    expect(loadEnv().env.rum).toEqual({
      clientToken: 'test-token',
      endpoint: 'http://10.0.2.2:55080',
      applicationId: 'my-app',
      env: 'staging',
    })
  })

  it('defaults the application id and env when unset', () => {
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN = 'test-token'
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT = 'http://10.0.2.2:55080'
    delete process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID
    delete process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENV

    const rum = loadEnv().env.rum
    expect(rum?.applicationId).toBe('madrileno-mobile')
    expect(rum?.env).toEqual(expect.any(String))
  })
})
