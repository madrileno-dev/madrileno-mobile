import { Redirect, Stack, usePathname } from 'expo-router'
import { useTranslations } from 'use-intl'
import { setReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AppLayout() {
  const { tokens, isHydrated } = useAuth()
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  // mobile:auction-block-start
  const tAuction = useTranslations('auction')
  const indexTitle = tAuction('listTitle')
  // mobile:auction-block-end
  if (!isHydrated) return null
  if (tokens === null) {
    setReturnTo(pathname)
    return <Redirect href="/login" />
  }
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: indexTitle }} />
      <Stack.Screen name="settings" options={{ title: tNav('settings') }} />
      {/* mobile:auction-block-start */}
      <Stack.Screen name="auctions/[id]" options={{ title: '' }} />
      {/* mobile:auction-block-end */}
    </Stack>
  )
}
