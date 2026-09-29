import { act, render, renderHook } from '@testing-library/react-native'
import AuthLayout from '../../app/(auth)/_layout'
import { consumeReturnTo, forgetReturnTo, setReturnTo } from '@/features/auth/returnTo'
import { tokenStore } from '@/features/auth/tokenStore'
import { useAuth } from '@/features/auth/useAuth'
import { mockRouter } from '../setup'

describe('AuthLayout', () => {
  beforeEach(async () => {
    await tokenStore.hydrate()
  })

  it('redirects to the stored return-to target after authentication', async () => {
    setReturnTo('/settings')
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    const { unmount } = await render(<AuthLayout />)
    expect(mockRouter.replace).toHaveBeenCalledWith('/settings')
    // Unmount before the global afterEach clears tokens outside act().
    await unmount()
  })

  it('falls back to home when there is no stored return-to target', async () => {
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    const { unmount } = await render(<AuthLayout />)
    expect(mockRouter.replace).toHaveBeenCalledWith('/')
    await unmount()
  })

  it('does not redirect while logged out', async () => {
    const { unmount } = await render(<AuthLayout />)
    expect(mockRouter.replace).not.toHaveBeenCalled()
    await unmount()
  })

  it('keeps redirecting to the same return-to target across re-renders while authenticated', async () => {
    setReturnTo('/settings')
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    const { rerender, unmount } = await render(<AuthLayout />)
    // A second consumeReturnTo() must not fall back to '/'.
    await rerender(<AuthLayout />)
    await rerender(<AuthLayout />)
    expect(mockRouter.replace).toHaveBeenCalledWith('/settings')
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/')
    await unmount()
  })

  it("useAuth().logout() suppresses the app gate's next return-to recording", async () => {
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    const { result, unmount } = await renderHook(() => useAuth())
    await act(async () => {
      result.current.logout()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await unmount()
    // What the (app) gate does on a null session.
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBeNull()
  })

  it('after a deliberate logout, the next login redirects to the auction list, not back to the previous screen', async () => {
    setReturnTo('/settings')
    forgetReturnTo()
    tokenStore.set(null)
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBeNull()

    tokenStore.set({ jwt: 'j2', refreshToken: 'r2', email: 'a@example.com' })
    const { unmount } = await render(<AuthLayout />)
    expect(mockRouter.replace).toHaveBeenCalledWith('/')
    await unmount()
  })

  it('an involuntary session invalidation still records the return-to target', () => {
    // A rejected refresh clears tokens without logout(), so the capture stands.
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    tokenStore.set(null)
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBe('/settings')
  })
})
