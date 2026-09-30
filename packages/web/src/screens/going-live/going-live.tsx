import type { Schemas } from '@manifest/contract'
import { ClockItem } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, remember } from '../../router.js'
import { words } from '../../words.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { rowsOf, type Row } from './checklist.js'
import { clockOf, type Clock } from './clocks.js'
import { DryRun } from './dry-run.js'
import { LetStudentsIn, whenOf } from './live.js'
import { RowView } from './row.js'
import { SignOff, type Decided } from './sign-off.js'

const g = words.goingLive

type Seen = {
  /** "18 September, 3:12pm"; null when its date cannot be read; undefined when nothing is on trying-out. */
  version: string | null | undefined
  clocks: [Clock, Clock]
  rows: Row[]
  /** The candidate's sign-off, for *[Talk it through]*'s words (Task 8). */
  decided: Decided
  /**
   * The checklist's own word that the app has launched: the App reads the project once per slug,
   * so a launch since (another tab; Task 10's press) is known here first (sitting 3's minor).
   */
  launched: boolean
  /** Every blocking item met: *[Let your students in]* (Task 10). */
  ready: boolean
  /** What would go live, and its day, as this reading has it. */
  candidate: { releaseId: string; when: string | null } | null
  /** The live address, when the addresses could be read. */
  production: Schemas['Environment'] | undefined
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
 * which the page cannot stand without; then the candidate's date, its sign-off (Task 8) and the
 * students' address, which date a sentence, decide one row, or fill one in. Each read again
 * names the candidate of that reading, so a version changed on trying-out reads its own sign-off.
 * No event stream in F5.
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
  // Nothing on trying-out: nothing to sign off, and nobody has decided.
  let decided: Decided = null
  if (readiness.candidateReleaseId !== null) {
    const [candidate, approval] = await Promise.allSettled([
      platform.getRelease(readiness.candidateReleaseId),
      platform.getApproval(readiness.candidateReleaseId),
    ])
    if (approval!.status === 'fulfilled') decided = approval!.value
    else {
      settle(approval!)
      decided = 'unread'
    }
    const release = settle(candidate!)
    // "the version from 18 September, 3:12pm" → "18 September, 3:12pm"; undated → null.
    version = release === undefined ? null : whenOf(release.createdAt, now, timeZone)
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
    rows: rowsOf(readiness, {
      hostname: production?.hostname ?? null,
      approval: decided,
      timeZone,
    }),
    decided,
    launched: readiness.launched,
    ready: readiness.ready,
    candidate:
      readiness.candidateReleaseId === null
        ? null
        : { releaseId: readiness.candidateReleaseId, when: version ?? null },
    production,
  }
}

/**
 * THE CHANGED ROW LIT (moment 14): a row whose state or sentence differs from the reading before
 * the gate refused a press. A row new to this reading is lit too.
 */
function lightUp(rows: Row[], before: Row[]): Row[] {
  return rows.map((row) => {
    const was = before.find((b) => b.id === row.id)
    return was === undefined || was.state !== row.state || was.words !== row.words
      ? { ...row, lit: true }
      : row
  })
}

/**
 * GOING LIVE, MOMENTS 10, 11 AND 14 (F5 Tasks 6 and 10): what stands between the app and its
 * students, from the day the draft exists. The version that would go live; the two clocks; the
 * trying-out address's registration in one line; the short jobs, each in our words; and, once
 * every blocking item is met, *[Let your students in]*. Nothing else is a stopgap. Read again
 * whenever the page is shown again.
 */
