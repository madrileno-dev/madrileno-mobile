import { Redirect, Stack } from 'expo-router'
import { consumeReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AuthLayout() {
  const { tokens, isHydrated } = useAuth()
  if (isHydrated && tokens !== null) return <Redirect href={consumeReturnTo() ?? '/'} />
  return <Stack screenOptions={{ headerShown: false }} />
}
