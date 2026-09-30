import { NAV_THEME } from '@/theme/navTheme'

describe('NAV_THEME', () => {
  it('dark theme uses the dark tokens', () => {
    expect(NAV_THEME.dark.dark).toBe(true)
    expect(NAV_THEME.dark.colors.background).toBe('hsl(0 0% 3.9%)')
    expect(NAV_THEME.dark.colors.card).toBe('hsl(0 0% 9%)')
  })

  it('light theme uses the light tokens', () => {
    expect(NAV_THEME.light.dark).toBe(false)
    expect(NAV_THEME.light.colors.background).toBe('hsl(0 0% 100%)')
    expect(NAV_THEME.light.colors.card).toBe('hsl(0 0% 100%)')
  })
})