export function GoingLive({
  platform,
  ours,
  project,
  expire,
  now = () => new Date(),
  timeZone,
  then = null,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
  now?: () => Date
  timeZone?: string | undefined
  /** `live` when the step-up sent them back to finish letting their students in (Decision 10). */
  then?: 'live' | null
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // BACK FROM SIGNING IN AGAIN: said once, and `then` taken out of the address without a
  // navigation (the focus stays put), so a reload is not "back" again.
  const [back] = useState(then === 'live')
  useEffect(() => {
    if (back) remember(`/apps/${encodeURIComponent(project.slug)}/going-live`)
  }, [back, project.slug])
  // PRESSED IN THIS PAGE: the card that let them in stays, whatever the page reads meanwhile,
  // until it ends in its own words (a launch heard mid-press never unmounts it).
  const [pressed, setPressed] = useState(false)
  // THE GATE REFUSED A PRESS: the rows as they were, to light the one that changed.
  const [gate, setGate] = useState<Row[] | null>(null)
  // LAUNCHED, BY THE PROJECT OR BY THE CHECKLIST, AND KEPT: the App reads the project once per
  // slug, so a launch since is heard here first; once heard it stays said (a launch is not undone
  // in F5), and nothing more is read, so a later read that fails can never turn it back.
  const [heard, setHeard] = useState(false)
  const launched = (project.launchedAt ?? null) !== null || heard

  useEffect(() => {
    if (launched) return
    let live = true
    read(platform, project, now(), timeZone).then(
      (seen) => {
        if (!live) return
        if (seen.launched) setHeard(true)
        setLoaded({ state: 'ready', seen })
      },
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

  // Seen now, for a handler that outlives a render.
  const seenNow = useRef<Seen | undefined>(undefined)
  seenNow.current = loaded.state === 'ready' ? loaded.seen : undefined
  const onGate = useCallback(() => {
    const seen = seenNow.current
    setPressed(false)
    setGate(seen?.rows ?? [])
    // The gate said it is not ready: no button while the checklist is read again.
    setLoaded((l) =>
      l.state === 'ready' ? { state: 'ready', seen: { ...l.seen, ready: false } } : l,
    )
    setAttempt((n) => n + 1)
  }, [])
  const onPress = useCallback(() => {
    setPressed(true)
    setGate(null)
  }, [])
  const onLanded = useCallback(() => setHeard(true), [])

  const slug = encodeURIComponent(project.slug)
  const tryingOut = `/apps/${slug}/preview?tab=trying-out`
  const seen =
    loaded.state === 'ready'
      ? gate === null
        ? loaded.seen
        : { ...loaded.seen, rows: lightUp(loaded.seen.rows, gate) }
      : undefined
  const production = seen?.production
  // The card: once pressed it stays to its end; otherwise only on a first launch that is ready.
  const offer =
    production !== undefined &&
    seen !== undefined &&
    (pressed || (!launched && seen.ready))
  return (
    <div className="going-live">
      <h1 className="page-title">{g.title}</h1>
      {launched && !pressed ? (
        // Decision 2: after launch the page stays, says so, and points at the Overview.
        <p className="body-lead">
          {g.live} <a {...linkTo(`/apps/${slug}`)}>{g.toOverview}</a>
        </p>
      ) : launched || loaded.state === 'loading' ? null : ( // Nothing said until it is read: it may turn out launched (no first launch's lead).
        <p className="body-lead">{g.lead}</p>
      )}
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {gate !== null && !launched ? (
        <p className="body-lead going-live__gate" role="status">
          {g.letIn.gate}
        </p>
      ) : null}
      {offer ? (
        <LetStudentsIn
          platform={platform}
          ours={ours}
          project={project}
          ready={seen.ready}
          candidate={seen.candidate}
          production={production}
          back={back}
          expire={expire}
          now={now}
          timeZone={timeZone}
          onPress={onPress}
          onGate={onGate}
          onLanded={onLanded}
        />
      ) : null}
      {!launched && seen !== undefined ? (
        <WhatStands
          seen={seen}
          tryingOut={tryingOut}
          job={(row) =>
            row.id === 'rehearsal' ? (
              <DryRun key={row.id} row={row} />
            ) : row.id === 'admin-approval' ? (
              <SignOff
                key={row.id}
                row={row}
                decided={seen.decided}
                platform={platform}
                ours={ours}
                project={project}
                expire={expire}
              />
            ) : (
              <RowView key={row.id} row={row} />
            )
          }
        />
      ) : null}
    </div>
  )
}

/**
 * What stands between the app and its students: the version, the clocks, the short jobs, each
 * drawn by its own component where it has one (the dry run's, Task 7; the sign-off's, Task 8).
 */
function WhatStands({
  seen,
  tryingOut,
  job,
}: {
  seen: Seen
  tryingOut: string
  job: (row: Row) => ReactNode
}) {
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
          {seen.rows.filter((row) => !row.apart).map(job)}
        </ul>
        <ul className="going-live__rows going-live__apart">
          {seen.rows.filter((row) => row.apart).map(job)}
        </ul>
      </section>
    </>
  )
}
