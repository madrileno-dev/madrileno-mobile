import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { Stack, usePathname, useRouter, type Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useRef } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { resolveColdStartTarget } from '@/lib/resolveColdStartTarget'
import { ThemeProvider } from '@/theme/ThemeProvider'

void SplashScreen.preventAutoHideAsync()
registerAuthTokenProvider()

const queryClient = new QueryClient()

const configuredScheme = Constants.expoConfig?.scheme
// app.json's `scheme` may be a single string or a list; this app only
// declares one.
const scheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme

export default function RootLayout() {
  const router = useRouter()
  const pathname = usePathname()
  // Kept in sync (via its own effect, not during render — see
  // react-hooks/refs) so the correction effect below can read the router's
  // latest resolved pathname without depending on `pathname` itself: that
  // effect must run exactly once, at boot, but should compare against
  // whatever the router has resolved by the time Linking.getInitialURL()
  // resolves, not a value captured (and frozen) at mount.
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    // On Android, expo-router's cold-start initial-route resolution never
    // sees a bare `<scheme>://host` deep link's target for this app's own
    // scheme (it always resolves to "/"), even though the OS intent carries
    // it correctly and the same string resolves fine through expo-router's
    // own warm Linking listener. Read the raw intent URL ourselves and
    // correct the route once, so downstream pathname reads (e.g.
    // (app)/_layout's returnTo capture) see the real target instead of "/".
    // Restricted to this app's own scheme: a universal/web (https) link is
    // not affected by this bug and must be left to expo-router's own
    // resolution (see Ruling 15 — Task 9 wires those up).
    if (scheme !== undefined) {
      void Linking.getInitialURL().then((url) => {
        const target = resolveColdStartTarget(url, scheme)
        if (target !== null && target !== pathnameRef.current) {
          // The one cast at this boundary: the target comes from the raw OS
          // intent, not from expo-router's own typed route table.
          router.replace(target as Href)
        }
      })
    }
    void tokenStore.hydrate().finally(() => {
      void SplashScreen.hideAsync()
    })
  }, [router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" />
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
