import { useCallback, useSyncExternalStore } from 'react'
import { client } from '@/api/orpc'
import { forgetReturnTo } from './returnTo'
import { tokenStore, type Tokens } from './tokenStore'

export function useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void } {
  const tokens = useSyncExternalStore(tokenStore.subscribe, tokenStore.get)
  const isHydrated = useSyncExternalStore(tokenStore.subscribe, tokenStore.isHydrated)
  const logout = useCallback(() => {
    const refreshToken = tokenStore.get()?.refreshToken
    // Ends the session server-side; local state clears whatever the outcome.
    if (refreshToken !== undefined) {
      client.v1.auth.logout.post({ body: { refreshToken } }).catch(() => {})
    }
    // A deliberate logout returns to the list, not to where the user was.
    forgetReturnTo()
    tokenStore.set(null)
  }, [])
  return { tokens, isHydrated, logout }
}
