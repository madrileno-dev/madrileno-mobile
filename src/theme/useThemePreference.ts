import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useState } from 'react'
import { Appearance } from 'react-native'
import { readThemePreference, writeThemePreference, type ThemePreference } from './preferences'

export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  resolved: 'light' | 'dark'
} {
  const nativewindColorScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    nativewindColorScheme.setColorScheme(preference)
  }, [preference, nativewindColorScheme])

  const setPreference = useCallback((p: ThemePreference) => {
    writeThemePreference(p)
    setPreferenceState(p)
  }, [])

  const resolved: 'light' | 'dark' =
    nativewindColorScheme.colorScheme ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
  return { preference, setPreference, resolved }
}
