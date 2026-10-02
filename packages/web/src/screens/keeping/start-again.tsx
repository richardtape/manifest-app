import type { Schemas } from '@manifest/contract'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import { reportProblem, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, navigate } from '../../router.js'
import { words } from '../../words.js'
import { pressFailed } from '../change/press.js'
import { whenOf } from '../going-live/live.js'
import { mintRequest } from '../making/token.js'
import { agoWords } from '../preview/facts.js'
import { SupportReference } from '../reference.js'
import {
  cutByOurDeadline,
  ENDED_BADLY,
  incidentLater,
  incidentOf,
  Stations,
  StepUpCard,
  UNSURE_READS,
  WhatWentWrong,
} from '../trying-out/parts.js'
import { newestAttempt } from '../trying-out/stations.js'
import { dayWords } from './lines.js'

const s = words.keeping.startAgain
const b = words.keeping.band
const t = words.tryingOut

/** The new instance is read every second while a deploy runs (F4 M3's rule, as F5's press). */
const POLL_MS = 1000
/** The gate's refusals (F5's): a sign-off or a checklist item stands between it and students. */
const GATE = new Set([
  'RELEASE_PRODUCTION_GATE_UNAVAILABLE',
  'RELEASE_DIGEST_NOT_APPROVED',
  'RELEASE_REESCALATED',
])

/** A version, and its day as a sentence names it ("18 September, 3:12pm") and a button ("18 September"). */
type Sent = { releaseId: string; when: string | null; day: string | null }
/** Where a deploy of the press is going: the students' address, or trying-out first. */
type Where = 'production' | 'staging'
/** RELEASE_NOT_STAGED: the two versions, and the two addresses' ids. */
type Choice = { theirs: Sent; newer: Sent; production: string; staging: string }

type Phase =
  | { at: 'offer' }
  /** The press's own reads, before anything is sent. */
  | { at: 'reading' }
  | { at: 'putting'; where: Where; instance: Schemas['InstanceSummary'] | null }
  /** M1 (F5): our deadline cut the wait; the new instance read on, up to five minutes more. */
  | {
      at: 'unsure'
      where: Where
      instance: Schemas['InstanceSummary'] | null
      gaveUp: boolean
    }
  | { at: 'landed' }
  | {
      at: 'failed'
      attempt: string
      incident: { id: string; where: Where } | null
    }
  | ({ at: 'not-staged' } & Choice)
  | { at: 'gate' }
  | { at: 'step-up' }

/** How one deploy ended. */
type Outcome =
  | { end: 'healthy' }
  | { end: 'failed'; attemptId: string }
  | { end: 'gave-up' }
  | { end: 'refused'; error: unknown }

/**
 * [START IT AGAIN] (walk-through moment 19; F6 Task 10, design §4), in the band on the Overview,
 * for an owner. **Everything here is the person's own session, in the browser**: our server never
 * deploys anywhere but the draft.
 * - **The press reads the live address now**, and deploys exactly the version it was serving there
 *   (production's own `instance.releaseId`, FE-4: it still names the one that fell), with the
 *   second sign-in when asked (F5's card, back with `?then=start-again`: never pressed by itself).
 * - **The stations** tick on the new instance; nobody has lost anything while it starts. **The end
 *   is `deploy`'s own answer**, or, past our deadline, the instance's own (F5's M1).
 * - **RELEASE_NOT_STAGED** (trying-out has moved on): both versions named by their day, and the
 *   choice: the newer one to the students, or theirs put back on trying-out first, then to them.
 */
