import type { Schemas } from '@manifest/contract'
import { Button, StateChip, type FactTone, type State } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, TABS, type Tab } from '../../router.js'
import { words } from '../../words.js'
import { clocksUnmet } from '../going-live/checklist.js'
import { releasesToRead, servingFact, type Said } from '../preview/facts.js'
import { KIND } from '../preview/preview.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { audienceWords, beforeLaunch } from '../your-apps/model.js'
import { Hostname } from '../your-apps/your-apps.js'
import { Band } from './band.js'

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
  /** The address students use, for the slot that leads once the app has launched. */
  students: Schemas['Environment'] | undefined
}
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; seen: Seen }

/**
 * THE OVERVIEW'S READS, IN THE PERSON'S SESSION: the app's addresses and the versions that date
 * them (F4's serving facts), and, only for an app built and not launched, its checklist, for
 * the band. A version or a checklist that cannot be read loses its date or the band, not the
 * page; a session that ended anywhere is the shell's to say.
 */
async function read(
  platform: Platform,
  project: Schemas['Project'],
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
  return {
    rows: TABS.flatMap((tab) => {
      const env = of(tab)
      if (env === undefined) return []
      const release = env.instance === null ? undefined : byId.get(env.instance.releaseId)
      return [{ tab, serving: servingFact(env, release, timeZone) }]
    }),
    band: answered?.status === 'fulfilled' && clocksUnmet(answered.value),
    students: of('students'),
  }
}

/**
 * THE APP'S OVERVIEW, ITS LANDING PAGE (F5 Task 5, Decision 1): who it is for, one row per
 * address that opens its tab, *[Ask for a change]*, and moment 10's band. Once it has launched,
 * *For your students* leads (moment 15, Task 9). Nothing of moment 16's: F6.
 */
export function Overview({
  platform,
  project,
  expire,
  timeZone,
}: {
  platform: Platform
  project: Schemas['Project']
  expire: () => void
  timeZone?: string | undefined
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    read(platform, project, timeZone).then(
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
  }, [platform, project, timeZone, expire, attempt])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const slug = encodeURIComponent(project.slug)
  const audience = audienceWords(project.audience)
  const launched = (project.launchedAt ?? null) !== null
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
          {launched ? <ForYourStudents address={loaded.seen.students} /> : null}
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

/**
 * MOMENT 15'S SLOT: once the app has launched, the address students use leads the page. Task 9
 * hands it over (the address large, *[Copy]*, the message to send them).
 */
function ForYourStudents({ address }: { address: Schemas['Environment'] | undefined }) {
  const id = useId()
  return (
    <section className="overview__students" aria-labelledby={id}>
      <h2 id={id} className="heading">
        {words.preview.tabs.students}
      </h2>
      {address === undefined ? null : (
        <p className="mono">
          <Hostname name={address.hostname} />
        </p>
      )}
    </section>
  )
}
