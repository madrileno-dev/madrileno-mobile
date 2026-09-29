import type { ConfigContext } from 'expo/config'
import getConfig, { usesCleartext, DEFAULT_API_BASE_URL } from '../app.config'

describe('usesCleartext', () => {
  it('allows the emulator host alias', () => {
    expect(usesCleartext('http://10.0.2.2:9000', undefined)).toBe(true)
  })

  it('allows a plain http host', () => {
    expect(usesCleartext('http://localhost:9000', undefined)).toBe(true)
  })

  it('rejects an https API base URL', () => {
    expect(usesCleartext('https://api.example.com', undefined)).toBe(false)
  })

  it('falls back to the http default when undefined', () => {
    expect(usesCleartext(undefined, undefined)).toBe(true)
  })

  it('falls back to the http default when empty', () => {
    expect(usesCleartext('', undefined)).toBe(true)
  })

  it('is case-insensitive on the scheme', () => {
    expect(usesCleartext('HTTP://10.0.2.2:9000', undefined)).toBe(true)
  })

  it('is anchored to the start of the URL, not merely containing http://', () => {
    expect(usesCleartext('https://x/?r=http://y', undefined)).toBe(false)
  })

  it('never enables cleartext on an EAS production build, even with an unset URL', () => {
    expect(usesCleartext(undefined, 'production')).toBe(false)
  })

  it('never enables cleartext on an EAS production build, even with an explicit http URL', () => {
    expect(usesCleartext('http://10.0.2.2:9000', 'production')).toBe(false)
  })

  it('still enables cleartext on a non-production build with an unset (http default) URL', () => {
    expect(usesCleartext(undefined, 'preview')).toBe(true)
    expect(usesCleartext(undefined, undefined)).toBe(true)
  })
})

function cleartextPluginEntries(config: ReturnType<typeof getConfig>): unknown[] {
  return (config.plugins ?? []).filter(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  )
}

describe('app.config cleartext gating', () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
  const originalBuildProfile = process.env.EAS_BUILD_PROFILE

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl
    if (originalBuildProfile === undefined) delete process.env.EAS_BUILD_PROFILE
    else process.env.EAS_BUILD_PROFILE = originalBuildProfile
  })

  it('adds the expo-build-properties cleartext plugin when EXPO_PUBLIC_API_BASE_URL is unset (http default)', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL
    delete process.env.EAS_BUILD_PROFILE
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ])
  })

  it('omits the expo-build-properties cleartext plugin for an https API base URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com'
    delete process.env.EAS_BUILD_PROFILE
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([])
  })

  it('omits the expo-build-properties cleartext plugin on a production build with an unset URL', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL
    process.env.EAS_BUILD_PROFILE = 'production'
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([])
  })

  it('omits the expo-build-properties cleartext plugin on a production build with an explicit http URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://10.0.2.2:9000'
    process.env.EAS_BUILD_PROFILE = 'production'
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([])
  })
})

function loadEnv(): typeof import('@/env') {
  let loaded: typeof import('@/env') | undefined
  jest.isolateModules(() => {
    // Synchronous require re-evaluates src/env.ts against process.env.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/env') as typeof import('@/env')
  })
  if (loaded === undefined) throw new Error('@/env did not load')
  return loaded
}

describe('DEFAULT_API_BASE_URL', () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl
  })

  it('matches src/env.ts EXPO_PUBLIC_API_BASE_URL default, so the duplicated literal cannot drift', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL
    expect(DEFAULT_API_BASE_URL).toBe(loadEnv().env.apiBaseUrl)
  })
})
