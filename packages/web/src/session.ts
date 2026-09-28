import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useState } from 'react'
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
  /** No answer we can use: nothing reached, or a refusal we do not know. */
  | { state: 'unreachable' }

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
      (error: unknown) =>
        live &&
        setSession(
          refusalOf(error).kind === 'signed-out'
            ? { state: 'signed-out' }
            : { state: 'unreachable' },
        ),
    )
    return () => {
      live = false
    }
  }, [platform, attempt])

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
