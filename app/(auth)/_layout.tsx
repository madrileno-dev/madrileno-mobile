import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { consumeReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AuthLayout() {
  const { tokens, isHydrated } = useAuth()
  const router = useRouter()
  // A declarative <Redirect> re-runs its navigation on every re-render (its
  // href feeds an unmemoized useFocusEffect closure), and consumeReturnTo()
  // is one-shot: a second render while authenticated would get null and
  // replace the first, correct navigation with "/". Navigate imperatively
  // instead, in our own effect, guarded so it runs at most once per mount —
  // whether authentication was already true on the first render (e.g. the
  // user navigated to /login while logged in) or became true later (login).
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
