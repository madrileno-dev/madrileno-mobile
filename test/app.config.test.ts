import type { ConfigContext } from 'expo/config'
import getConfig, { usesCleartext } from '../app.config'

describe('usesCleartext', () => {
  it('allows the emulator host alias', () => {
    expect(usesCleartext('http://10.0.2.2:9000')).toBe(true)
  })

  it('allows a plain http host', () => {
    expect(usesCleartext('http://localhost:9000')).toBe(true)
  })

  it('rejects an https API base URL', () => {
    expect(usesCleartext('https://api.example.com')).toBe(false)
  })

  it('falls back to the http default when undefined', () => {
    expect(usesCleartext(undefined)).toBe(true)
  })

  it('falls back to the http default when empty', () => {
    expect(usesCleartext('')).toBe(true)
  })
})

function cleartextPluginEntries(config: ReturnType<typeof getConfig>): unknown[] {
  return (config.plugins ?? []).filter(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  )
}

describe('app.config cleartext gating', () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL
    else process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl
  })

  it('adds the expo-build-properties cleartext plugin when EXPO_PUBLIC_API_BASE_URL is unset (http default)', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ])
  })

  it('omits the expo-build-properties cleartext plugin for an https API base URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com'
    const config = getConfig({ config: {} } as ConfigContext)
    expect(cleartextPluginEntries(config)).toEqual([])
  })
})
