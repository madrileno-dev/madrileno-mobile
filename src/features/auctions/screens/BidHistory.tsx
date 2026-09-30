import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { useBids } from '@/features/auctions/queries'

export function BidHistory({ auctionId }: { auctionId: string }) {
  const t = useTranslations('auction')
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBids(auctionId)
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  if (isPending) return <Skeleton className="h-12 w-full" />
  if (isError) return <Text className="text-destructive">{t('bidError')}</Text>
  const bids = data.pages.flatMap((page) => page.items)
  return (
    <View className="gap-3">
      {bids.length === 0 ? (
        <Text variant="muted">{t('bidNone')}</Text>
      ) : (
        bids.map((bid, i) => (
          <View key={bid.id} className="gap-3">
            {i > 0 && <Separator />}
            <View className="gap-0.5">
              <Text variant="large">{price(bid.amount, bid.currency)}</Text>
              <Text variant="muted">
                {t('bidBy', { bidder: bid.bidderRef, when: formatInstant(bid.createdAt) })}
              </Text>
            </View>
          </View>
        ))
      )}
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onPress={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          <Text>{isFetchingNextPage ? t('bidLoadingMore') : t('bidLoadMore')}</Text>
        </Button>
      )}
    </View>
  )
}
