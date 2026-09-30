import { useTranslations } from 'use-intl'

export function useAuctionStatusLabel(): (status: string) => string {
  const t = useTranslations('auction')
  return (status) => {
    switch (status) {
      case 'Open':
        return t('statusOpen')
      case 'Closed':
        return t('statusClosed')
      case 'Cancelled':
        return t('statusCancelled')
      default:
        return status
    }
  }
}
