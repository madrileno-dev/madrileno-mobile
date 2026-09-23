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
