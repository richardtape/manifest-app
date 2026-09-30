import type { Schemas } from '@manifest/contract'
import { ClockItem } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { versionAsked } from '../trying-out/stations.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { rowsOf, type Row } from './checklist.js'
import { clockOf, type Clock } from './clocks.js'
import { DryRun } from './dry-run.js'
import { RowView } from './row.js'

const g = words.goingLive

type Seen = {
  /** "18 September, 3:12pm"; null when its date cannot be read; undefined when nothing is on trying-out. */
  version: string | null | undefined
  clocks: [Clock, Clock]
  rows: Row[]
}
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; seen: Seen }

/** Warn of a refusal for whoever is looking; a session that ended is the shell's (thrown). */
function settle<T>(result: PromiseSettledResult<T>): T | undefined {
  if (result.status === 'fulfilled') return result.value
  const refusal = refusalOf(result.reason)
  if (refusal.kind === 'signed-out') throw result.reason
  if (refusal.kind === 'refused')
    console.warn(`Manifest refused a read: ${refusal.code} (${refusal.status})`)
  return undefined
}

/**
 * GOING LIVE'S READS, IN THE PERSON'S SESSION (Decision 16): the checklist and the two records,
 * which the page cannot stand without; then the candidate's date and the students' address,
 * which only date a sentence or fill one in. No event stream in F5.
 */
async function read(
  platform: Platform,
  project: Schemas['Project'],
  now: Date,
  timeZone: string | undefined,
): Promise<Seen> {
  const [readiness, records, [environments]] = await Promise.all([
    platform.getLaunchReadiness(project.id),
    platform.getLaunchRecords(project.id),
    Promise.allSettled([platform.listEnvironments(project.id)]),
  ])
  let version: string | null | undefined
  if (readiness.candidateReleaseId !== null) {
    const [candidate] = await Promise.allSettled([
      platform.getRelease(readiness.candidateReleaseId),
    ])
    const release = settle(candidate!)
    // "the version from 18 September, 3:12pm" → "18 September, 3:12pm"; undated → null.
    const asked =
      release === undefined ? '' : versionAsked(release.createdAt, now, timeZone)
    const from = `${words.facts.versionFrom} `
    version = asked.startsWith(from) ? asked.slice(from.length) : null
  }
  const production = settle(environments!)?.find((e) => e.kind === 'production')
  const item = (id: string) => readiness.items.find((i) => i.id === id)
  return {
    version,
    // Each card reads its record and its checklist item: never "Done" while the item is unmet.
    clocks: [
      clockOf(
        'registration',
        records.iamRegistration,
        now,
        timeZone,
        item('iam-registration'),
      ),
      clockOf(
        'assessment',
        records.privacyAssessment,
        now,
        timeZone,
        item('privacy-assessment'),
      ),
    ],
    rows: rowsOf(readiness, { hostname: production?.hostname ?? null }),
  }
}

/**
 * GOING LIVE, MOMENTS 10 AND 11 (F5 Task 6): what stands between the app and its students, from
 * the day the draft exists. The version that would go live; the two clocks; the trying-out
 * address's registration in one line; the short jobs, each in our words. A map: nothing on it is
 * theirs to press yet, and nothing is a stopgap. Read again whenever the page is shown again.
 */
export function GoingLive({
  platform,
  project,
  expire,
  now = () => new Date(),
  timeZone,
}: {
  platform: Platform
  project: Schemas['Project']
  expire: () => void
  now?: () => Date
  timeZone?: string | undefined
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const launched = (project.launchedAt ?? null) !== null

  useEffect(() => {
    if (launched) return
    let live = true
    read(platform, project, now(), timeZone).then(
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
  }, [platform, project, timeZone, expire, attempt, launched])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  // SHOWN AGAIN, READ AGAIN (Decision 16): an administrator records things while they are away.
  // Quietly: what is on the page stays until the new reading answers.
  useEffect(() => {
    const shown = () => {
      if (document.visibilityState === 'visible') setAttempt((n) => n + 1)
    }
    document.addEventListener('visibilitychange', shown)
    return () => document.removeEventListener('visibilitychange', shown)
  }, [])

  const slug = encodeURIComponent(project.slug)
  const tryingOut = `/apps/${slug}/preview?tab=trying-out`
  return (
    <div className="going-live">
      <h1 className="page-title">{g.title}</h1>
      {launched ? (
        // Decision 2: after launch the page stays, says so, and points at the Overview.
        <p className="body-lead">
          {g.live} <a {...linkTo(`/apps/${slug}`)}>{g.toOverview}</a>
        </p>
      ) : (
        <p className="body-lead">{g.lead}</p>
      )}
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {!launched && loaded.state === 'ready' ? (
        <WhatStands seen={loaded.seen} tryingOut={tryingOut} />
      ) : null}
    </div>
  )
}

/** What stands between the app and its students: the version, the clocks, the short jobs. */
function WhatStands({ seen, tryingOut }: { seen: Seen; tryingOut: string }) {
  const id = useId()
  return (
    <>
      {seen.version === undefined ? (
        <p className="body-lead">
          {g.noVersion} <a {...linkTo(tryingOut)}>{g.toTryingOut}</a>
        </p>
      ) : (
        <p className="body-lead">{g.version(seen.version)}</p>
      )}
      <div className="going-live__clocks">
        {seen.clocks.map((clock) => (
          <ClockItem
            key={clock.which}
            title={g.clocks[clock.which].title}
            body={g.clocks[clock.which].body}
            state={clock.state}
            chip={clock.chip}
            clockLabel={clock.label}
            clockMeta={clock.meta}
            {...(clock.admission
              ? {
                  admissionTitle: g.clocks.admission.title,
                  admissionBody: g.clocks.admission.body,
                }
              : {})}
          />
        ))}
      </div>
      <p className="going-live__staging">
        {g.staging} <a {...linkTo(tryingOut)}>{g.seeTryingOut}</a>
      </p>
      <section className="going-live__jobs" aria-labelledby={id}>
        <h2 id={id} className="heading">
          {g.shortJobs.title}
        </h2>
        <p className="body-small going-live__jobs-lead">{g.shortJobs.lead}</p>
        <ul className="going-live__rows">
          {seen.rows
            .filter((row) => !row.apart)
            .map((row) => (
              <ShortJob key={row.id} row={row} />
            ))}
        </ul>
        <ul className="going-live__rows going-live__apart">
          {seen.rows
            .filter((row) => row.apart)
            .map((row) => (
              <ShortJob key={row.id} row={row} />
            ))}
        </ul>
      </section>
    </>
  )
}

/** One short job, drawn by its own component where it has one (the dry run's: Task 7). */
function ShortJob({ row }: { row: Row }) {
  return row.id === 'rehearsal' ? <DryRun row={row} /> : <RowView row={row} />
}
