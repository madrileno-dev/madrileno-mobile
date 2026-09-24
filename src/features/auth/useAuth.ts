import { useCallback, useSyncExternalStore } from 'react'
import { forgetReturnTo } from './returnTo'
import { tokenStore, type Tokens } from './tokenStore'

export function useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void } {
  const tokens = useSyncExternalStore(tokenStore.subscribe, tokenStore.get)
  const isHydrated = useSyncExternalStore(tokenStore.subscribe, tokenStore.isHydrated)
  const logout = useCallback(() => {
    // A deliberate logout should send the next login to the auction list,
    // not back to wherever the user logged out from — unlike an involuntary
    // session loss (e.g. a rejected refresh), where returning to the
    // previous screen is right. See returnTo.ts.
    forgetReturnTo()
    tokenStore.set(null)
  }, [])
  return { tokens, isHydrated, logout }
}
