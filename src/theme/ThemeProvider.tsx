import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useThemePreference } from './useThemePreference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolved } = useThemePreference()
  return (
    <View className="flex-1 bg-background">
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  )
}
