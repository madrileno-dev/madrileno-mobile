import type { Href } from 'expo-router'

// Where to go after login when a deep link hit an authed route cold. Kept in
// memory only: it must not survive a restart.
let href: Href | null = null

export function setReturnTo(pathname: string): void {
  if (pathname === '/login' || pathname.startsWith('/login?')) return
  // The one cast at this boundary: the value comes from usePathname(), i.e.
  // from the router itself, so it is a route by construction. router.replace
  // requires a typed Href and a plain string would not typecheck.
  href = pathname as Href
}

export function consumeReturnTo(): Href | null {
  const next = href
  href = null
  return next
}
