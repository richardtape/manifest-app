import type { Schemas } from '@manifest/contract'
import { Button, Card, SegmentedControl, StateChip, TwoFacts } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf, refusedLine } from '../../platform/refusal.js'
import { linkTo, remember, TABS, type Tab } from '../../router.js'
import { words } from '../../words.js'
import { phraseOf, stepOf } from '../going-live/steps.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { asServed } from '../your-apps/model.js'
import { Hostname } from '../your-apps/your-apps.js'
import {
  attemptFact,
  needsIncidents,
  releasesToRead,
  servingFact,
  type Attempt,
  type Said,
} from './facts.js'
import { WhatWentWrong } from '../trying-out/parts.js'
import { PutOnTryingOut } from '../trying-out/put.js'
import { TryItAs } from './try-it-as.js'

const w = words.preview
/** While an attempt is under way, the addresses are read again this often (a page reopened mid-deploy). */
export const UNDER_WAY_MS = 2000
/** The three worlds (walk-through moment 7), each an address of the app's. */
export const KIND: Record<Tab, Schemas['Environment']['kind']> = {
  draft: 'sandbox',
  'trying-out': 'staging',
  students: 'production',
}

type Address = { env: Schemas['Environment']; serving: Said; attempt: Attempt | null }
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; addresses: Partial<Record<Tab, Address>> }
/**
 * F5b: trying-out's registration, step 2 on *Going live*: `registered` once UBC's identity team has
 * (its record `active`), else the step's state in words for the line, or null when the records
 * could not be read (then it is *not registered*: nothing to open).
 */
type Registration =
  { state: 'reading' } | { state: 'registered' } | { state: 'not'; phrase: string | null }

/**
 * THE PREVIEW'S READS, IN THE PERSON'S SESSION (Decision 2): the app's addresses, then each
 * one's instances, the versions that date them, and, when a failure is the last attempt, its
 * incident. A version that cannot be read loses its date, not the page; a session that ended
 * anywhere is the shell's to say.
 */
async function read(
  platform: Platform,
  projectId: string,
  launched: boolean,
  now: Date,
  timeZone: string | undefined,
): Promise<Partial<Record<Tab, Address>>> {
  const environments = await platform.listEnvironments(projectId)
  const addresses = await Promise.all(
    environments.map(async (found): Promise<[Tab, Address] | undefined> => {
      // Before a launch, a dry run's instance taken down again is nothing there (the platform's 5b).
      const env = asServed(found, launched)
      const tab = TABS.find((t) => KIND[t] === env.kind)
      if (tab === undefined) return undefined
      const { instances } = await platform.listInstances(env.id)
      const read = await Promise.allSettled(
        releasesToRead(env).map((id) => platform.getRelease(id)),
      )
      for (const r of read)
        if (r.status === 'rejected') {
          const refusal = refusalOf(r.reason)
          if (refusal.kind === 'signed-out') throw r.reason
          if (refusal.kind === 'refused') console.warn(refusedLine(refusal))
        }
      const releases = new Map(
        read.flatMap((r) =>
          r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [],
        ),
      )
      const incidents = needsIncidents(env, instances)
        ? (await platform.listIncidents(env.id)).incidents
        : []
      const release =
        env.instance === null ? undefined : releases.get(env.instance.releaseId)
      return [
        tab,
        {
          env,
          serving: servingFact(env, release, timeZone),
          attempt: attemptFact(env, instances, incidents, now, timeZone),
        },
      ]
    }),
  )
  return Object.fromEntries(addresses.filter((a) => a !== undefined))
}

/**
 * MOMENT 7, SEEING IT (F4 Task 5): the switcher across the top, each address in mono with a way
 * to open it in a new tab (never a frame: apps refuse to be framed), what each world is, and the
 * two facts. Then *Ask for a change*.
 */
