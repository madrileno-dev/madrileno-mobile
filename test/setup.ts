import { StyleSheet } from 'nativewind'
import type { ReactNode } from 'react'
import { tokenStore } from '@/features/auth/tokenStore'
import { server } from './mswServer'

// In-memory stand-in for the keychain. The state lives INSIDE the factory:
// jest hoists jest.mock() above the imports, so a module-level Map referenced
// from the factory would still be in its temporal dead zone when the first
// import (tokenStore → expo-secure-store) evaluates the mock. Only `mock`-prefixed
// variables may be captured, and even those must be initialised lazily.
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

// Metro's css transform (which reads tailwind.config's darkMode: 'class' and
// registers it as a nativewind flag) never runs under Jest, so
// useColorScheme().setColorScheme would otherwise throw "Unable to manually
// set color scheme without using darkMode: class".
StyleSheet.registerCompiled({ $compiled: true, flags: { darkMode: 'class' } })

jest.mock('expo-updates', () => ({
  isEnabled: false,
  updateId: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}))

export const mockToast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() })
jest.mock('sonner-native', () => ({ toast: mockToast, Toaster: () => null }))

export const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }
jest.mock('expo-router', () => {
  // Spread the actual module first: navTheme.ts imports DefaultTheme/DarkTheme
  // from expo-router at module scope, so those must stay real values.
  const actual = jest.requireActual<object>('expo-router')
  return {
    ...actual,
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    Link: ({ children }: { children: ReactNode }) => children,
    // A real <Redirect> performs a router.replace(href) as a side effect;
    // mirror that so layouts that render one are testable via mockRouter.
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
})

afterAll(() => {
  server.close()
})
