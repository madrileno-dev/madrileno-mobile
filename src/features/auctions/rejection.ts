import { isDefinedError } from '@orpc/client'
import { useTranslations } from 'use-intl'
import { problemFrom } from '@/api/problem'
import type { PlaceBidError } from '@/features/auctions/queries'

export function useRejectionMessage(): (error: PlaceBidError) => string {
  const t = useTranslations('auction')
  return (error) => {
    if (!isDefinedError(error)) {
      const problem = problemFrom(error)
      if (problem?.status === 401) return t('rejectAuthExpired')
      return problem?.detail ?? t('bidFailed')
    }
    const code = error.code
    switch (code) {
      case 'result:bid-too-low':
        return t('rejectBidTooLow')
      case 'result:already-highest-bidder':
        return t('rejectAlreadyHighest')
      case 'result:cannot-bid-on-own-auction':
        return t('rejectOwnAuction')
      case 'result:auction-not-open':
        return t('rejectNotOpen')
      case 'result:auction-ended':
        return t('rejectEnded')
      case 'result:auction-not-started':
        return t('rejectNotStarted')
      case 'result:auction-not-found':
        return t('rejectNotFound')
      default: {
        const unhandled: never = code
        return unhandled
      }
    }
  }
}
