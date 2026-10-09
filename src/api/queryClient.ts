import { ORPCError } from '@orpc/client'
import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { AppState } from 'react-native'

// TanStack's default listeners watch window visibility and online events, which RN lacks.
export function connectQueryManagers(): void {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) =>
      setFocused(state === 'active'),
    )
    return () => subscription.remove()
  })
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  )
}

export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof ORPCError && error.status < 500) return false
  return failureCount < 3
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: retryUnlessClientError } } })
}
