import { Stack } from 'expo-router'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { ErrorState } from '@/components/ErrorState'
import { Screen } from '@/components/Screen'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { useAuction } from '@/features/auctions/queries'
import { useAuctionLabels } from '@/features/auctions/labels'
import { BidHistory } from './BidHistory'
import { PlaceBidDialog } from './PlaceBidDialog'

export function AuctionDetailScreen({ auctionId }: { auctionId: string }) {
  const t = useTranslations('auction')
  const { data: auction, isPending, isError, refetch } = useAuction(auctionId)
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  const label = useAuctionLabels()

  if (isPending) {
    return (
      <Screen>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-full" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={t('detailError')} onRetry={() => void refetch()} />
      </Screen>
    )
  }

  const title = `${auction.wineName}${auction.vintage != null ? ` ${String(auction.vintage)}` : ''}`
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen scroll>
        <View className="flex-row items-start justify-between gap-3">
          <Text variant="h3" className="flex-1">
            {title}
          </Text>
          <Badge variant={auction.status === 'Open' ? 'default' : 'secondary'}>
            <Text>{label.status(auction.status)}</Text>
          </Badge>
        </View>
        <Text variant="muted">
          {label.color(auction.color)} · {auction.region} · {auction.appellation} ·{' '}
          {auction.producerName} · {auction.bottleCount}× {label.bottleSize(auction.bottleSize)}
        </Text>
        {auction.description != null && <Text>{auction.description}</Text>}
        <View className="gap-0.5">
          <Text variant="h4">{price(auction.currentPrice, auction.currency)}</Text>
          <Text variant="muted">
            {t('startedAt', { price: price(auction.startingPrice, auction.currency) })} ·{' '}
            {t('ends', { when: formatInstant(auction.endsAt) })}
          </Text>
        </View>
        <PlaceBidDialog auction={auction} />
        <Text variant="h4">{t('bidHistory')}</Text>
        <BidHistory auctionId={auction.id} />
      </Screen>
    </>
  )
}
