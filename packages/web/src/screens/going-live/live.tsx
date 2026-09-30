import type { Schemas } from '@manifest/contract'
import { Button, Card, StateChip, TwoFacts } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { pressFailed } from '../change/press.js'
import { agoWords, servingFact, type Said } from '../preview/facts.js'
import { SupportReference } from '../reference.js'
import {
  cutByOurDeadline,
  ENDED_BADLY,
  incidentLater,
  incidentOf,
  Secrets,
  Stations,
  StepUpCard,
  UNSURE_READS,
  WhatWentWrong,
  type Missing,
} from '../trying-out/parts.js'
import { newestAttempt, versionAsked } from '../trying-out/stations.js'
import { Hostname } from '../your-apps/your-apps.js'

const l = words.goingLive.letIn
const t = words.tryingOut

/** The new instance is read every second while the deploy runs (F4 M3's rule). */
const POLL_MS = 1000
/**
 * The gate's refusals: a blocking item unmet, the approval missing or refused, or a launched
 * app's sensitive change. The page reads the checklist again, and shows what changed.
 */
const GATE = new Set([
  'RELEASE_PRODUCTION_GATE_UNAVAILABLE',
  'RELEASE_DIGEST_NOT_APPROVED',
  'RELEASE_REESCALATED',
])

/**
 * "18 September, 3:12pm", or "today, 3:12pm": a version's day, as the walk-through names it after
 * "the version from"; null when its date cannot be read.
 */
export function whenOf(createdAt: string, now: Date, timeZone?: string): string | null {
  const asked = versionAsked(createdAt, now, timeZone)
  const from = `${words.facts.versionFrom} `
  return asked.startsWith(from) ? asked.slice(from.length) : null
}

/** The candidate a press sent, and its day, for the sentence that names it. */
type Sent = { releaseId: string; when: string | null }

/**
 * The phases the page must keep this card for, whatever it reads meanwhile: a press under way, or
 * its end. Everywhere else the card is the page's offer, drawn only while ready and not launched.
 */
const HOLD = new Set(['reading', 'putting', 'unsure', 'landed', 'failed'])

type Phase =
  | { at: 'offer' }
  /** RELEASE_NOT_STAGED: trying-out's version changed; the new one named, asked again. */
  | { at: 'changed'; sent: Sent }
  /** The press's own reads, before anything is sent. */
  | { at: 'reading' }
  | { at: 'putting'; sent: Sent; instance: Schemas['InstanceSummary'] | null }
  /** M1: our deadline cut the wait; the new instance read on, up to five minutes more. */
  | {
      at: 'unsure'
      sent: Sent
      instance: Schemas['InstanceSummary'] | null
      gaveUp: boolean
    }
  | { at: 'landed'; sent: Sent }
  | {
      at: 'failed'
      sent: Sent
      serving: Said
      /** Nothing serves the live address: "Nothing reached your students" is true. */
      empty: boolean
      attempt: string
      incidentId: string | null
    }
  | { at: 'secrets'; missing: Missing[] }
  | { at: 'step-up' }

/**
 * [LET YOUR STUDENTS IN] (walk-through moment 14; F5 Task 10, Decision 10), on *Going live* when
 * the checklist is ready. **Everything here is the person's own session, in the browser**: our
 * server never deploys anywhere but the draft.
 * - **The press re-reads the checklist** and deploys exactly its candidate to the live address,
 *   naming that one: a version changed on trying-out while they were away is the one they see.
 * - **The step-up** is a card in place; *[Sign in again]* comes back with `?then=live`, and one
 *   press does it. Nothing is kept in storage: the press reads what goes live at that moment.
 * - **The stations** tick on the new instance, the one not listed at the press; **the end is
 *   `deploy`'s own answer**, or, past our deadline, the instance's own (M1).
 */
