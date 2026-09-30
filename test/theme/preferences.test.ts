import { readThemePreference, writeThemePreference } from '@/theme/preferences'

describe('theme preference', () => {
  it('defaults to system', () => {
    expect(readThemePreference()).toBe('system')
  })

  it('round-trips a written preference', () => {
    writeThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
    writeThemePreference('system')
    expect(readThemePreference()).toBe('system')
  })
})
