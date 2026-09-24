import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import * as Updates from 'expo-updates'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import type { ThemePreference } from '@/theme/preferences'
import { useThemePreference } from '@/theme/useThemePreference'

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export function SettingsScreen() {
  const t = useTranslations('settings')
  const tTheme = useTranslations('theme')
  const tNav = useTranslations('nav')
  const router = useRouter()
  const { tokens, logout } = useAuth()
  const { preference, setPreference } = useThemePreference()

  return (
    <Screen scroll>
      <Text variant="muted">{t('signedInAs', { email: tokens?.email ?? '' })}</Text>
      <Separator />
      <Text variant="large">{tTheme('heading')}</Text>
      <View className="flex-row gap-2">
        {PREFERENCES.map((p) => (
          <Button
            key={p}
            variant={preference === p ? 'default' : 'outline'}
            onPress={() => setPreference(p)}
            testID={`theme-${p}`}
          >
            <Text>{tTheme(p)}</Text>
          </Button>
        ))}
      </View>
      <Separator />
      <Button
        variant="destructive"
        testID="logout"
        onPress={() => {
          logout()
          router.replace('/login')
        }}
      >
        <Text>{tNav('logOut')}</Text>
      </Button>
      <Text variant="muted" className="mt-8">
        {t('version', {
          version: Constants.expoConfig?.version ?? '0.0.0',
          updateId: Updates.updateId ?? t('noUpdate'),
        })}
      </Text>
    </Screen>
  )
}