export function StartItAgain({
  platform,
  ours,
  project,
  arrived,
  onDone,
  expire,
  now,
  timeZone,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  /** Back from signing in again (`?then=start-again`): the same button, said so. */
  arrived: boolean
  /** It answers again: the page may read what it shows again. */
  onDone: () => void
  expire: () => void
  now: () => Date
  timeZone: string | undefined
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'offer' })
  const [notice, setNotice] = useState<string>()
  const [pressedOnce, setPressedOnce] = useState(false)
  const poll = useRef<ReturnType<typeof setInterval>>(undefined)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      clearInterval(poll.current)
    }
  }, [])

  const slug = encodeURIComponent(project.slug)

  /** A press that did not go through: the session ending is the shell's; else said, with a reference. */
  const didNotGo = (error: unknown, operation: string) => {
    const said = pressFailed(error, operation)
    if (said.expired) return expire()
    if (!live.current) return
    setNotice(said.reference)
    setPhase({ at: 'offer' })
  }

  /** A version's day; a date that cannot be read leaves the sentence undated. */
  const sentOf = async (releaseId: string): Promise<Sent> => {
    try {
      const { createdAt } = await platform.getRelease(releaseId)
      return {
        releaseId,
        when: whenOf(createdAt, now(), timeZone),
        day: dayWords(createdAt, timeZone),
      }
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') throw error
      return { releaseId, when: null, day: null }
    }
  }

  /**
   * M1 (F5 Decision 11): OUR DEADLINE CUT THE WAIT, NOT THE DEPLOY. The new instance is read every
   * second, up to five minutes more, to its own end.
   */
  const readOn = (environmentId: string, listed: Set<string>, where: Where) =>
    new Promise<Outcome>((resolve) => {
      setPhase((p) => ({
        at: 'unsure',
        where,
        instance: p.at === 'putting' ? p.instance : null,
        gaveUp: false,
      }))
      let reads = 0
      let ended = false
      const end = (outcome: Outcome) => {
        if (ended) return
        ended = true
        clearInterval(poll.current)
        resolve(outcome)
      }
      clearInterval(poll.current)
      poll.current = setInterval(() => {
        reads += 1
        const last = reads >= UNSURE_READS
        if (last) clearInterval(poll.current)
        platform.listInstances(environmentId).then(
          (list) => {
            if (ended) return
            const instance = newestAttempt(list.instances, listed)
            if (instance?.state === 'healthy') return end({ end: 'healthy' })
            if (instance !== null && ENDED_BADLY.has(instance.state))
              return end({ end: 'failed', attemptId: instance.id })
            if (last) return end({ end: 'gave-up' })
            if (live.current)
              setPhase((p) => (p.at === 'unsure' ? { ...p, instance } : p))
          },
          () => last && end({ end: 'gave-up' }),
        )
      }, POLL_MS)
    })

  /** ONE DEPLOY, watched: the stations on the instance not listed before it, to its end. */
  const put = async (
    environmentId: string,
    releaseId: string,
    where: Where,
  ): Promise<Outcome> => {
    let listed: Set<string>
    try {
      listed = new Set(
        (await platform.listInstances(environmentId)).instances.map((i) => i.id),
      )
    } catch (error) {
      return { end: 'refused', error }
    }
    if (!live.current) return { end: 'gave-up' }
    setPhase({ at: 'putting', where, instance: null })
    clearInterval(poll.current)
    poll.current = setInterval(() => {
      platform.listInstances(environmentId).then(
        (list) =>
          live.current &&
          setPhase((p) =>
            p.at === 'putting' && p.where === where
              ? { ...p, instance: newestAttempt(list.instances, listed) }
              : p,
          ),
        // A read missed is the next second's to make; the end is deploy's answer.
        () => undefined,
      )
    }, POLL_MS)
    try {
      const answered = await platform.deploy(
        environmentId,
        releaseId,
        crypto.randomUUID(),
      )
      clearInterval(poll.current)
      return answered.state === 'failed'
        ? { end: 'failed', attemptId: answered.id }
        : { end: 'healthy' }
    } catch (error) {
      clearInterval(poll.current)
      if (cutByOurDeadline(error)) return readOn(environmentId, listed, where)
      return { end: 'refused', error }
    }
  }

  /** Five minutes more and no end read: we stop reading, and say so. */
  const gaveUp = (where: Where) =>
    setPhase((p) =>
      p.at === 'unsure'
        ? { ...p, gaveUp: true }
        : { at: 'unsure', where, instance: null, gaveUp: true },
    )

  /**
   * IT NEVER ANSWERED: F5's words for the attempt, and *[What went wrong]* fed by THIS attempt's
   * incident (M2), read once more after 2 s.
   */
  const neverAnswered = async (
    environmentId: string,
    where: Where,
    attemptId: string,
  ) => {
    let found: Schemas['Incident'] | undefined
    try {
      found = await incidentOf(platform, environmentId, attemptId)
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') return expire()
    }
    if (!live.current) return
    const failed = (incident: Schemas['Incident'] | undefined): Phase => ({
      at: 'failed',
      attempt: words.preview.facts.failed(
        incident === undefined
          ? null
          : agoWords(new Date(incident.createdAt), now(), timeZone),
      ),
      incident: incident === undefined ? null : { id: incident.id, where },
    })
    setPhase(failed(found))
    if (found !== undefined) return
    const later = await incidentLater(platform, environmentId, attemptId)
    if (later === undefined || !live.current) return
    setPhase((p) => (p.at === 'failed' && p.incident === null ? failed(later) : p))
  }

  /** A deploy refused: the second sign-in, the gate, trying-out moved on, or F5's words. */
  const refused = async (
    error: unknown,
    notStaged: (() => Promise<void>) | null,
  ): Promise<void> => {
    const refusal = refusalOf(error)
    const code = refusal.kind === 'refused' ? refusal.code : null
    if (code === 'STEP_UP_REQUIRED') return setPhase({ at: 'step-up' })
    if (code !== null && GATE.has(code)) return setPhase({ at: 'gate' })
    if (code === 'RELEASE_NOT_STAGED' && notStaged !== null) return notStaged()
    didNotGo(error, 'deploy')
  }

  /** TO THE STUDENTS' ADDRESS: one deploy, and its end said. */
  const toStudents = async (
    production: string,
    staging: string | null,
    releaseId: string,
  ) => {
    const outcome = await put(production, releaseId, 'production')
    if (!live.current) return
    switch (outcome.end) {
      case 'healthy':
        setPhase({ at: 'landed' })
        onDone()
        return
      case 'gave-up':
        return gaveUp('production')
      case 'failed':
        return neverAnswered(production, 'production', outcome.attemptId)
      case 'refused':
        return refused(
          outcome.error,
          staging === null
            ? null
            : () => askWhich(production, staging, releaseId, outcome.error),
        )
    }
  }

  /**
   * RELEASE_NOT_STAGED: trying-out serves a newer version, and the live address takes only what it
   * serves. Both named by their day, and the choice is theirs.
   */
  const askWhich = async (
    production: string,
    staging: string,
    theirs: string,
    error: unknown,
  ) => {
    try {
      const newer = (await platform.getEnvironment(staging)).instance?.releaseId
      // Nothing newer to offer: the refusal is said as any other.
      if (newer === undefined || newer === theirs) return didNotGo(error, 'deploy')
      const [kept, moved] = await Promise.all([sentOf(theirs), sentOf(newer)])
      if (!live.current) return
      setPhase({ at: 'not-staged', theirs: kept, newer: moved, production, staging })
    } catch (failure) {
      didNotGo(failure, 'getEnvironment')
    }
  }

  /** THEIRS BACK ON TRYING-OUT FIRST, its end awaited, then to the students' address. */
  const putBack = async (choice: Choice) => {
    setNotice(undefined)
    setPhase({ at: 'reading' })
    const outcome = await put(choice.staging, choice.theirs.releaseId, 'staging')
    if (!live.current) return
    switch (outcome.end) {
      case 'healthy':
        return toStudents(choice.production, choice.staging, choice.theirs.releaseId)
      case 'gave-up':
        return gaveUp('staging')
      case 'failed':
        return neverAnswered(choice.staging, 'staging', outcome.attemptId)
      case 'refused':
        return refused(outcome.error, null)
    }
  }

  /** THE PRESS: the live address read now, and exactly the version it was serving sent back. */
  const press = async () => {
    setPressedOnce(true)
    setNotice(undefined)
    setPhase({ at: 'reading' })
    let environments: Schemas['EnvironmentList']
    try {
      environments = await platform.listEnvironments(project.id)
    } catch (error) {
      return didNotGo(error, 'listEnvironments')
    }
    const production = environments.find((e) => e.kind === 'production')
    const staging = environments.find((e) => e.kind === 'staging')
    const releaseId = production?.instance?.releaseId
    if (production === undefined || releaseId === undefined) {
      // Nothing was ever served there: nothing to start again (the band asks only for a launched app).
      if (!live.current) return
      setNotice(reportProblem({ code: 'NOTHING_SERVED', operation: 'listEnvironments' }))
      return setPhase({ at: 'offer' })
    }
    await toStudents(production.id, staging?.id ?? null, releaseId)
  }

  const offered = phase.at === 'offer' || phase.at === 'reading'
  return (
    <div className="start-again">
      {notice === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <p className="body-lead">{t.couldnt}</p>
            <SupportReference reference={notice} />
          </Card>
        </div>
      )}
      {offered ? (
        <>
          {phase.at === 'offer' && arrived && !pressedOnce ? (
            <p className="body">{words.goingLive.letIn.again}</p>
          ) : null}
          <div className="describe__actions">
            <Button
              kind="primary"
              disabled={phase.at === 'reading'}
              onClick={() => void press()}
            >
              {b.startAgain}
            </Button>
          </div>
        </>
      ) : null}
      {phase.at === 'putting' || phase.at === 'unsure' ? (
        <>
          {phase.at === 'putting' ? (
            <StateChip state="working" label={t.working} />
          ) : null}
          {/* Stations only while we still read them: motion means a machine is moving. */}
          {phase.at === 'unsure' && phase.gaveUp ? null : (
            <Stations
              instance={phase.instance}
              name={phase.where === 'production' ? s.stationsLabel : t.stationsLabel}
            />
          )}
          <p className="body">{s.nobodyLost}</p>
          {phase.at === 'unsure' ? (
            <p className="body" role="status">
              {phase.gaveUp ? s.unsureLong : t.unsure}
            </p>
          ) : null}
        </>
      ) : null}
      {phase.at === 'landed' ? (
        <>
          <Stations instance={{ state: 'healthy' }} name={s.stationsLabel} />
          <p className="body" role="status">
            {s.landed}
          </p>
        </>
      ) : null}
      {phase.at === 'failed' ? (
        <>
          <StateChip state="attention" label={t.needsYou} />
          <Stations
            instance={{ state: 'failed' }}
            name={phase.incident?.where === 'staging' ? t.stationsLabel : s.stationsLabel}
          />
          <p className="body">{phase.attempt}</p>
          {phase.incident === null ? null : (
            <WhatWentWrong
              platform={platform}
              ours={ours}
              project={project}
              incidentId={phase.incident.id}
              environment={phase.incident.where}
              expire={expire}
            />
          )}
        </>
      ) : null}
      {phase.at === 'not-staged' ? (
        <>
          {/* Said to a screen reader too: the button they pressed was replaced. */}
          <p className="body" role="status">
            {s.newer(phase.newer.when, phase.theirs.when)}
          </p>
          <div className="describe__actions">
            <Button
              kind="primary"
              onClick={() => {
                setPhase({ at: 'reading' })
                void toStudents(phase.production, phase.staging, phase.newer.releaseId)
              }}
            >
              {s.startNewer}
            </Button>
            <Button kind="secondary" onClick={() => void putBack(phase)}>
              {s.putBack(phase.theirs.day)}
            </Button>
          </div>
        </>
      ) : null}
      {phase.at === 'gate' ? (
        <>
          <p className="body" role="status">
            {s.gate}
          </p>
          <div className="describe__actions">
            <Button kind="secondary" {...linkTo(`/apps/${slug}/going-live`)}>
              {b.goingLiveButton}
            </Button>
          </div>
        </>
      ) : null}
      {phase.at === 'step-up' ? (
        <StepUpCard returnTo={`/apps/${slug}?then=start-again`} aboutStudents />
      ) : null}
    </div>
  )
}

