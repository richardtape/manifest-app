import { PLATFORM_TIMEOUT_MS } from './refusal.js'

/**
 * WHETHER A DRAFT'S SIGN-IN STARTS (FE-37, found by Rich's click, 2026-09-28): every app Manifest
 * builds is behind CWL, and the IdP refused every draft's sign-in while the round said "It started
 * and answered." Our server follows the app's `/login` (the blueprint's route) to the IdP, and the
 * IdP's FIRST answer says whether it took the request: a 5xx is a refusal ("no signature found on
 * message"); anything else, its cookie redirect or its form, took it. It never signs in (FE-3):
 * nothing tells us who a pretend person is.
 *
 * `unknown` when it cannot judge (no redirect from `/login`, or our own fetch failing), which never
 * holds a round: only the IdP's own refusal does.
 */
export type SignInStart = 'ok' | 'refused' | 'unknown'

export interface SignIn {
  starts(url: string): Promise<SignInStart>
}

export async function signInStarts(
  url: string,
  timeoutMs = PLATFORM_TIMEOUT_MS,
): Promise<SignInStart> {
  try {
    const login = await fetch(`${url.replace(/\/+$/, '')}/login`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const to = login.headers.get('location')
    if (login.status < 300 || login.status >= 400 || to === null) return 'unknown'
    const idp = await fetch(new URL(to, url), {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    })
    return idp.status >= 500 ? 'refused' : 'ok'
  } catch {
    return 'unknown'
  }
}

export const platformSignIn = (): SignIn => ({ starts: (url) => signInStarts(url) })
