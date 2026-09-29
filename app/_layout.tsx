import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { Stack, usePathname, useRouter, type Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useRef } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Toaster, toast } from 'sonner-native'
import { createTranslator } from 'use-intl/core'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { messages } from '@/i18n/config'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { resolveColdStartTarget } from '@/lib/resolveColdStartTarget'
import { RumProvider, useRumNavigationTracking } from '@/observability/rum'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { useOtaUpdates } from '@/updates/useOtaUpdates'

export { RootErrorBoundary as ErrorBoundary } from '@/components/RootErrorBoundary'

void SplashScreen.preventAutoHideAsync()

const t = createTranslator({ locale: 'en', messages, namespace: 'error' })
registerAuthTokenProvider({ onSessionExpired: () => toast.error(t('sessionExpired')) })

const queryClient = new QueryClient()

const configuredScheme = Constants.expoConfig?.scheme
const scheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme

// Once per process: the token store must never re-read the keychain.
let booted = false

export default function RootLayout() {
  useOtaUpdates()
  useRumNavigationTracking()
  const router = useRouter()
  const pathname = usePathname()
  // Read by the boot effect when getInitialURL resolves, without re-running it.
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (booted) return
    booted = true
    // Android cold start resolves a `<scheme>://host` deep link to '/'; correct it
    // from the raw intent. https links resolve fine and are left alone.
    if (scheme !== undefined) {
      void Linking.getInitialURL().then((url) => {
        const target = resolveColdStartTarget(url, scheme)
        if (target !== null && target !== pathnameRef.current) {
          // The intent URL is untyped; it's a route by construction.
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
      <RumProvider>
        <QueryClientProvider client={queryClient}>
          <LocaleProvider>
            <ThemeProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="(auth)" />
              </Stack>
              <PortalHost />
              <Toaster position="bottom-center" />
            </ThemeProvider>
          </LocaleProvider>
        </QueryClientProvider>
      </RumProvider>
    </GestureHandlerRootView>
  )
}
