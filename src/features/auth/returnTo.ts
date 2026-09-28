import type { Href } from 'expo-router'

// Where to go after login when a deep link hit an authed route cold, or a
// session was invalidated involuntarily (e.g. a rejected refresh). Kept in
// memory only: it must not survive a restart.
let href: Href | null = null

// Set by a deliberate logout so the (app) gate's next setReturnTo(pathname)
// call — fired as a side effect of the resulting null session — is ignored:
// a deliberate logout should send the next login to the auction list, not
// back to wherever the user logged out from.
let suppressNext = false

export function setReturnTo(pathname: string): void {
  if (suppressNext) {
    suppressNext = false
    return
  }
  if (pathname === '/login' || pathname.startsWith('/login?')) return
  // The one cast at this boundary: the value comes from usePathname(), i.e.
  // from the router itself, so it is a route by construction. router.replace
  // requires a typed Href and a plain string would not typecheck.
  href = pathname as Href
}

export function consumeReturnTo(): Href | null {
  const next = href
  href = null
  // A login has happened, so any suppression armed by the last logout is
  // spent; left armed it would swallow the next legitimate capture.
  suppressNext = false
  return next
}

export function forgetReturnTo(): void {
  href = null
  suppressNext = true
}
