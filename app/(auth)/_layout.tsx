import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { consumeReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AuthLayout() {
  const { tokens, isHydrated } = useAuth()
  const router = useRouter()
  // Not <Redirect>: it re-navigates on every render, and the one-shot
  // consumeReturnTo() would send the second navigation to '/'.
  const navigated = useRef(false)

  useEffect(() => {
    if (isHydrated && tokens !== null && !navigated.current) {
      navigated.current = true
      router.replace(consumeReturnTo() ?? '/')
    }
  }, [isHydrated, tokens, router])

  if (isHydrated && tokens !== null) return null
  return <Stack screenOptions={{ headerShown: false }} />
}
