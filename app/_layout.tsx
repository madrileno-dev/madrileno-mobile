import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'

void SplashScreen.preventAutoHideAsync()
registerAuthTokenProvider()

const queryClient = new QueryClient()

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void tokenStore.hydrate().finally(() => {
      setReady(true)
      void SplashScreen.hideAsync()
    })
  }, [])

  if (!ready) return null

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
