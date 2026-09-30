import { Link, Redirect, Stack, usePathname } from 'expo-router'
import { Settings as SettingsIcon } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useTranslations } from 'use-intl'
import { BrandTitle } from '@/components/BrandTitle'
import { Icon } from '@/components/ui/icon'
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
      <Stack.Screen
        name="index"
        options={{
          title: indexTitle,
          headerTitle: () => <BrandTitle />,
          headerLargeTitle: false,
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel={tNav('settings')} testID="open-settings" hitSlop={8}>
                <Icon as={SettingsIcon} className="text-foreground" size={22} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: tNav('settings') }} />
      {/* mobile:auction-block-start */}
      <Stack.Screen name="auctions/[id]" options={{ title: '' }} />
      {/* mobile:auction-block-end */}
    </Stack>
  )
}
