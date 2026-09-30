import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTranslations('error')
  return (
    <View className="items-center gap-3 py-16" testID="error-state">
      <Text className="text-destructive text-center">{message}</Text>
      {onRetry !== undefined && (
        <Button variant="outline" onPress={onRetry}>
          <Text>{t('retry')}</Text>
        </Button>
      )}
    </View>
  )
}
