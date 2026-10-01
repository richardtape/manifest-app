import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useState } from 'react'
import { notOpen } from './not-open.js'
import type { Platform } from './platform/api.js'
import { refusalOf } from './platform/refusal.js'

/**
 * WHO IS HERE, read once from `getMe` (moment 1). `expired` keeps the person: the session
 * ended while the page was open, and the page behind the notice is not blanked (Review
 * Focus 1), so the rail still names them.
 */
export type Session =
  | { state: 'loading' }
  | { state: 'signed-in'; me: Schemas['Me'] }
  /** Never signed in, on this load. */
  | { state: 'signed-out' }
  /** WAS signed in on this page, then a read answered 401. */
  | { state: 'expired'; me: Schemas['Me'] }
  /** No answer: nothing reached, or our deadline passed (Review Focus 2). */
  | { state: 'unreachable' }
  /** An answer we do not name (Review Focus 5): its code, for the console. */
  | { state: 'refused'; code: string; status: number }

export function useSession(platform: Platform): {
  session: Session
  retry(): void
  expire(): void
} {
  const [session, setSession] = useState<Session>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    platform.getMe().then(
      (me) => live && setSession({ state: 'signed-in', me }),
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        setSession(
          refusal.kind === 'refused'
            ? { state: 'refused', code: refusal.code, status: refusal.status }
            : { state: refusal.kind },
        )
      },
    )
    return () => {
      live = false
    }
  }, [platform, attempt])

  // D7 (FE-39): a refusal met part-way reads who they are again (not-open.ts). The page stays as
  // it is until getMe answers: no `loading`, which would blank it.
  useEffect(() => {
    const again = () => setAttempt((n) => n + 1)
    notOpen.addEventListener('refused', again)
    return () => notOpen.removeEventListener('refused', again)
  }, [])

  const retry = useCallback(() => {
    setSession({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  const expire = useCallback(
    () =>
      setSession((s) => (s.state === 'signed-in' ? { state: 'expired', me: s.me } : s)),
    [],
  )
  return { session, retry, expire }
}
