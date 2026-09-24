import { render } from '@testing-library/react-native'
import AuthLayout from '../../app/(auth)/_layout'
import { setReturnTo } from '@/features/auth/returnTo'
import { tokenStore } from '@/features/auth/tokenStore'
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
})
