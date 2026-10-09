import { renderHook } from '@testing-library/react-native'
import { useAuctionLabels } from '@/features/auctions/labels'
import { LocaleProvider } from '@/i18n/LocaleProvider'

describe('useAuctionLabels', () => {
  it('translates the generated enums', async () => {
    const { result } = await renderHook(() => useAuctionLabels(), { wrapper: LocaleProvider })
    expect(result.current.status('Closed')).toBe('Closed')
    expect(result.current.color('Rose')).toBe('Rosé')
    expect(result.current.bottleSize('DoubleMagnum')).toBe('Double magnum')
  })
})
