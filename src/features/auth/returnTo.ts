import type { Href } from 'expo-router'

// Post-login target after a cold deep link or an involuntary logout. Memory only.
let href: Href | null = null

// Swallows the gate's capture after a deliberate logout.
let suppressNext = false

export function setReturnTo(pathname: string): void {
  if (suppressNext) {
    suppressNext = false
    return
  }
  if (pathname === '/login' || pathname.startsWith('/login?')) return
  // From usePathname(), so a route by construction.
  href = pathname as Href
}

export function consumeReturnTo(): Href | null {
  const next = href
  href = null
  suppressNext = false
  return next
}

export function forgetReturnTo(): void {
  href = null
  suppressNext = true
}