/**
 * [WHAT HAPPENED?] (moment 19; F6 Task 10, design §4): after the students' address answers again,
 * a fix conversation of ours seeded with the outage's two moments, never an incident (the platform
 * never saw it fall), with a token minted for it in their session, then opened. Pressed again, the
 * one already under way is opened (our route, as *[What went wrong]*'s).
 */
export function WhatHappened({
  platform,
  ours,
  project,
  from,
  to,
  expire,
}: {
  platform: Platform
  ours: Ours
  project: { id: string; slug: string }
  from: string
  to: string
  expire: () => void
}) {
  const [pressing, setPressing] = useState(false)
  const [reference, setReference] = useState<string>()
  const press = async () => {
    setPressing(true)
    setReference(undefined)
    let step = 'fixForOutage'
    const open = (id: string) =>
      navigate(
        `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(id)}`,
      )
    try {
      const under = await ours.fixForOutage(project.id, from)
      if (under !== null) return open(under.id)
      step = 'mintToken'
      const minted = await platform.mintToken(
        project.id,
        mintRequest(words.keeping.whatHappened.fixTitle, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        fix: { outage: { from, to } },
        token: minted.secret,
      })
      open(made.id)
    } catch (error) {
      setPressing(false)
      const said = pressFailed(error, step)
      if (said.expired) expire()
      else setReference(said.reference)
    }
  }
  return (
    <>
      {reference === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <p className="body-lead">{t.couldnt}</p>
            <SupportReference reference={reference} />
          </Card>
        </div>
      )}
      <div className="describe__actions">
        <Button kind="secondary" disabled={pressing} onClick={() => void press()}>
          {b.whatHappened}
        </Button>
      </div>
    </>
  )
}
