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

  // The only place the preference reaches the color scheme. Keyed on the
  // preference alone: nativewind's hook returns a fresh object every render,
  // and re-applying on each render ping-pongs with Appearance change events.
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
