import { useSyncExternalStore } from 'react'
import { themePreferenceStore, type ThemePreference } from './preferences'

export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
} {
  const preference = useSyncExternalStore(themePreferenceStore.subscribe, themePreferenceStore.get)
  return { preference, setPreference: themePreferenceStore.set }
}
