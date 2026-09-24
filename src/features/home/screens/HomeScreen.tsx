import { Link } from 'expo-router'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export function HomeScreen() {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')
  return (
    <Screen scroll>
      <Text variant="h3">{t('heading')}</Text>
      <Text variant="muted">{t('body')}</Text>
      <Link href="/settings" asChild>
        <Text className="text-primary">{tNav('settings')}</Text>
      </Link>
    </Screen>
  )
}
