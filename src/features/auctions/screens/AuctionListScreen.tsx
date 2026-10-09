import { FlashList } from '@shopify/flash-list'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Screen } from '@/components/Screen'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useAuctionsInfinite } from '@/features/auctions/queries'
import { AuctionCard } from './AuctionCard'

function ListSkeleton() {
  return (
    <View className="gap-4 p-4" testID="list-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </View>
  )
}

export function AuctionListScreen() {
  const t = useTranslations('auction')
  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAuctionsInfinite()

  if (isPending) return <ListSkeleton />
  if (data === undefined) {
    return (
      <Screen>
        <ErrorState message={t('errorList')} onRetry={() => void refetch()} />
      </Screen>
    )
  }

  const items = data.pages.flatMap((page) => page.items)
  return (
    <View className="flex-1 bg-background">
      {isError && (
        <View className="bg-muted px-4 py-2" testID="stale-banner">
          <Text variant="muted">{t('staleBanner')}</Text>
        </View>
      )}
      <FlashList
        testID="auction-list"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AuctionCard auction={item} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ padding: 16 }}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={() => void refetch()}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <Skeleton className="mt-4 h-28 w-full rounded-lg" /> : null
        }
        ListEmptyComponent={<EmptyState title={t('empty')} body={t('emptyBody')} />}
      />
    </View>
  )
}
