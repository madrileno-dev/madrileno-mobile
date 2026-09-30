import { View } from 'react-native'
import { Text } from '@/components/ui/text'

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center gap-2 py-16" testID="empty-state">
      <Text variant="large">{title}</Text>
      {body !== undefined && (
        <Text variant="muted" className="text-center">
          {body}
        </Text>
      )}
    </View>
  )
}
