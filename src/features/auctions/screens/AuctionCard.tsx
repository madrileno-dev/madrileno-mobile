import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { type AuctionSummary } from '@/features/auctions/queries'
import { useAuctionStatusLabel } from '@/features/auctions/status'

export function AuctionCard({ auction }: { auction: AuctionSummary }) {
  const t = useTranslations('auction')
  const router = useRouter()
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  const statusLabel = useAuctionStatusLabel()
  const title = `${auction.wineName}${auction.vintage != null ? ` ${String(auction.vintage)}` : ''}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={`auction-${auction.id}`}
      onPress={() => {
        void Haptics.selectionAsync()
        router.push(`/auctions/${auction.id}`)
      }}
      className="active:opacity-80"
    >
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <CardTitle className="flex-1">{title}</CardTitle>
          <Badge variant={auction.status === 'Open' ? 'default' : 'secondary'}>
            <Text>{statusLabel(auction.status)}</Text>
          </Badge>
        </CardHeader>
        <CardContent className="gap-1">
          <Text variant="muted">
            {auction.color} · {auction.region} · {auction.producerName}
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text variant="large">{price(auction.currentPrice, auction.currency)}</Text>
            <Text variant="muted">{t('ends', { when: formatInstant(auction.endsAt) })}</Text>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  )
}
