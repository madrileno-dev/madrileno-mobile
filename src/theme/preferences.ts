import { createMMKV } from 'react-native-mmkv'
import { z } from 'zod'

const storage = createMMKV({ id: 'madrileno.preferences' })
const KEY = 'theme'

const preferenceSchema = z.enum(['light', 'dark', 'system'])
export type ThemePreference = z.infer<typeof preferenceSchema>

export function readThemePreference(): ThemePreference {
  const parsed = preferenceSchema.safeParse(storage.getString(KEY))
  return parsed.success ? parsed.data : 'system'
}

export function writeThemePreference(preference: ThemePreference): void {
  storage.set(KEY, preference)
}

type Listener = () => void

// One in-memory owner of the preference, so every reader sees the same value
// and only ThemeProvider applies it to the color scheme.
let current: ThemePreference = readThemePreference()
const listeners = new Set<Listener>()

// Arrow properties: useSyncExternalStore calls them detached from the object.
export const themePreferenceStore = {
  get: (): ThemePreference => current,
  set: (preference: ThemePreference): void => {
    if (preference === current) return
    current = preference
    writeThemePreference(preference)
    listeners.forEach((listener) => listener())
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
