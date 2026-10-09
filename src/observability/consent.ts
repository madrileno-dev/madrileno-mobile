import { createMMKV } from 'react-native-mmkv'
import { z } from 'zod'

const storage = createMMKV({ id: 'madrileno.preferences' })
const KEY = 'rumConsent'

const consentSchema = z.enum(['granted', 'denied'])
export type RumConsent = z.infer<typeof consentSchema>

function read(): RumConsent | null {
  const parsed = consentSchema.safeParse(storage.getString(KEY))
  return parsed.success ? parsed.data : null
}

type Listener = () => void

let current = read()
const listeners = new Set<Listener>()

// null until the user has chosen; RUM collects nothing until then.
export const rumConsentStore = {
  get: (): RumConsent | null => current,
  set: (consent: RumConsent): void => {
    if (consent === current) return
    current = consent
    storage.set(KEY, consent)
    listeners.forEach((listener) => listener())
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
