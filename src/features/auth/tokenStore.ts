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

// The in-memory mirror is authoritative once hydrated. This is a single
// process and nothing else writes the keychain entry, so it is never re-read:
// an async read racing a rotation could restore a spent single-use refresh
// token (see the spec, "tokenStore").
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
      // A locked or corrupt keychain must not strand the app behind a null
      // layout: start logged out and let the user log in again.
      current = null
    }
    hydrated = true
    listeners.forEach((listener) => listener())
  },
  set: (tokens: Tokens | null): void => {
    current = tokens
    // Chain writes so two rapid rotations cannot land out of order.
    pending = pending.then(() => persist(tokens)).catch(() => undefined)
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

export function registerAuthTokenProvider(): void {
  setTokenProvider({
    jwt: () => tokenStore.get()?.jwt,
    refreshToken: () => tokenStore.get()?.refreshToken,
    rotated: (jwt, refreshToken) => {
      const tokens = tokenStore.get()
      if (tokens !== null) tokenStore.set({ ...tokens, jwt, refreshToken })
    },
    invalidated: () => {
      tokenStore.set(null)
    },
  })
}
