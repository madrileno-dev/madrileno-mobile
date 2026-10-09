import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'

// Mirrors global.css.
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
      notification: 'hsl(357 100% 45.3%)',
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'hsl(0 0% 3.9%)',
      card: 'hsl(0 0% 9%)',
      text: 'hsl(0 0% 98%)',
      border: 'hsl(0 0% 13.5%)',
      primary: 'hsl(353 47.5% 69.7%)',
      notification: 'hsl(359 100% 69.6%)',
    },
  },
}
