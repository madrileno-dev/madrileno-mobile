import { fireEvent, screen } from '@testing-library/react-native'
import { Appearance } from 'react-native'
import { tokenStore } from '@/features/auth/tokenStore'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { renderWithProviders } from '../renderApp'

const MAX_CALLS = 20

describe('ThemeProvider with SettingsScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('applies each preference change to the color scheme exactly once', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light')
    const calls: unknown[] = []
    const original = Appearance.setColorScheme.bind(Appearance)
    // Throw out of a runaway alternation instead of hanging the test.
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation((scheme) => {
      calls.push(scheme)
      if (calls.length > MAX_CALLS)
        throw new Error(`setColorScheme looped: ${JSON.stringify(calls)}`)
      original(scheme)
    })
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })

    const { unmount } = await renderWithProviders(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    )
    calls.length = 0

    await fireEvent.press(screen.getByTestId('theme-dark'))
    expect(calls).toEqual(['dark'])

    await fireEvent.press(screen.getByTestId('theme-light'))
    expect(calls).toEqual(['dark', 'light'])

    await fireEvent.press(screen.getByTestId('theme-system'))
    // 'system' clears the override: null before RN 0.82, 'unspecified' after.
    expect(calls).toHaveLength(3)
    expect([null, 'unspecified']).toContain(calls[2])

    await unmount()
  })
})
