import { ThemeProvider as NavigationThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { NAV_THEME } from './navTheme'
import { useThemePreference } from './useThemePreference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolved } = useThemePreference()
  return (
    <NavigationThemeProvider value={NAV_THEME[resolved]}>
      <View className="flex-1 bg-background">
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </NavigationThemeProvider>
  )
}
