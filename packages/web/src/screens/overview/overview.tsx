import type { Schemas } from '@manifest/contract'
import type { SinceLine } from '@manifest-app/server/progress'
import { Button, StateChip, type FactTone, type State } from '@manifest-app/ui'
import { useCallback, useEffect, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, remember, TABS, type Tab, type Then } from '../../router.js'
import { words } from '../../words.js'
import { clocksUnmet, rowsOf } from '../going-live/checklist.js'
import { HowWeKeepWatch } from '../keeping/how.js'
import { dayWords, needsStillTrue, type PageNeed } from '../keeping/lines.js'
import { NeedsBand } from '../keeping/needs.js'
import { Since } from '../keeping/since.js'
import { useRole } from '../keeping/role.js'
import { StartItAgain, WhatHappened } from '../keeping/start-again.js'
import { releasesToRead, servingFact, type Said } from '../preview/facts.js'
import { KIND } from '../preview/preview.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { asServed, audienceWords, beforeLaunch } from '../your-apps/model.js'
import { Band } from './band.js'
import { ForYourStudents, handOver, type Handed } from './students.js'
import { StartForStudents, SwitchBackOn, Switching } from './switching.js'

const w = words.overview
const k = words.keeping

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
  /** F6 Task 9: the page's own need, a Going live row theirs to do, before a launch. */
  goingLive: PageNeed[]
  /** Launched: *How we keep watch* is drawn (design §4). */
  launched: boolean
  /**
   * F6 Task 11: launched, and the students' address names a version taken down (`gone`): switched
   * back on and not running yet (S1: M4), so *Start it for your students* is offered.
   */
  studentsGone: boolean
}

