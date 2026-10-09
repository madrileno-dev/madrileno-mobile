import * as SecureStore from 'expo-secure-store'
import { z } from 'zod'
import { setTokenProvider } from '@/api/authFetch'

const STORAGE_KEY = 'madrileno.tokens'

// Validate what comes back out of the keychain: an older format must read as
// logged-out, not as a session with undefined fields.
const tokensSchema = z.object({
  jwt: z.string(),
  refreshToken: z.string(),
  email: z.string(),
})

export type Tokens = z.infer<typeof tokensSchema>

type Listener = () => void

// Never re-read after hydrating: a racing read could restore a spent refresh token.
let current: Tokens | null = null
let hydrated = false
let pending: Promise<void> = Promise.resolve()
const listeners = new Set<Listener>()

function parse(raw: string | null): Tokens | null {
  if (raw === null) return null
  try {
    const parsed = tokensSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function persist(tokens: Tokens | null): Promise<void> {
  return tokens !== null
    ? SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens))
    : SecureStore.deleteItemAsync(STORAGE_KEY)
}

// Arrow properties: useSyncExternalStore calls them detached from the object.
export const tokenStore = {
  get: (): Tokens | null => current,
  isHydrated: (): boolean => hydrated,
  hydrate: async (): Promise<void> => {
    try {
      current = parse(await SecureStore.getItemAsync(STORAGE_KEY))
    } catch {
      // A locked or corrupt keychain starts logged out.
      current = null
    }
    hydrated = true
    listeners.forEach((listener) => listener())
  },
  set: (tokens: Tokens | null): void => {
    current = tokens
    // Chain writes so two rapid rotations cannot land out of order.
    pending = pending
      .then(() => persist(tokens))
      .catch((error: unknown) => {
        console.warn('[tokenStore] persisting tokens failed', error)
      })
    listeners.forEach((listener) => listener())
  },
  flush: (): Promise<void> => pending,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function registerAuthTokenProvider(options?: { onSessionExpired?: () => void }): void {
  setTokenProvider({
    jwt: () => tokenStore.get()?.jwt,
    refreshToken: () => tokenStore.get()?.refreshToken,
    rotated: (jwt, refreshToken) => {
      const tokens = tokenStore.get()
      if (tokens !== null) tokenStore.set({ ...tokens, jwt, refreshToken })
    },
    invalidated: () => {
      tokenStore.set(null)
      options?.onSessionExpired?.()
    },
    subscribe: tokenStore.subscribe,
  })
}
