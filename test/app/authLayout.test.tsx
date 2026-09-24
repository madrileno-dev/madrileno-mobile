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
    // Unmount before the global afterEach's tokenStore.set(null): that runs
    // ahead of RNTL's own auto-cleanup (registered later, when this file
    // imports RNTL) and would otherwise notify this still-mounted,
    // useAuth()-subscribed component outside of act().
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
    // Redirect's href feeds an unmemoized useFocusEffect closure in the real
    // component, so every re-render before navigation completes re-fires
    // router.replace with whatever href that render computed. A second call
    // to the one-shot consumeReturnTo() must not silently fall back to "/".
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
      // Drain any scheduler work the resulting tokenStore notification
      // schedules, so it cannot bleed into the next test's render/act calls.
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await unmount()
    // This is exactly what app/(app)/_layout.tsx's gate does as a side
    // effect of the resulting null session: `setReturnTo(pathname)`. That
    // one-liner is covered by the gate's existing redirect-to-login
    // behavior; what's under test here is that logout() suppressed it.
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBeNull()
  })

  it('after a deliberate logout, the next login redirects to the auction list, not back to the previous screen', async () => {
    // Simulate having been on Settings, then logging out from there — the
    // exact sequence useAuth().logout() performs (forgetReturnTo() is
    // covered on its own above).
    setReturnTo('/settings')
    forgetReturnTo()
    tokenStore.set(null)
    // The (app) gate's setReturnTo(pathname) call, fired as a side effect of
    // the null session, must be suppressed.
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBeNull()

    // Simulate logging back in within the same app process.
    tokenStore.set({ jwt: 'j2', refreshToken: 'r2', email: 'a@example.com' })
    const { unmount } = await render(<AuthLayout />)
    expect(mockRouter.replace).toHaveBeenCalledWith('/')
    await unmount()
  })

  it('an involuntary session invalidation still records the return-to target', () => {
    // A rejected refresh clears tokens directly (tokenStore.set(null)),
    // without going through useAuth().logout() — so forgetReturnTo() is
    // never called, and the gate's setReturnTo(pathname) call must NOT be
    // suppressed.
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    tokenStore.set(null)
    setReturnTo('/settings')
    expect(consumeReturnTo()).toBe('/settings')
  })
})
