import { ThemeProvider as NavigationThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { colorScheme, useColorScheme } from 'nativewind'
import { useEffect, type ReactNode } from 'react'
import { Appearance, View } from 'react-native'
import { NAV_THEME } from './navTheme'
import { useThemePreference } from './useThemePreference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference } = useThemePreference()
  const nativewindColorScheme = useColorScheme()

  // Keyed on the preference alone: nativewind's hook returns a new object every
  // render, and re-applying ping-pongs with Appearance events.
  useEffect(() => {
    colorScheme.set(preference)
  }, [preference])

  const resolved: 'light' | 'dark' =
    nativewindColorScheme.colorScheme ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
  return (
    <NavigationThemeProvider value={NAV_THEME[resolved]}>
      <View className="flex-1 bg-background">
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </NavigationThemeProvider>
  )
}