export function LetStudentsIn({
  platform,
  ours,
  project,
  ready,
  launched,
  candidate,
  production,
  back,
  expire,
  now,
  timeZone,
  onHold,
  onGate,
  onLanded,
}: {
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  /** Whether the page's last reading of the checklist had every blocking item met. */
  ready: boolean
  /** Whether the page has heard the app is launched (the project, or the checklist). */
  launched: boolean
  /** Its candidate, as the page last read it, and its day. */
  candidate: Sent | null
  /** The live address, as the page read it. */
  production: Schemas['Environment']
  /** Back from signing in again (`?then=live`): the same button, said so. */
  back: boolean
  expire: () => void
  now: () => Date
  timeZone: string | undefined
  /**
   * Told whether the page must keep this card whatever it reads (a press under way, or its end),
   * or may draw it only as its offer (the final review's I1 and I2).
   */
  onHold: (hold: boolean) => void
  /** The gate refused it: the page reads the checklist again, and shows what changed. */
  onGate: () => void
  /** It is live: the page says so, and keeps this moment. */
  onLanded: () => void
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

  useEffect(() => onHold(HOLD.has(phase.at)), [phase.at, onHold])

  // HEARD LAUNCHED WHILE UNSURE, OR AFTER A START THAT NEVER ANSWERED (the final review's M3): it
  // is live, and the card says so, never "we couldn't see how it ended" beside it.
  useEffect(() => {
    if (!launched) return
    setPhase((p) =>
      p.at === 'unsure' || p.at === 'failed' ? { at: 'landed', sent: p.sent } : p,
    )
  }, [launched])

  // M4: AFTER A START THAT NEVER ANSWERED (or one we stopped watching), THE OFFER COMES BACK when
  // the page's next reading (shown again: Decision 16) has another version ready to go. Each
  // reading is a new `candidate`, so this runs once per reading, never on the ending itself.
  useEffect(() => {
    const next = ready ? (candidate?.releaseId ?? null) : null
    setPhase((p) =>
      (p.at === 'failed' || (p.at === 'unsure' && p.gaveUp)) &&
      next !== null &&
      next !== p.sent.releaseId
        ? { at: 'offer' }
        : p,
    )
  }, [candidate, ready])

  const slug = encodeURIComponent(project.slug)

  /** A press that did not go through: the session ending is the shell's; else said, with a reference. */
  const didNotGo = (error: unknown, operation: string) => {
    const said = pressFailed(error, operation)
    if (said.expired) return expire()
    if (!live.current) return
    setNotice(said.reference)
    setPhase({ at: 'offer' })
  }

  /** The candidate's day; a date that cannot be read leaves the sentence undated. */
  const dayOf = async (releaseId: string): Promise<string | null> => {
    try {
      return whenOf((await platform.getRelease(releaseId)).createdAt, now(), timeZone)
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') throw error
      return null
    }
  }

  /** The gate said no: back to the offer, and the page reads what changed. */
  const gate = () => {
    if (!live.current) return
    setPhase({ at: 'offer' })
    onGate()
  }

  /**
   * THE PRESS: the checklist read now, and exactly the candidate the button named sent to the live
   * address (the Global Constraint). Another one there now is named and asked about, never sent.
   */
  const press = async (named: string | null) => {
    setPressedOnce(true)
    setNotice(undefined)
    setPhase({ at: 'reading' })
    let sent: Sent
    let listed: Set<string>
    try {
      const readiness = await platform.getLaunchReadiness(project.id)
      if (!readiness.ready || readiness.candidateReleaseId === null) return gate()
      sent = {
        releaseId: readiness.candidateReleaseId,
        when: await dayOf(readiness.candidateReleaseId),
      }
      // Trying-out changed while they were here (moment 14): name the new one, and ask.
      if (sent.releaseId !== named) {
        if (live.current) setPhase({ at: 'changed', sent })
        return
      }
      listed = new Set(
        (await platform.listInstances(production.id)).instances.map((i) => i.id),
      )
    } catch (error) {
      return didNotGo(error, 'getLaunchReadiness')
    }
    if (!live.current) return
    setPhase({ at: 'putting', sent, instance: null })
    clearInterval(poll.current)
    poll.current = setInterval(() => {
      platform.listInstances(production.id).then(
        (list) =>
          live.current &&
          setPhase((p) =>
            p.at === 'putting'
              ? { ...p, instance: newestAttempt(list.instances, listed) }
              : p,
          ),
        // A read missed is the next second's to make; the end is deploy's answer.
        () => undefined,
      )
    }, POLL_MS)
    let answered: Schemas['Instance']
    try {
      answered = await platform.deploy(production.id, sent.releaseId, crypto.randomUUID())
    } catch (error) {
      clearInterval(poll.current)
      if (cutByOurDeadline(error)) return readOn(sent, listed)
      return refused(error, sent)
    }
    clearInterval(poll.current)
    if (!live.current) return
    if (answered.state === 'failed') return neverAnswered(sent, answered.id)
    land(sent)
  }

  /** IT IS LIVE: the moment the product is for. */
  const land = (sent: Sent) => {
    if (!live.current) return
    setPhase({ at: 'landed', sent })
    onLanded()
  }

  const refused = async (error: unknown, sent: Sent) => {
    const refusal = refusalOf(error)
    const code = refusal.kind === 'refused' ? refusal.code : null
    if (code === 'STEP_UP_REQUIRED') return setPhase({ at: 'step-up' })
    if (code !== null && GATE.has(code)) return gate()
    if (code === 'RELEASE_NOT_STAGED') return notStaged(sent)
    if (code === 'RELEASE_SECRET_NOT_SET') return needsSecrets()
    didNotGo(error, 'deploy')
  }

  /** RELEASE_NOT_STAGED: trying-out's version changed a moment ago; name the new one, and ask. */
  const notStaged = async (sent: Sent) => {
    try {
      const readiness = await platform.getLaunchReadiness(project.id)
      const releaseId = readiness.candidateReleaseId
      if (!readiness.ready || releaseId === null || releaseId === sent.releaseId)
        return gate()
      const when = await dayOf(releaseId)
      if (live.current) setPhase({ at: 'changed', sent: { releaseId, when } })
    } catch (error) {
      didNotGo(error, 'getLaunchReadiness')
    }
  }

  /**
   * A SECRET WITH NO VALUE ON THE LIVE ADDRESS: declared and not set there (`listAppSecrets`),
   * each named by the question we asked for it on the draft; set from here, to the platform alone.
   */
  const needsSecrets = async () => {
    try {
      const [list, asked] = await Promise.all([
        platform.listAppSecrets(production.id),
        ours.askedSecrets(project.id),
      ])
      const missing = list.secrets
        .filter((s) => s.declared && !s.set)
        .map((s) => ({
          name: s.name,
          ask: asked.find((a) => a.name === s.name)?.ask ?? null,
        }))
      if (!live.current) return
      setPhase(missing.length === 0 ? { at: 'offer' } : { at: 'secrets', missing })
    } catch (error) {
      didNotGo(error, 'listAppSecrets')
    }
  }

  const setSecrets = async (missing: Missing[], values: Record<string, string>) => {
    setNotice(undefined)
    try {
      for (const { name } of missing)
        await platform.setAppSecret(
          production.id,
          name,
          values[name] ?? '',
          crypto.randomUUID(),
        )
      if (live.current) setPhase({ at: 'offer' })
    } catch (error) {
      const refusal = refusalOf(error)
      if (refusal.kind === 'refused' && refusal.code === 'STEP_UP_REQUIRED') {
        if (live.current) setPhase({ at: 'step-up' })
        return
      }
      didNotGo(error, 'setAppSecret')
    }
  }

  /**
   * M1 (Review Focus 3): OUR DEADLINE CUT THE WAIT, NOT THE DEPLOY. Never "nothing reached your
   * students": the new instance is read every second, up to five minutes more, to its own end.
   */
  const readOn = (sent: Sent, listed: Set<string>) => {
    if (!live.current) return
    setPhase((p) => ({
      at: 'unsure',
      sent,
      instance: p.at === 'putting' ? p.instance : null,
      gaveUp: false,
    }))
    let reads = 0
    let ended = false
    clearInterval(poll.current)
    poll.current = setInterval(() => {
      reads += 1
      const last = reads >= UNSURE_READS
      if (last) clearInterval(poll.current)
      platform.listInstances(production.id).then(
        (list) => {
          if (!live.current || ended) return
          const instance = newestAttempt(list.instances, listed)
          if (instance?.state === 'healthy') {
            ended = true
            clearInterval(poll.current)
            return land(sent)
          }
          if (instance !== null && ENDED_BADLY.has(instance.state)) {
            ended = true
            clearInterval(poll.current)
            return void neverAnswered(sent, instance.id)
          }
          setPhase((p) => (p.at === 'unsure' ? { ...p, instance, gaveUp: last } : p))
        },
        () =>
          live.current &&
          !ended &&
          last &&
          setPhase((p) => (p.at === 'unsure' ? { ...p, gaveUp: true } : p)),
      )
    }, POLL_MS)
  }

  /**
   * IT NEVER ANSWERED: what the live address serves (nothing, before a first launch), and the
   * attempt; M2: *[What went wrong]* fed by THIS attempt's incident, read once more after 2 s.
   */
  const neverAnswered = async (sent: Sent, attemptId: string) => {
    let serving: Said = { words: words.facts.cantTell, tone: 'neutral' }
    let empty = false
    let incident: Schemas['Incident'] | undefined
    try {
      const [environments, found] = await Promise.all([
        platform.listEnvironments(project.id),
        incidentOf(platform, production.id, attemptId),
      ])
      const there = environments.find((e) => e.kind === 'production')
      if (there !== undefined) {
        const release =
          there.instance === null
            ? undefined
            : await platform.getRelease(there.instance.releaseId).catch(() => undefined)
        serving = servingFact(there, release, timeZone)
        empty = there.instance === null
      }
      incident = found
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') return expire()
    }
    if (!live.current) return
    const failed = (found: Schemas['Incident'] | undefined): Phase => ({
      at: 'failed',
      sent,
      serving,
      empty,
      attempt: words.preview.facts.failed(
        found === undefined ? null : agoWords(new Date(found.createdAt), now(), timeZone),
      ),
      incidentId: found?.id ?? null,
    })
    setPhase(failed(incident))
    if (incident !== undefined) return
    const later = await incidentLater(platform, production.id, attemptId)
    if (later === undefined || !live.current) return
    setPhase((p) => (p.at === 'failed' && p.sent === sent ? failed(later) : p))
  }

  /** "The version from 18 September goes to <address>. Your trying-out address stays as it is." */
  const goes = (when: string | null) => {
    const [before, after] = l.goes(when)
    return (
      <p className="body-lead">
        {before}
        <span className="mono">
          <Hostname name={production.hostname} />
        </span>
        {after}
      </p>
    )
  }
  const offered = phase.at === 'offer' || phase.at === 'changed' || phase.at === 'reading'
  const noticeCard =
    notice === undefined ? null : (
      <div role="alert">
        <Card tone="attention">
          <p className="body-lead">{t.couldnt}</p>
          <SupportReference reference={notice} />
        </Card>
      </div>
    )
  return (
    <section className="trying-out going-live__live" aria-label={l.button}>
      {noticeCard}
      {offered ? (
        <>
          {phase.at === 'offer' && back && !pressedOnce ? (
            <p className="body-lead">{l.again}</p>
          ) : null}
          {phase.at === 'changed' ? (
            // Said to a screen reader too: the button they pressed was replaced (M8).
            <p className="body-lead" role="status">
              {l.changed}
            </p>
          ) : null}
          {goes(phase.at === 'changed' ? phase.sent.when : (candidate?.when ?? null))}
          <div className="describe__actions">
            <Button
              kind="primary"
              disabled={phase.at === 'reading'}
              onClick={() =>
                void press(
                  phase.at === 'changed'
                    ? phase.sent.releaseId
                    : (candidate?.releaseId ?? null),
                )
              }
            >
              {l.button}
            </Button>
          </div>
        </>
      ) : null}
      {phase.at === 'putting' ? (
        <>
          {goes(phase.sent.when)}
          <StateChip state="working" label={t.working} />
          <Stations instance={phase.instance} name={l.stationsLabel} />
          <p className="body-lead">{t.real}</p>
          <p className="building__leave">{t.leave}</p>
        </>
      ) : null}
      {phase.at === 'unsure' ? (
        <>
          {goes(phase.sent.when)}
          {/* Stations only while we still read them: motion means a machine is moving. */}
          {phase.gaveUp ? null : (
            <Stations instance={phase.instance} name={l.stationsLabel} />
          )}
          <p className="body-lead" role="status">
            {phase.gaveUp ? l.unsureLong : t.unsure}
          </p>
        </>
      ) : null}
      {phase.at === 'landed' ? (
        <>
          <Stations instance={{ state: 'healthy' }} name={l.stationsLabel} />
          <p className="going-live__landed" role="status">
            {l.landed(project.name)}
          </p>
          <p className="mono going-live__address">{production.url}</p>
          <div className="describe__actions">
            <Button kind="primary" {...linkTo(`/apps/${slug}`)}>
              {l.tellThem}
            </Button>
          </div>
        </>
      ) : null}
      {phase.at === 'failed' ? (
        <>
          <StateChip state="attention" label={t.needsYou} />
          <Stations instance={{ state: 'failed' }} name={l.stationsLabel} />
          <h2 className="trying-out__title">{l.address}</h2>
          <TwoFacts
            serving={{
              overline: words.preview.facts.serving,
              title: phase.serving.words,
              tone: phase.serving.tone,
            }}
            attempt={{
              overline: words.preview.facts.attempt,
              title: phase.attempt,
              tone: 'attention',
            }}
            // The footnote promises a version still answering: only true when one is.
            {...(phase.serving.tone === 'steady' ? {} : { foot: null })}
          />
          {phase.empty ? <p className="body-lead">{l.nothingReached}</p> : null}
          {phase.incidentId === null ? null : (
            <WhatWentWrong
              platform={platform}
              ours={ours}
              project={project}
              incidentId={phase.incidentId}
              environment="production"
              expire={expire}
            />
          )}
        </>
      ) : null}
      {phase.at === 'secrets' ? (
        <Secrets
          missing={phase.missing}
          onSet={(values) => setSecrets(phase.missing, values)}
        />
      ) : null}
      {phase.at === 'step-up' ? (
        <StepUpCard returnTo={`/apps/${slug}/going-live?then=live`} aboutStudents />
      ) : null}
    </section>
  )
}
