import * as Updates from 'expo-updates'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { toast } from 'sonner-native'
import { createTranslator } from 'use-intl/core'
import { messages } from '@/i18n/config'

const THROTTLE_MS = 5 * 60_000

export interface OtaDeps {
  isEnabled: boolean
  checkForUpdate: () => Promise<{ isAvailable: boolean }>
  fetchUpdate: () => Promise<unknown>
  reload: () => Promise<void>
  prompt: (onAccept: () => Promise<void>) => void
  failed: (retry: () => Promise<void>) => void
  now: () => number
}

let lastCheck = Number.NEGATIVE_INFINITY

// Consent gates the download: whatever is on disk launches at the next cold start.
export async function checkForOtaUpdate(deps: OtaDeps): Promise<void> {
  if (!deps.isEnabled) return
  if (deps.now() - lastCheck < THROTTLE_MS) return
  lastCheck = deps.now()
  try {
    const { isAvailable } = await deps.checkForUpdate()
    if (!isAvailable) return
    // Runs after this try/catch returned, so it handles its own failure.
    const accept = async (): Promise<void> => {
      try {
        await deps.fetchUpdate()
        await deps.reload()
      } catch {
        deps.failed(accept)
      }
    }
    deps.prompt(accept)
  } catch {
    // Offline or the update server is down: try again on the next check.
  }
}

const t = createTranslator({ locale: 'en', messages, namespace: 'updates' })

const liveDeps: OtaDeps = {
  isEnabled: Updates.isEnabled && !__DEV__,
  checkForUpdate: () => Updates.checkForUpdateAsync(),
  fetchUpdate: () => Updates.fetchUpdateAsync(),
  reload: () => Updates.reloadAsync(),
  prompt: (onAccept) =>
    toast(t('available'), {
      duration: Number.POSITIVE_INFINITY,
      action: { label: t('update'), onClick: () => void onAccept() },
    }),
  failed: (retry) =>
    toast.error(t('failed'), {
      action: { label: t('retry'), onClick: () => void retry() },
    }),
  now: () => Date.now(),
}

export function useOtaUpdates(): void {
  useEffect(() => {
    void checkForOtaUpdate(liveDeps)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForOtaUpdate(liveDeps)
    })
    return () => sub.remove()
  }, [])
}
