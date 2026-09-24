import { useLocalSearchParams } from 'expo-router'
import { AuctionDetailScreen } from '@/features/auctions/screens/AuctionDetailScreen'

export default function AuctionDetailRoute() {
  const { id } = useLocalSearchParams<'/auctions/[id]'>()
  return <AuctionDetailScreen auctionId={id} />
}
