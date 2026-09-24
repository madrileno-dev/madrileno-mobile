// The dev client's own bootstrap deep link (`<scheme>://expo-development-client/?url=...`)
// carries the app's own scheme too; it is not a route to correct to.
const DEV_CLIENT_HOST = 'expo-development-client'

// See app/_layout.tsx: expo-router's Android cold-start initial-route
// resolution loses a bare `<scheme>://host` deep link's target. Map the raw
// OS intent URL to the route it should have resolved to, or null when there
// is nothing to correct: no URL, a link on a different scheme (a universal/
// web link — expo-router's own resolution already handles those correctly),
// a bare scheme with no host, or the dev client's own bootstrap link.
//
// Uses the native `URL` directly rather than expo-linking's `Linking.parse`:
// the latter also consults `expo-constants` (`getHostUri`/`hasCustomScheme`)
// for its Expo-Go-specific `/--/` prefix handling, which this app never
// needs (it is never run in Expo Go) and which throws when `expo-constants`
// has no execution environment configured, as in this project's Jest setup.
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
