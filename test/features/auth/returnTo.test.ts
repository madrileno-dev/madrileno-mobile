import { consumeReturnTo, forgetReturnTo, setReturnTo } from '@/features/auth/returnTo'

describe('returnTo', () => {
  it('hands back the stored href exactly once', () => {
    setReturnTo('/auctions/abc')
    expect(consumeReturnTo()).toBe('/auctions/abc')
    expect(consumeReturnTo()).toBeNull()
  })

  it('never stores the login route itself', () => {
    setReturnTo('/login')
    expect(consumeReturnTo()).toBeNull()
  })

  it('forgetReturnTo clears any stored href and suppresses exactly the next setReturnTo call', () => {
    setReturnTo('/settings')
    forgetReturnTo()
    setReturnTo('/auctions/abc')
    expect(consumeReturnTo()).toBeNull()
    setReturnTo('/auctions/def')
    expect(consumeReturnTo()).toBe('/auctions/def')
  })

  it('consumeReturnTo disarms a pending suppression so a later capture is kept', () => {
    forgetReturnTo()
    expect(consumeReturnTo()).toBeNull()
    setReturnTo('/auctions/abc')
    expect(consumeReturnTo()).toBe('/auctions/abc')
  })
})
