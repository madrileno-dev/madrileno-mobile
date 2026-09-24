import { useLocalSearchParams } from 'expo-router'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<'/auctions/[id]'>()
  return (
    <Screen>
      <Text variant="h3">{id}</Text>
    </Screen>
  )
}
