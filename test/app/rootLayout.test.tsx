import { render } from '@testing-library/react-native'
import { tokenStore } from '@/features/auth/tokenStore'
import RootLayout from '../../app/_layout'
import { mockRouter } from '../setup'

jest.mock('../../global.css', () => ({}))

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: unknown }) => children,
}))

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}))

describe('RootLayout', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('hydrates the token store once per process, even if the router identity changes', async () => {
    const hydrate = jest.spyOn(tokenStore, 'hydrate')
    const { rerender, unmount } = await render(<RootLayout />)
    expect(hydrate).toHaveBeenCalledTimes(1)

    const expoRouter = jest.requireMock<{ useRouter: () => typeof mockRouter }>('expo-router')
    jest.spyOn(expoRouter, 'useRouter').mockReturnValue({ ...mockRouter })
    await rerender(<RootLayout />)
    expect(hydrate).toHaveBeenCalledTimes(1)

    await unmount()
    await render(<RootLayout />)

    expect(hydrate).toHaveBeenCalledTimes(1)
  })
})