export function Preview({
  platform,
  ours,
  project,
  tab: first,
  expire,
  now = () => new Date(),
  timeZone,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  tab: Tab
  expire: () => void
  now?: () => Date
  timeZone?: string
}) {
  const [tab, setTab] = useState<Tab>(first)
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const panels = useId()
  const launched = (project.launchedAt ?? null) !== null
  // F5b: trying-out's record as read, with the moment it was read (its wait is counted to it), and
  // the checklist's items (an app that signs nobody in: the review's I4). Each read on its own.
  const [recorded, setRecorded] = useState<
    { records: Schemas['LaunchRecords']; at: Date } | 'unread' | undefined
  >()
  const [items, setItems] = useState<readonly Schemas['LaunchReadinessItem'][]>([])

  useEffect(() => {
    let live = true
    read(platform, project.id, launched, now(), timeZone).then(
      (addresses) => live && setLoaded({ state: 'ready', addresses }),
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
  }, [platform, project.id, launched, timeZone, expire, attempt])

  // F5b (Decision 5): TRYING-OUT'S REGISTRATION, read on its own, so it never holds the page: a
  // failed read is *not registered*, said without a state; a session that ended is the shell's.
  // The checklist is read beside it, on its own too: it only ever says that nothing needs
  // registering (an app that signs nobody in, the review's I4), so a checklist that fails or never
  // answers holds nothing.
  useEffect(() => {
    let live = true
    const refused = (error: unknown) => {
      const refusal = refusalOf(error)
      if (refusal.kind === 'signed-out') expire()
      else if (refusal.kind === 'refused') console.warn(refusedLine(refusal))
      return refusal.kind !== 'signed-out'
    }
    platform.getLaunchRecords(project.id).then(
      (records) => live && setRecorded({ records, at: now() }),
      (error: unknown) => live && refused(error) && setRecorded('unread'),
    )
    platform.getLaunchReadiness(project.id).then(
      (readiness) => live && setItems(readiness.items),
      (error: unknown) => live && refused(error),
    )
    return () => {
      live = false
    }
    // `now` is a clock, read once per attempt: never a reason to read again.
  }, [platform, project.id, expire, attempt])
  const registration = registrationOf(recorded, items, timeZone)

  // [WHAT WENT WRONG] (F4 Task 9): the draft's failed attempt, when one of our rounds put it
  // there, opens that conversation. None of ours did: no button.
  const [wentWrong, setWentWrong] = useState<string | null>(null)
  const failedDraft =
    loaded.state === 'ready' && loaded.addresses.draft?.attempt?.failed === true
      ? loaded.addresses.draft.attempt.instanceId
      : null
  useEffect(() => {
    setWentWrong(null)
    if (failedDraft === null) return
    let live = true
    ours.conversationFor(project.id, failedDraft).then(
      (found) => live && setWentWrong(found?.id ?? null),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [ours, project.id, failedDraft])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  /** Read again, quietly: what is on the page stays until the new reading answers. */
  const refresh = useCallback(() => setAttempt((n) => n + 1), [])

  // AN ATTEMPT UNDER WAY is read again until it ends (F4 Task 10: a page closed mid-deploy and
  // reopened reads "under way", then the result).
  const underWay =
    loaded.state === 'ready' &&
    Object.values(loaded.addresses).some((a) => a?.attempt?.tone === 'working')
  useEffect(() => {
    if (!underWay) return
    const timer = setInterval(refresh, UNDER_WAY_MS)
    return () => clearInterval(timer)
  }, [underWay, refresh])

  const choose = (value: string) => {
    const chosen = TABS.find((t) => t === value) ?? 'draft'
    setTab(chosen)
    remember(`/apps/${encodeURIComponent(project.slug)}/preview?tab=${chosen}`)
  }

  return (
    <div className="preview">
      <h1 className="page-title">{project.name}</h1>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          <SegmentedControl
            label={w.switcherLabel}
            options={TABS.map((t) => ({
              value: t,
              label: w.tabs[t],
              controls: `${panels}-${t}`,
            }))}
            value={tab}
            onChange={choose}
          />
          {TABS.map((t) => (
            <section
              key={t}
              id={`${panels}-${t}`}
              role="tabpanel"
              aria-label={w.tabs[t]}
              hidden={t !== tab}
              className="preview__panel"
            >
              {loaded.addresses[t] === undefined ? null : (
                <Panel
                  tab={t}
                  address={loaded.addresses[t]}
                  registration={registration}
                  goingLive={
                    launched
                      ? null
                      : `/apps/${encodeURIComponent(project.slug)}/going-live`
                  }
                  wentWrong={
                    t === 'draft' && wentWrong !== null
                      ? `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(wentWrong)}`
                      : null
                  }
                  put={
                    t === 'draft' ? (
                      <PutOnTryingOut
                        platform={platform}
                        ours={ours}
                        project={project}
                        expire={expire}
                        now={now}
                        timeZone={timeZone}
                        known={{
                          sandbox: loaded.addresses.draft?.env,
                          staging: loaded.addresses['trying-out']?.env,
                        }}
                        onPut={refresh}
                      />
                    ) : null
                  }
                  fix={(incidentId) => (
                    <WhatWentWrong
                      platform={platform}
                      ours={ours}
                      project={project}
                      incidentId={incidentId}
                      expire={expire}
                    />
                  )}
                />
              )}
            </section>
          ))}
          <div className="preview__change">
            <p className="body-lead">{w.notRight}</p>
            <Button
              kind="secondary"
              {...linkTo(`/apps/${encodeURIComponent(project.slug)}/change`)}
            >
              {w.askForChange}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * TRYING-OUT'S REGISTRATION, IN A WORD (F5b, Decision 5): registered once UBC's identity team has
 * (its record `active`), **or when nothing needs registering** (an app that signs nobody in, as the
 * steps say: the review's I4); else the step's state for the line, or none when the records could
 * not be read.
 */
function registrationOf(
  recorded: { records: Schemas['LaunchRecords']; at: Date } | 'unread' | undefined,
  items: readonly Schemas['LaunchReadinessItem'][],
  timeZone: string | undefined,
): Registration {
  if (recorded === undefined) return { state: 'reading' }
  if (recorded === 'unread') return { state: 'not', phrase: null }
  const step = stepOf('staging', {
    records: recorded.records,
    items,
    now: recorded.at,
    timeZone,
    sending: false,
  })
  return recorded.records.stagingRegistration?.state === 'active' ||
    step.kind === 'not-needed'
    ? { state: 'registered' }
    : { state: 'not', phrase: phraseOf(step) }
}

/**
 * One address: where it is, what its world is, and the two facts; a failure's conversation; on
 * the draft, putting its version on trying-out (F4 Task 10).
 */
function Panel({
  tab,
  address,
  registration,
  goingLive,
  wentWrong,
  put,
  fix,
}: {
  tab: Tab
  address: Address
  /** Trying-out's registration (F5b): *[Open it]* once registered, else the step's line. */
  registration: Registration
  /** Where *Going live* is, before a launch; null once launched (no line then). */
  goingLive: string | null
  /** The conversation whose round put the failed attempt there (F4 Task 9). */
  wentWrong: string | null
  /** [Put this version on trying-out], beside the draft's facts. */
  put: ReactNode
  /** [What went wrong] for trying-out's failed attempt: a fix conversation of ours (F4 Task 10). */
  fix: (incidentId: string) => ReactNode
}) {
  const { env, serving, attempt } = address
  const reaches = env.instance !== null
  const registered = registration.state === 'registered'
  return (
    <div className="preview__columns">
      <div className="preview__world">
        <div className="preview__address">
          <span className="mono">
            <Hostname name={env.hostname} />
          </span>
          {/* Only where something is there to open; a tab of its own, never a frame. Never on
              trying out until its registration is active (Rich: "Hide until registered"), which
              F5b reads (Decision 5). */}
          {reaches && (tab !== 'trying-out' || registered) ? (
            <a
              className="mf-btn mf-btn--secondary mf-btn--sm"
              href={env.url}
              target="_blank"
              rel="noopener"
            >
              {w.open}
            </a>
          ) : null}
        </div>
        {tab === 'draft' ? (
          <>
            <p className="body-lead">{w.draftIs}</p>
            {reaches ? <TryItAs /> : null}
          </>
        ) : null}
        {tab === 'trying-out' ? (
          <Card
            className="preview__wait"
            {...(registered ? {} : { tone: 'waiting' as const })}
          >
            {/* Registered: nothing waits on UBC's identity team any more (F5b). */}
            {registered ? null : <StateChip state="waiting" label={w.waitingOn} />}
            <p className="body-lead">{w.tryingOut}</p>
          </Card>
        ) : null}
        {tab === 'trying-out' && registration.state === 'not' && goingLive !== null ? (
          <p className="body preview__step">
            <span>{w.step(registration.phrase)}</span>{' '}
            <a {...linkTo(goingLive)}>{w.toGoingLive}</a>
          </p>
        ) : null}
        {tab === 'students' ? <p className="body-lead">{w.students}</p> : null}
      </div>
      <div className="preview__facts">
        {attempt === null ? (
          // Nothing tried yet: the draft says when it appears; elsewhere the world says it.
          tab === 'draft' ? (
            <p className="body-lead">{serving.words}</p>
          ) : null
        ) : (
          <TwoFacts
            serving={{
              overline: w.facts.serving,
              title: serving.words,
              tone: serving.tone,
            }}
            attempt={{
              overline: w.facts.attempt,
              title: attempt.words,
              tone: attempt.tone,
            }}
            // The footnote promises an older version answering while a new one proves itself.
            {...(reaches && attempt.tone !== 'steady' ? {} : { foot: null })}
          />
        )}
        {wentWrong === null ? null : (
          <div className="describe__actions">
            <Button kind="secondary" {...linkTo(wentWrong)}>
              {w.whatWentWrong}
            </Button>
          </div>
        )}
        {tab === 'trying-out' && attempt?.failed === true && attempt.incidentId !== null
          ? fix(attempt.incidentId)
          : null}
        {tab === 'draft' && reaches ? put : null}
      </div>
    </div>
  )
}
