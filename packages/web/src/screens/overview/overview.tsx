import type { Schemas } from '@manifest/contract'
import { Button, StateChip, type FactTone, type State } from '@manifest-app/ui'
import { useCallback, useEffect, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, TABS, type Tab } from '../../router.js'
import { words } from '../../words.js'
import { clocksUnmet } from '../going-live/checklist.js'
import { releasesToRead, servingFact, type Said } from '../preview/facts.js'
import { KIND } from '../preview/preview.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { asServed, audienceWords, beforeLaunch } from '../your-apps/model.js'
import { Band } from './band.js'
import { ForYourStudents, handOver, type Handed } from './students.js'

const w = words.overview

/** A serving fact's tint as one of the five states: nothing there is not yet. */
const STATE: Record<FactTone, State> = {
  steady: 'steady',
  working: 'working',
  attention: 'attention',
  neutral: 'notyet',
}

type Seen = {
  /** One row per address: the Preview's tab, and F4's serving fact. */
  rows: { tab: Tab; serving: Said }[]
  /** Moment 10's band (Decision 3). */
  band: boolean
  /** Moment 15, once the app has launched (Task 9): what leads the page. */
  handed: Handed | null
}
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; seen: Seen }

/**
 * THE OVERVIEW'S READS, IN THE PERSON'S SESSION: the app's addresses and the versions that date
 * them (F4's serving facts), and, only for an app built and not launched, its checklist, for
 * the band. A version or a checklist that cannot be read loses its date or the band, not the
 * page; a session that ended anywhere is the shell's to say. **Once launched, the hand-over's
 * reads** (Task 9). Launched is the project's `launchedAt` **or the checklist's own `launched`**:
 * the App reads the project once per slug, so a launch since (in another tab, or F5's own press)
 * would otherwise leave the band up and the hand-over away until a reload (sitting 3's carried
 * minor).
 */
async function read(
  platform: Platform,
  ours: Ours,
  project: Schemas['Project'],
  now: Date,
  timeZone: string | undefined,
): Promise<Seen> {
  const environments = await platform.listEnvironments(project.id)
  const of = (tab: Tab) => environments.find((e) => e.kind === KIND[tab])
  const asks = beforeLaunch(project, of('draft'))
  const [releases, checklist] = await Promise.all([
    Promise.allSettled(
      [...new Set(environments.flatMap(releasesToRead))].map((id) =>
        platform.getRelease(id),
      ),
    ),
    Promise.allSettled(asks ? [platform.getLaunchReadiness(project.id)] : []),
  ])
  for (const r of [...releases, ...checklist])
    if (r.status === 'rejected') {
      const refusal = refusalOf(r.reason)
      if (refusal.kind === 'signed-out') throw r.reason
      if (refusal.kind === 'refused')
        console.warn(`Manifest refused a read: ${refusal.code} (${refusal.status})`)
    }
  const byId = new Map(
    releases.flatMap((r) =>
      r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [],
    ),
  )
  const answered = checklist[0]
  const readiness = answered?.status === 'fulfilled' ? answered.value : undefined
  const launched = (project.launchedAt ?? null) !== null || readiness?.launched === true
  const students = of('students')
  const serving = (env: Schemas['Environment']) =>
    env.instance === null ? undefined : byId.get(env.instance.releaseId)
  return {
    rows: TABS.flatMap((tab) => {
      const found = of(tab)
      if (found === undefined) return []
      // Before a launch, a dry run's instance taken down again is nothing there (the platform's 5b).
      const env = asServed(found, launched)
      return [{ tab, serving: servingFact(env, serving(env), timeZone) }]
    }),
    band: !launched && readiness !== undefined && clocksUnmet(readiness),
    handed: launched
      ? await handOver(
          platform,
          ours,
          project,
          students,
          students === undefined ? undefined : serving(students),
          now,
          timeZone,
        )
      : null,
  }
}

/**
 * THE APP'S OVERVIEW, ITS LANDING PAGE (F5 Task 5, Decision 1): who it is for, one row per
 * address that opens its tab, *[Ask for a change]*, and moment 10's band. Once it has launched,
 * *For your students* leads (moment 15, Task 9: the address handed over). Nothing of moment
 * 16's: F6.
 */
export function Overview({
  platform,
  ours,
  project,
  expire,
  now = () => new Date(),
  timeZone,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
  now?: () => Date
  timeZone?: string | undefined
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    read(platform, ours, project, now(), timeZone).then(
      (seen) => live && setLoaded({ state: 'ready', seen }),
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') expire()
        else setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      live = false
    }
    // `now` is a clock, read once per attempt: never a reason to read again.
  }, [platform, ours, project, timeZone, expire, attempt])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const slug = encodeURIComponent(project.slug)
  const audience = audienceWords(project.audience)
  return (
    <div className="overview">
      <h1 className="page-title">{project.name}</h1>
      {audience === '' ? null : (
        <p className="body-small overview__audience">{audience}</p>
      )}
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          {loaded.seen.handed === null ? null : (
            <ForYourStudents name={project.name} handed={loaded.seen.handed} />
          )}
          {loaded.seen.band ? <Band slug={project.slug} /> : null}
          <ul className="overview__addresses" aria-label={w.addresses}>
            {loaded.seen.rows.map(({ tab, serving }) => (
              <li key={tab} className="overview__address">
                <a
                  className="overview__tab"
                  {...linkTo(`/apps/${slug}/preview?tab=${tab}`)}
                >
                  {words.preview.tabs[tab]}
                </a>
                <StateChip state={STATE[serving.tone]} label={serving.words} />
              </li>
            ))}
          </ul>
          <div className="overview__change">
            <Button kind="secondary" {...linkTo(`/apps/${slug}/change`)}>
              {words.preview.askForChange}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
