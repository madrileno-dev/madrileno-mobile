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

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  secureStoreMock.clear()
  tokenStore.set(null)
})

afterAll(() => {
  server.close()
})