/** F6 Task 9: our server's needs and lines for the app, each lost alone, never the page's wait. */
type Keeping = {
  needs: PageNeed[]
  since: { lastHere: string | null; lines: SinceLine[] }
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
  // F6 Task 11: switched off, or back and not started for them: the students' address shows the
  // switched-off page, so there is no address to hand over (found by sitting 6's walk).
  const studentsGone = launched && students?.instance?.state === 'gone'
  const running = project.state !== 'archived' && !studentsGone
  const serving = (env: Schemas['Environment']) =>
    env.instance === null ? undefined : byId.get(env.instance.releaseId)
  const app = {
    projectId: project.id,
    name: project.name ?? project.slug,
    slug: project.slug,
  }
  // The page's own (design §2, source 4): a Going live row theirs to do, before a launch.
  const goingLive: PageNeed[] =
    !launched &&
    readiness !== undefined &&
    rowsOf(readiness, { hostname: null }).some((row) => row.state === 'attention')
      ? [{ kind: 'going-live', app }]
      : []
  return {
    goingLive,
    launched,
    studentsGone,
    rows: TABS.flatMap((tab) => {
      const found = of(tab)
      if (found === undefined) return []
      // Before a launch, a dry run's instance taken down again is nothing there (the platform's 5b).
      const env = asServed(found, launched)
      return [{ tab, serving: servingFact(env, serving(env), timeZone) }]
    }),
    band: !launched && readiness !== undefined && clocksUnmet(readiness),
    handed:
      launched && running
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
  then = null,
  me,
  onChanged = () => undefined,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  expire: () => void
  now?: () => Date
  timeZone?: string | undefined
  /** Where the step-up sent them back to: one of F6's presses (Decision 10). */
  then?: Then
  /** Who is looking: an owner's buttons are an owner's alone (F6 Task 11). */
  me?: Pick<Schemas['Me'], 'id'> | undefined
  /** Switched off or back on: the shell reads the app again, the page left standing. */
  onChanged?: () => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // BACK FROM SIGNING IN AGAIN (F6 Decision 10): said once, by the press it was for, and `then`
  // taken out of the address without a navigation (the focus stays put), so a reload is not
  // "back" again.
  const [back] = useState(then)
  useEffect(() => {
    if (back !== null) remember(`/apps/${encodeURIComponent(project.slug)}`)
  }, [back, project.slug])
  // F6 TASK 11: owner or helper, for the switching buttons; and what the page keeps saying across
  // the shell's reading of the app again (switched off, back on, started for the students).
  const role = useRole(platform, project.id, me)
  const [untidy, setUntidy] = useState(false)
  const [restored, setRestored] = useState(false)
  const [startedForStudents, setStartedForStudents] = useState(false)
  // F6 TASK 9: our server's reads, on their own: a failure of ours loses the band or the lines,
  // and a slow answer never holds the page.
  const [keeping, setKeeping] = useState<Keeping | null>(null)
  // Read again when a press ends (Task 10), without losing the page or the press's own words.
  const [keepingAttempt, setKeepingAttempt] = useState(0)
  useEffect(() => {
    let live = true
    void Promise.allSettled([ours.needs(project.id), ours.since(project.id)]).then(
      ([needs, since]) =>
        live &&
        setKeeping({
          needs: needs.status === 'fulfilled' ? needs.value : [],
          since:
            since.status === 'fulfilled' ? since.value : { lastHere: null, lines: [] },
        }),
    )
    return () => {
      live = false
    }
    // Switched off or back on: a switched-off app's needs are its questions alone (the review's M1).
  }, [ours, project.id, project.state, attempt, keepingAttempt])

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
      {project.state === 'archived' ? (
        // SWITCHED OFF (moment 20): said to everyone; switched back on by an owner.
        <section className="overview__switched" aria-label={k.lines.switchedOff}>
          <p className="body-lead">
            {(project.archivedAt ?? null) === null
              ? k.lines.switchedOff
              : k.card.switchedOff(dayWords(project.archivedAt!, timeZone))}
          </p>
          {untidy ? <p className="body">{k.switching.untidy}</p> : null}
          {role === 'owner' ? (
            <SwitchBackOn
              platform={platform}
              ours={ours}
              project={project}
              // The shell's own watch mints it, once it reads the app back on (useWatch).
              watch={false}
              onChanged={() => {
                setRestored(true)
                onChanged()
              }}
              expire={expire}
            />
          ) : null}
        </section>
      ) : restored && (project.launchedAt ?? null) === null ? (
        <p className="body-lead" role="status">
          {k.switching.backDraft}
        </p>
      ) : null}
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          <NeedsBand
            needs={needsStillTrue(
              [...(keeping?.needs ?? []), ...loaded.seen.goingLive],
              () => project.state === 'archived',
            )}
            timeZone={timeZone}
            press={(need) =>
              // TASK 10: the band's presses are here, on the app's own page; a helper has none.
              need.kind === 'down' && need.owner ? (
                <StartItAgain
                  platform={platform}
                  ours={ours}
                  project={project}
                  arrived={back === 'start-again'}
                  onDone={() => setKeepingAttempt((n) => n + 1)}
                  expire={expire}
                  now={now}
                  timeZone={timeZone}
                />
              ) : need.kind === 'answering-again' ? (
                <WhatHappened
                  platform={platform}
                  ours={ours}
                  project={project}
                  from={need.from}
                  to={need.to}
                  expire={expire}
                />
              ) : null
            }
          />
          {role === 'owner' &&
          project.state !== 'archived' &&
          (loaded.seen.studentsGone || startedForStudents) ? (
            // BACK, NOT RUNNING YET (moment 20): the version from last term, put back by an owner.
            <section className="overview__back" aria-label={k.switching.students}>
              <StartForStudents
                platform={platform}
                ours={ours}
                project={project}
                arrived={back === 'students'}
                onDone={() => {
                  setStartedForStudents(true)
                  onChanged()
                }}
                expire={expire}
                now={now}
                timeZone={timeZone}
                intro={
                  <>
                    <p className="body-lead">{k.switching.back}</p>
                    <p className="body">
                      {k.switching.studentsWhat(k.switching.students)}
                    </p>
                  </>
                }
              />
            </section>
          ) : null}
          {loaded.seen.handed === null ? null : (
            <ForYourStudents name={project.name} handed={loaded.seen.handed} />
          )}
          {loaded.seen.band ? <Band slug={project.slug} /> : null}
          {loaded.seen.rows.length === 0 ? null : (
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
          )}
          <div className="overview__change">
            <Button kind="secondary" {...linkTo(`/apps/${slug}/change`)}>
              {words.preview.askForChange}
            </Button>
          </div>
          {keeping === null ? null : (
            <Since
              lastHere={keeping.since.lastHere}
              lines={keeping.since.lines}
              timeZone={timeZone}
              app={{ projectId: project.id, name: project.name, slug: project.slug }}
            />
          )}
          {loaded.seen.launched ? <HowWeKeepWatch name={project.name} /> : null}
        </>
      ) : null}
      <Switching
        platform={platform}
        ours={ours}
        project={project}
        role={role}
        then={back}
        onChanged={(notFinished) => {
          if (notFinished === true) setUntidy(true)
          onChanged()
        }}
        expire={expire}
      />
    </div>
  )
}
