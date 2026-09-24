import { Link, Stack } from 'expo-router'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export default function NotFound() {
  const t = useTranslations('notFound')
  return (
    <>
      <Stack.Screen options={{ title: t('title') }} />
      <Screen className="items-center justify-center">
        <Text variant="h3">{t('heading')}</Text>
        <Link href="/" className="text-primary">
          {t('link')}
        </Link>
      </Screen>
    </>
  )
}
