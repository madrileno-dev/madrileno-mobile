import { useLocale } from 'use-intl'

export function usePriceFormatter(): (amount: number, currency: string) => string {
  const locale = useLocale()
  return (amount, currency) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
