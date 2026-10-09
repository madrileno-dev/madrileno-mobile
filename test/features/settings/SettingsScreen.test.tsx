import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import AppLayout from '../../../app/(app)/_layout'
import { tokenStore } from '@/features/auth/tokenStore'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { readThemePreference } from '@/theme/preferences'
import { renderWithProviders } from '../../renderApp'
import { server } from '../../mswServer'
import { mockRouter } from '../../setup'

describe('SettingsScreen', () => {
  beforeEach(() => {
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
  })

  it('shows who is signed in and the version', async () => {
    const { unmount } = await renderWithProviders(<SettingsScreen />)
    expect(screen.getByText('Signed in as a@example.com')).toBeTruthy()
    expect(screen.getByText(/Version/)).toBeTruthy()
    // Unmount before the global afterEach clears tokens outside act().
    await unmount()
  })

  it('persists the theme choice', async () => {
    const { unmount } = await renderWithProviders(<SettingsScreen />)
    await fireEvent.press(screen.getByTestId('theme-dark'))
    expect(readThemePreference()).toBe('dark')
    await unmount()
  })

  it('logs out and leaves the redirect to login to the (app) gate', async () => {
    await tokenStore.hydrate()
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
    const { unmount } = await renderWithProviders(
      <>
        <AppLayout />
        <SettingsScreen />
      </>,
    )
    let revoked: unknown
    server.use(
      http.post('http://10.0.2.2:9000/v1/auth/logout', async ({ request }) => {
        revoked = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect(mockRouter.replace).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByTestId('logout'))
    expect(tokenStore.get()).toBeNull()
    await waitFor(() => expect(revoked).toEqual({ refreshToken: 'r' }))
    expect(mockRouter.replace).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
    await unmount()
  })
})
