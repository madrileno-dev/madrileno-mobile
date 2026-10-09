import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc, type ApiClient } from '@/api/orpc'

export type AuctionsPage = Awaited<ReturnType<ApiClient['v1']['auctions']['get']>>
export type AuctionSummary = AuctionsPage['items'][number]
export type Auction = Awaited<ReturnType<ApiClient['v1']['auctions']['byAuctionId']['get']>>
export type BidsPage = Awaited<
  ReturnType<ApiClient['v1']['auctions']['byAuctionId']['bids']['get']>
>

export type PlaceBidError = NonNullable<ReturnType<typeof usePlaceBid>['error']>

export const PAGE_SIZE = 20
export const BIDS_PAGE_SIZE = 10

const auctionsRoute = orpc.v1.auctions
const auctionRoute = orpc.v1.auctions.byAuctionId
const bidsRoute = orpc.v1.auctions.byAuctionId.bids

// Offset-paged on the wire, infinite scroll in the UI.
export function useAuctionsInfinite() {
  return useInfiniteQuery(
    auctionsRoute.get.infiniteOptions({
      input: (pageParam: number) => ({ query: { limit: PAGE_SIZE, offset: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (last) => {
        const next = last.offset + last.items.length
        return next < last.total ? next : undefined
      },
    }),
  )
}

export function useAuction(auctionId: string) {
  return useQuery(auctionRoute.get.queryOptions({ input: { params: { auctionId } } }))
}

export function useBids(auctionId: string) {
  return useInfiniteQuery(
    bidsRoute.get.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        params: { auctionId },
        query: { limit: BIDS_PAGE_SIZE, 'after-id': pageParam },
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.id : undefined),
    }),
  )
}

export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient()
  return useMutation(
    bidsRoute.post.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: auctionRoute.get.key({ input: { params: { auctionId } } }),
        })
        void queryClient.invalidateQueries({
          queryKey: bidsRoute.get.key({ input: { params: { auctionId } } }),
        })
        void queryClient.invalidateQueries({ queryKey: auctionsRoute.get.key() })
      },
    }),
  )
}
