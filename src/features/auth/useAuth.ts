import { useCallback, useSyncExternalStore } from 'react'
import { forgetReturnTo } from './returnTo'
import { tokenStore, type Tokens } from './tokenStore'

export function useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void } {
  const tokens = useSyncExternalStore(tokenStore.subscribe, tokenStore.get)
  const isHydrated = useSyncExternalStore(tokenStore.subscribe, tokenStore.isHydrated)
  const logout = useCallback(() => {
    // A deliberate logout returns to the list, not to where the user was.
    forgetReturnTo()
    tokenStore.set(null)
  }, [])
  return { tokens, isHydrated, logout }
}
