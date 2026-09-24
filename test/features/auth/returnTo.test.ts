import { consumeReturnTo, setReturnTo } from '@/features/auth/returnTo'

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
})
