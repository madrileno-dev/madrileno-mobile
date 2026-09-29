import { StyleSheet } from 'nativewind'
import { createElement, Fragment, type ReactNode } from 'react'
import { tokenStore } from '@/features/auth/tokenStore'
import { server } from './mswServer'

// Keychain stand-in. State lives inside the factory: jest.mock is hoisted above imports.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    __store: store,
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})
export const secureStoreMock = jest.requireMock<{ __store: Map<string, string> }>(
  'expo-secure-store',
).__store

// The package's jest mock is a CommonJS module with a `default` export.
jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
)

jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>()
  return {
    createMMKV: () => ({
      getString: (k: string) => store.get(k),
      set: (k: string, v: string) => store.set(k, v),
      remove: (k: string) => store.delete(k),
    }),
  }
})

jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual<typeof import('react-native')>('react-native').FlatList,
}))

jest.mock('react-native-reanimated', () =>
  jest.requireActual<object>('react-native-reanimated/mock'),
)

jest.mock('@rn-primitives/portal', () => ({
  PortalHost: () => null,
  Portal: ({ children }: { children: unknown }) => children,
}))

// Metro's css transform, which registers darkMode: 'class', doesn't run under Jest.
StyleSheet.registerCompiled({ $compiled: true, flags: { darkMode: 'class' } })

jest.mock('expo-updates', () => ({
  isEnabled: false,
  updateId: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}))

// No native modules under Jest; the configuration class stays inspectable.
export const mockOpenObserveProvider = jest.fn((props: { children?: ReactNode }) =>
  createElement(Fragment, null, props.children),
)
jest.mock('@openobserve/mobile-react-native', () => {
  class MockOpenObserveProviderConfiguration {
    clientToken: string
    env: string
    trackingConsent: string
    service: string | undefined
    version: string | undefined
    constructor(
      clientToken: string,
      env: string,
      trackingConsent: string,
      options: Record<string, unknown> = {},
    ) {
      this.clientToken = clientToken
      this.env = env
      this.trackingConsent = trackingConsent
      Object.assign(this, options)
    }
  }
  return {
    TrackingConsent: { GRANTED: 'granted', PENDING: 'pending', NOT_GRANTED: 'not_granted' },
    BatchSize: { SMALL: 'SMALL', MEDIUM: 'MEDIUM', LARGE: 'LARGE' },
    UploadFrequency: { RARE: 'RARE', AVERAGE: 'AVERAGE', FREQUENT: 'FREQUENT' },
    PropagatorType: { TRACECONTEXT: 'tracecontext', B3: 'b3', B3MULTI: 'b3multi' },
    OpenObserveProviderConfiguration: MockOpenObserveProviderConfiguration,
    OpenObserveProvider: (props: { children?: ReactNode }) => mockOpenObserveProvider(props),
  }
})

export const mockStartTrackingViews = jest.fn()
export const mockStopTrackingViews = jest.fn()
jest.mock('@openobserve/mobile-react-navigation', () => ({
  O2RumReactNavigationTracking: {
    startTrackingViews: mockStartTrackingViews,
    stopTrackingViews: mockStopTrackingViews,
  },
}))

export const mockToast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() })
jest.mock('sonner-native', () => ({ toast: mockToast, Toaster: () => null }))

export const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }
jest.mock('expo-router', () => {
  // navTheme.ts needs the real DefaultTheme/DarkTheme.
  const actual = jest.requireActual<object>('expo-router')
  return {
    ...actual,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    Link: ({ children }: { children: ReactNode }) => children,
    // A real <Redirect> calls router.replace(href).
    Redirect: ({ href }: { href: unknown }) => {
      mockRouter.replace(href)
      return null
    },
    Stack: Object.assign(() => null, { Screen: () => null }),
  }
})

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  secureStoreMock.clear()
  tokenStore.set(null)
  mockRouter.push.mockClear()
  mockRouter.replace.mockClear()
  mockRouter.back.mockClear()
  mockToast.mockClear()
  mockToast.success.mockClear()
  mockToast.error.mockClear()
  mockOpenObserveProvider.mockClear()
  mockStartTrackingViews.mockClear()
  mockStopTrackingViews.mockClear()
})

afterAll(() => {
  server.close()
})
