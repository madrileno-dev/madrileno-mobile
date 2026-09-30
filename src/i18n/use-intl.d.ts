import type en from './messages/en.json'

declare module 'use-intl' {
  interface AppConfig {
    Locale: 'en'
    Messages: typeof en
  }
}
