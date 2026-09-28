/**
 * THE ONLY FILE THAT NAMES AN `/auth/` PATH (the boundary test). Signing in and out are the
 * browser's and the IdP's business, outside `/v1` (D23.8), as in the console's auth.ts.
 */

/** Where Continue with CWL goes. `returnTo` is a same-origin path; the platform re-checks it. */
export function signInHref(returnTo: string): string {
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function signIn(returnTo: string = location.pathname + location.search): void {
  window.location.href = signInHref(returnTo)
}

/**
 * Ends the session, Manifest's and CWL's, and leaves the page. The console's assertions,
 * copied: it must answer `200` with a `redirectTo` that is a same-origin path or an `https:`
 * URL, or we have NOT signed out, and we say so rather than reload into a live session.
 * `go` is the navigation, a parameter so a test can see where it would have gone.
 */
export async function signOut(
  go: (url: string) => void = (url) => {
    window.location.href = url
  },
  origin: string = globalThis.location?.origin ?? 'http://localhost',
): Promise<void> {
  const response = await fetch('/auth/logout', { method: 'POST' })
  if (response.status !== 200)
    throw new Error(`POST /auth/logout answered ${response.status}, not 200`)
  let redirectTo: unknown
  try {
    redirectTo = ((await response.json()) as { redirectTo?: unknown }).redirectTo
  } catch {
    redirectTo = undefined
  }
  if (typeof redirectTo !== 'string' || !safeDestination(redirectTo, origin))
    throw new Error('POST /auth/logout did not say where to go next')
  go(redirectTo)
}

/**
 * Where a sign-out may send the page, parsed as the browser will parse it, not matched as
 * text (the final review's deferred minor):
 * - written as a path, it must land on THIS origin. `//evil.example`, `/\\evil.example` and a
 *   tab-split `/\t/evil.example` all read as another host;
 * - written out in full, it must be `https:`: the IdP's single logout.
 */
function safeDestination(redirectTo: string, origin: string): boolean {
  let url: URL
  try {
    url = new URL(redirectTo, origin)
  } catch {
    return false
  }
  if (redirectTo.startsWith('/')) return url.origin === origin
  return /^https:\/\//i.test(redirectTo) && url.protocol === 'https:'
}
