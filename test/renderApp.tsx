import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { LocaleProvider } from '@/i18n/LocaleProvider'

export function renderWithProviders(ui: ReactElement) {
  // gcTime 0: eviction timers would otherwise keep the Jest worker alive.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>,
  )
}
