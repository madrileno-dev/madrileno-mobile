import * as SecureStore from 'expo-secure-store'
import { tokenStore, type Tokens } from '@/features/auth/tokenStore'
import { secureStoreMock } from '../../setup'

const KEY = 'madrileno.tokens'
const tokens: Tokens = { jwt: 'jwt-1', refreshToken: 'rt-1', email: 'a@example.com' }

describe('tokenStore', () => {
  beforeEach(async () => {
    tokenStore.set(null)
    await tokenStore.flush()
    jest.mocked(SecureStore.getItemAsync).mockClear()
    jest.mocked(SecureStore.setItemAsync).mockClear()
  })

  it('hydrates once from the secure store', async () => {
    secureStoreMock.set(KEY, JSON.stringify(tokens))
    await tokenStore.hydrate()
    expect(tokenStore.get()).toEqual(tokens)
    expect(tokenStore.isHydrated()).toBe(true)
  })

  it('treats a persisted value with the wrong shape as logged out', async () => {
    secureStoreMock.set(KEY, JSON.stringify({ token: 'legacy' }))
    await tokenStore.hydrate()
    expect(tokenStore.get()).toBeNull()
    secureStoreMock.set(KEY, 'not even json')
    await tokenStore.hydrate()
    expect(tokenStore.get()).toBeNull()
  })

  it('writes through to the secure store and clears it on logout', async () => {
    tokenStore.set(tokens)
    await tokenStore.flush()
    expect(secureStoreMock.get(KEY)).toBe(JSON.stringify(tokens))
    tokenStore.set(null)
    await tokenStore.flush()
    expect(secureStoreMock.has(KEY)).toBe(false)
  })

  it('serializes writes so a fast rotation followed by logout lands in order', async () => {
    const calls: string[] = []
    const slowSet = async (_k: string, v: string) => {
      await new Promise((r) => setTimeout(r, 10))
      calls.push(`set:${v}`)
    }
    // One-shot implementations: a persistent override would leak into later tests.
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementationOnce(slowSet)
      .mockImplementationOnce(slowSet)
    jest.mocked(SecureStore.deleteItemAsync).mockImplementationOnce(async () => {
      await Promise.resolve()
      calls.push('delete')
    })
    tokenStore.set(tokens)
    tokenStore.set({ ...tokens, jwt: 'jwt-2' })
    tokenStore.set(null)
    await tokenStore.flush()
    expect(calls).toEqual([
      `set:${JSON.stringify(tokens)}`,
      `set:${JSON.stringify({ ...tokens, jwt: 'jwt-2' })}`,
      'delete',
    ])
  })

  it('reports a failed write via console.warn but keeps the write chain alive', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain locked'))

    tokenStore.set(tokens)
    tokenStore.set({ ...tokens, jwt: 'jwt-2' })
    await tokenStore.flush()

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith('[tokenStore] persisting tokens failed', expect.any(Error))
    expect(secureStoreMock.get(KEY)).toBe(JSON.stringify({ ...tokens, jwt: 'jwt-2' }))

    warnSpy.mockRestore()
  })

  it('never reads the secure store again after hydration', async () => {
    secureStoreMock.set(KEY, JSON.stringify(tokens))
    await tokenStore.hydrate()
    const readsAfterHydrate = jest.mocked(SecureStore.getItemAsync).mock.calls.length
    tokenStore.set({ ...tokens, jwt: 'jwt-2' })
    await tokenStore.flush()
    tokenStore.get()
    expect(jest.mocked(SecureStore.getItemAsync).mock.calls.length).toBe(readsAfterHydrate)
  })

  it('treats a failed keychain read as logged out and still reports hydrated', async () => {
    // The shared `tokenStore` instance is already hydrated by earlier tests,
    // so `isHydrated()` on it proves nothing about the pre-hydrate state.
    // Load a fresh module instance instead, whose `hydrated` module state
    // genuinely starts false.
    let isolated!: {
      store: typeof tokenStore
      getItemAsync: jest.Mock
    }
    jest.isolateModules(() => {
      const freshTokenStoreModule = jest.requireActual<typeof import('@/features/auth/tokenStore')>(
        '@/features/auth/tokenStore',
      )
      const freshSecureStore = jest.requireMock<typeof SecureStore>('expo-secure-store')
      isolated = {
        store: freshTokenStoreModule.tokenStore,
        getItemAsync: jest.mocked(freshSecureStore.getItemAsync),
      }
    })
    isolated.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'))

    expect(isolated.store.isHydrated()).toBe(false)
    await isolated.store.hydrate()
    expect(isolated.store.get()).toBeNull()
    expect(isolated.store.isHydrated()).toBe(true)
  })

  it('notifies subscribers on every change', () => {
    const seen: (string | null)[] = []
    const unsubscribe = tokenStore.subscribe(() => seen.push(tokenStore.get()?.jwt ?? null))
    tokenStore.set(tokens)
    tokenStore.set(null)
    unsubscribe()
    tokenStore.set(tokens)
    expect(seen).toEqual(['jwt-1', null])
  })
})
