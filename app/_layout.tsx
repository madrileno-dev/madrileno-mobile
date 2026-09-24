import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { Stack, useRouter, type Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'

void SplashScreen.preventAutoHideAsync()
registerAuthTokenProvider()

const queryClient = new QueryClient()

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    // On Android, expo-router's cold-start initial-route resolution never
    // sees a bare `scheme://host` deep link's target (it always resolves to
    // "/"), even though the OS intent carries it correctly and the same
    // string resolves fine through expo-router's own warm Linking listener.
    // Read the raw intent URL ourselves and correct the route once, so
    // downstream pathname reads (e.g. (app)/_layout's returnTo capture) see
    // the real target instead of "/".
    void Linking.getInitialURL().then((url) => {
      if (url === null) return
      const { hostname, path } = Linking.parse(url)
      if (hostname === null || hostname === 'expo-development-client') return
      const target = `/${hostname}${path ?? ''}`
      if (target === '/') return
      // The one cast at this boundary: the target comes from the raw OS
      // intent, not from expo-router's own typed route table.
      router.replace(target as Href)
    })
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
