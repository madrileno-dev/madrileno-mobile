import { fireEvent, screen } from '@testing-library/react-native'
import AppLayout from '../../../app/(app)/_layout'
import { tokenStore } from '@/features/auth/tokenStore'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { readThemePreference } from '@/theme/preferences'
import { renderWithProviders } from '../../renderApp'
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
    expect(mockRouter.replace).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByTestId('logout'))
    expect(tokenStore.get()).toBeNull()
    expect(mockRouter.replace).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
    await unmount()
  })
})
