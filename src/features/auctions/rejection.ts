import { useTranslations } from 'use-intl'
import { problemTag, type Problem } from '@/api/problem'

export function useRejectionMessage(): (problem: Problem) => string {
  const t = useTranslations('auction')
  return (problem) => {
    switch (problemTag(problem)) {
      case 'bid-too-low':
        return t('rejectBidTooLow')
      case 'already-highest-bidder':
        return t('rejectAlreadyHighest')
      case 'cannot-bid-on-own-auction':
        return t('rejectOwnAuction')
      case 'auction-not-open':
        return t('rejectNotOpen')
      case 'authentication-failed':
        return t('rejectAuthExpired')
      default:
        return problem.detail ?? problem.title
    }
  }
}
