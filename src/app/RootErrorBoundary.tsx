import type { ErrorBoundaryProps } from 'expo-router'
import { View } from 'react-native'
import { createTranslator } from 'use-intl/core'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { messages } from '@/i18n/config'

// Expo Router renders this outside the root layout's providers when the
// layout itself throws, so it must not depend on LocaleProvider,
// ThemeProvider, QueryClientProvider or safe-area context.
const t = createTranslator({ locale: 'en', messages, namespace: 'error' })

export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text variant="h3">{t('heading')}</Text>
      <Text testID="error-message" variant="muted">
        {error.message}
      </Text>
      <Button testID="error-retry" onPress={() => void retry()}>
        <Text>{t('retry')}</Text>
      </Button>
    </View>
  )
}
