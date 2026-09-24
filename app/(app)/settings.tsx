import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export default function SettingsScreen() {
  const t = useTranslations('nav')
  return (
    <Screen>
      <Text variant="h3">{t('settings')}</Text>
    </Screen>
  )
}
