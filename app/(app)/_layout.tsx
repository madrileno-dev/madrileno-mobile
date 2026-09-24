import { Redirect, Stack, usePathname } from 'expo-router'
import { useTranslations } from 'use-intl'
import { setReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AppLayout() {
  const { tokens, isHydrated } = useAuth()
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const indexTitle = tNav('home')
  if (!isHydrated) return null
  if (tokens === null) {
    setReturnTo(pathname)
    return <Redirect href="/login" />
  }
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: indexTitle }} />
      <Stack.Screen name="settings" options={{ title: tNav('settings') }} />
    </Stack>
  )
}
