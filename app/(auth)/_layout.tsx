import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/features/auth/useAuth'

export default function AuthLayout() {
  const { tokens, isHydrated } = useAuth()
  if (isHydrated && tokens !== null) return <Redirect href="/" />
  return <Stack screenOptions={{ headerShown: false }} />
}
