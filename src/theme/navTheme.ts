import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'

// Mirrors the HSL token values in global.css. If those change, update the
// matching entry here too.
export const NAV_THEME: { light: Theme; dark: Theme } = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'hsl(0 0% 100%)',
      card: 'hsl(0 0% 100%)',
      text: 'hsl(0 0% 3.9%)',
      border: 'hsl(0 0% 89.8%)',
      primary: 'hsl(349 49% 31%)',
      notification: 'hsl(0 84.2% 60.2%)',
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'hsl(0 0% 3.9%)',
      card: 'hsl(0 0% 9%)',
      text: 'hsl(0 0% 98%)',
      border: 'hsl(0 0% 14.9%)',
      primary: 'hsl(350 42% 70%)',
      notification: 'hsl(0 70.9% 59.4%)',
    },
  },
}
