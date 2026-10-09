import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { useSyncExternalStore } from 'react'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'
import { env } from '@/env'
import { useAuth } from '@/features/auth/useAuth'
import { rumConsentStore, type RumConsent } from '@/observability/consent'
import type { ThemePreference } from '@/theme/preferences'
import { useThemePreference } from '@/theme/useThemePreference'

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']
const CONSENTS: RumConsent[] = ['granted', 'denied']

export function SettingsScreen() {
  const t = useTranslations('settings')
  const tTheme = useTranslations('theme')
  const tNav = useTranslations('nav')
  const { tokens, logout } = useAuth()
  const { preference, setPreference } = useThemePreference()
  const tConsent = useTranslations('consent')
  const consent = useSyncExternalStore(rumConsentStore.subscribe, rumConsentStore.get)

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
            className="h-11 sm:h-11"
          >
            <Text>{tTheme(p)}</Text>
          </Button>
        ))}
      </View>
      {env.rum !== null && (
        <>
          <Separator />
          <Text variant="large">{tConsent('heading')}</Text>
          <Text variant="muted">{tConsent('body')}</Text>
          <View className="flex-row gap-2">
            {CONSENTS.map((c) => (
              <Button
                key={c}
                variant={consent === c ? 'default' : 'outline'}
                onPress={() => rumConsentStore.set(c)}
                testID={`consent-${c}`}
                className="h-11 sm:h-11"
              >
                <Text>{tConsent(c)}</Text>
              </Button>
            ))}
          </View>
        </>
      )}
      <Separator />
      <Button variant="destructive" testID="logout" onPress={logout}>
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
