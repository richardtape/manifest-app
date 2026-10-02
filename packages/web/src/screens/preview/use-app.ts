import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import type { Trouble } from '../trouble.js'

export type AppLookup =
  | { state: 'none' }
  | { state: 'loading' }
  | { state: 'found'; project: Schemas['Project'] }
  | { state: 'missing' }
  | { state: 'trouble'; trouble: Trouble }

/**
 * AN APP BY ITS ADDRESS (F4 Task 5, Decision 2): `listProjects`, in the person's session, and the
 * one whose slug the page names. The shell asks once per slug, for the rail's project section and
 * for the app's pages. A session that ended is the shell's to say. **`refresh`** (F6 Task 11) reads
 * it again with the page left standing: switched off or back on, the page keeps what it says.
 */
export function useApp(
  platform: Platform,
  slug: string | undefined,
  expire: () => void,
): { lookup: AppLookup; retry: () => void; refresh: () => void } {
  const [lookup, setLookup] = useState<AppLookup>({ state: 'none' })
  const [attempt, setAttempt] = useState(0)
  // A refresh keeps the app found until the new reading answers; a retry starts again.
  const quiet = useRef(false)

  useEffect(() => {
    if (slug === undefined) {
      setLookup({ state: 'none' })
      return
    }
    let live = true
    if (!quiet.current) setLookup({ state: 'loading' })
    quiet.current = false
    platform.listProjects().then(
      (projects) => {
        if (!live) return
        const project = projects.find((p) => p.slug === slug)
        setLookup(
          project === undefined ? { state: 'missing' } : { state: 'found', project },
        )
      },
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') expire()
        else setLookup({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      live = false
    }
  }, [platform, slug, expire, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const refresh = useCallback(() => {
    quiet.current = true
    setAttempt((n) => n + 1)
  }, [])
  return { lookup, retry, refresh }
}
