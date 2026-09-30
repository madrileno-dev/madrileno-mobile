import { type ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { messages } from './config'

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" messages={messages}>
      {children}
    </IntlProvider>
  )
}
