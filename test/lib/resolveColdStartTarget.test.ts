import { resolveColdStartTarget } from '@/lib/resolveColdStartTarget'

describe('resolveColdStartTarget', () => {
  it('maps a custom-scheme host-only deep link to its route', () => {
    expect(resolveColdStartTarget('madrileno://settings', 'madrileno')).toBe('/settings')
  })

  it('maps a custom-scheme deep link with a path to its route', () => {
    expect(resolveColdStartTarget('madrileno://auctions/abc', 'madrileno')).toBe('/auctions/abc')
  })

  it('does not correct a bare scheme with no host', () => {
    expect(resolveColdStartTarget('madrileno://', 'madrileno')).toBeNull()
  })

  it('does not correct an https universal link', () => {
    expect(resolveColdStartTarget('https://madrileno.dev/auctions/abc', 'madrileno')).toBeNull()
  })

  it('does not correct when there is no initial URL', () => {
    expect(resolveColdStartTarget(null, 'madrileno')).toBeNull()
  })

  it('does not correct the dev client bootstrap link', () => {
    expect(
      resolveColdStartTarget(
        'madrileno://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
        'madrileno',
      ),
    ).toBeNull()
  })
})
