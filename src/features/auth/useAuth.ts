import { useCallback, useSyncExternalStore } from 'react'
import { tokenStore, type Tokens } from './tokenStore'

export function useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void } {
  const tokens = useSyncExternalStore(tokenStore.subscribe, tokenStore.get)
  const isHydrated = useSyncExternalStore(tokenStore.subscribe, tokenStore.isHydrated)
  const logout = useCallback(() => {
    tokenStore.set(null)
  }, [])
  return { tokens, isHydrated, logout }
}
