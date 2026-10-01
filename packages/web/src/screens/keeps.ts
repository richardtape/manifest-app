import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useState } from 'react'
import type { Platform } from '../platform/api.js'
import { refusalOf } from '../platform/refusal.js'
import type { Trouble } from './trouble.js'
import { mine } from './your-apps/model.js'

/**
 * D7 (Rich, 2026-09-29): SOMEONE WHO MAY NOT BUILD KEEPS THE APPS THEY HAVE, and starts nothing
 * new. Whether they keep any is one `listProjects`, as *Your apps* reads it; someone who may build
 * is never asked it here.
 */
export type Keeps =
  | { state: 'builds' }
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'some' }
  | { state: 'trouble'; trouble: Trouble; retry: () => void }

const BUILDS: Keeps = { state: 'builds' }
const LOADING: Keeps = { state: 'loading' }

export function useKeeps(
  platform: Platform,
  me: Schemas['Me'] | undefined,
  expire: () => void,
): Keeps {
  const may = me === undefined || me.mayBuild !== false
  // Whose answer this is: on the render a person who may not build arrives, nothing has been
  // asked for them yet, and that is `loading`, never a builder's page drawn for a moment.
  const [kept, setKept] = useState<{ me: Schemas['Me'] | undefined; keeps: Keeps }>({
    me: undefined,
    keeps: LOADING,
  })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  useEffect(() => {
    if (may || me === undefined) return
    let live = true
    setKept({ me, keeps: LOADING })
    platform.listProjects().then(
      (projects) =>
        live &&
        setKept({
          me,
          keeps: { state: mine(projects, me).length > 0 ? 'some' : 'none' },
        }),
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        // Their session ended while we looked: the shell says so, and this stays unknown.
        if (refusal.kind === 'signed-out') return expire()
        setKept({ me, keeps: { state: 'trouble', trouble: refusal, retry } })
      },
    )
    return () => {
      live = false
    }
  }, [platform, me, may, expire, attempt, retry])
  if (may) return BUILDS
  return kept.me === me ? kept.keeps : LOADING
}
