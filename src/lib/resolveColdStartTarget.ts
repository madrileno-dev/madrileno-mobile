// The dev client's own bootstrap link uses our scheme too.
const DEV_CLIENT_HOST = 'expo-development-client'

// See app/_layout.tsx. Plain URL, not Linking.parse: that needs expo-constants,
// which throws under Jest.
export function resolveColdStartTarget(url: string | null, scheme: string): string | null {
  if (url === null) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${scheme}:`) return null
  if (parsed.hostname === '' || parsed.hostname === DEV_CLIENT_HOST) return null
  const target = `/${parsed.hostname}${parsed.pathname}`
  return target === '/' ? null : target
}
