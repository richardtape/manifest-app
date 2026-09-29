import type { Schemas } from '@manifest/contract'
import { Button, Card, FormField, StateChip, Timeline, TwoFacts } from '@manifest-app/ui'
import { Fragment, useEffect, useRef, useState } from 'react'
import { stepUpHref } from '../../auth.js'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { pressFailed } from '../change/press.js'
import { mintRequest } from '../making/token.js'
import { agoWords, servingFact, type Said } from '../preview/facts.js'
import { SupportReference } from '../reference.js'
import { Hostname } from '../your-apps/your-apps.js'
import { newestAttempt, stationsOf, versionAsked, type StationKey } from './stations.js'

const t = words.tryingOut

/** The new instance is read every second while the deploy runs: a deploy is 5–9 s (F4 M3). */
export const POLL_MS = 1000
/** The platform refuses a value under 6 characters (F3 M1): said before it is sent. */
const SECRET_LEAST = 6

/** The version the question named, and where it goes: fixed when they are asked (Decision 11). */
type Held = {
  releaseId: string
  version: string
  stagingId: string
  somethingThere: boolean
}
type Missing = { name: string; ask: string | null }
/** The draft's address and trying-out's. */
type Addresses = {
  sandbox: Schemas['Environment'] | undefined
  staging: Schemas['Environment'] | undefined
}

type Phase =
  | { at: 'reading' }
  /** The draft serves nothing, or it could not be read: nothing to offer. */
  | { at: 'none' }
  | { at: 'there' }
  | { at: 'offer' }
  | { at: 'asking' }
  | { at: 'question'; held: Held }
  | { at: 'putting'; held: Held; instance: Schemas['InstanceSummary'] | null }
  | { at: 'arrived'; held: Held; hostname: string | null }
  | {
      at: 'failed'
      held: Held
      serving: Said
      attempt: string
      incidentId: string | null
    }
  | { at: 'secrets'; held: Held; missing: Missing[] }
  | { at: 'step-up'; held: Held }

/**
 * BACK FROM SIGNING IN AGAIN: the question they were answering, remembered for this app while
 * the page is away (moment 14: "we remember what they were doing"). The browser's own storage,
 * per tab; a version id, never anything secret. Unavailable, it is simply not remembered.
 */
const KEY = (projectId: string) => `manifest-app.trying-out.${projectId}`
function remember(projectId: string, releaseId: string): void {
  try {
    sessionStorage.setItem(KEY(projectId), releaseId)
  } catch {
    // Not remembered: they press the button again.
  }
}
function recall(projectId: string): string | undefined {
  try {
    const releaseId = sessionStorage.getItem(KEY(projectId)) ?? undefined
    sessionStorage.removeItem(KEY(projectId))
    return releaseId
  } catch {
    return undefined
  }
}

const byKind = (environments: Schemas['EnvironmentList'], kind: string) =>
  environments.find((e) => e.kind === kind)

/** What the draft and trying-out addresses say may be offered. */
function offerOf(
  sandbox: Schemas['Environment'] | undefined,
  staging: Schemas['Environment'] | undefined,
): Phase {
  const draft = sandbox?.instance ?? null
  if (draft === null || staging === undefined) return { at: 'none' }
  // The platform would make a new instance of the same version (F4 M3): "already there" is ours.
  if (staging.instance?.releaseId === draft.releaseId) return { at: 'there' }
  return { at: 'offer' }
}

/**
 * [PUT THIS VERSION ON TRYING-OUT] (walk-through moment 9; F4 Task 10, Decision 11), on the
 * building screen's end and the Preview's draft tab. **Everything here is the person's own
 * session, in the browser**: our server never deploys anywhere but the draft.
 * - **The question** names the version the draft serves, read at the press, and *[Put it there]*
 *   deploys exactly that release, whatever finishes in between.
 * - **The stations** tick on the new instance, the one whose id was not listed at the press, read
 *   every second (F4 M3); **the end is `deploy`'s own answer** (M2).
 * - **A secret with no value there** is set from here, to the platform alone (Decision 15).
 */
export function PutOnTryingOut({
  platform,
  ours,
  project,
  expire,
  now,
  timeZone,
  known,
  onPut,
}: {
  platform: Platform
  ours: Ours
  project: { id: string; slug: string }
  expire: () => void
  now: () => Date
  timeZone: string | undefined
  /** The draft's and trying-out's addresses, when the page has just read them (the Preview). */
  known?: Addresses
  /** Told when a deploy has answered, so a page showing the addresses reads them again. */
  onPut?: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'reading' })
  const [notice, setNotice] = useState<string>()
  const poll = useRef<ReturnType<typeof setInterval>>(undefined)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      clearInterval(poll.current)
    }
  }, [])

  /** The question's version, dated: a date that cannot be read is "this version", never a failure. */
  const hold = async (
    releaseId: string,
    staging: Schemas['Environment'],
  ): Promise<Held> => {
    let version: string = t.thisVersion
    try {
      version = versionAsked(
        (await platform.getRelease(releaseId)).createdAt,
        now(),
        timeZone,
      )
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') throw error
    }
    return {
      releaseId,
      version,
      stagingId: staging.id,
      somethingThere: staging.instance !== null,
    }
  }

  /** A press that did not go through: the session ending is the shell's; else said, with a reference. */
  const failed = (error: unknown, operation: string, then: Phase) => {
    const said = pressFailed(error, operation)
    if (said.expired) return expire()
    if (!live.current) return
    setNotice(said.reference)
    setPhase(then)
  }

  // What may be offered, read once (or the addresses the page already read); or, back from
  // signing in again, the question they were at.
  useEffect(() => {
    const remembered = recall(project.id)
    void (async () => {
      try {
        const addresses: Addresses =
          known ??
          (await platform.listEnvironments(project.id).then((environments) => ({
            sandbox: byKind(environments, 'sandbox'),
            staging: byKind(environments, 'staging'),
          })))
        const { sandbox, staging } = addresses
        if (remembered !== undefined && staging !== undefined) {
          const held = await hold(remembered, staging)
          if (live.current) setPhase({ at: 'question', held })
          return
        }
        if (live.current) setPhase(offerOf(sandbox, staging))
      } catch (error) {
        if (refusalOf(error).kind === 'signed-out') return expire()
        // Nothing to offer is said by nothing drawn; the Preview says what it could not read.
        if (live.current) setPhase({ at: 'none' })
      }
    })()
    // `known` is the page's first reading: what is offered is read once, then at each press.
  }, [platform, project.id])

  /** THE PRESS: what the draft serves now, read now, and the question naming it. */
  const ask = async () => {
    setNotice(undefined)
    setPhase({ at: 'asking' })
    try {
      const environments = await platform.listEnvironments(project.id)
      const sandbox = byKind(environments, 'sandbox')
      const staging = byKind(environments, 'staging')
      const offered = offerOf(sandbox, staging)
      if (offered.at !== 'offer' || sandbox?.instance == null || staging === undefined)
        return setPhase(offered)
      const held = await hold(sandbox.instance.releaseId, staging)
      if (live.current) setPhase({ at: 'question', held })
    } catch (error) {
      failed(error, 'listEnvironments', { at: 'offer' })
    }
  }

  /** [PUT IT THERE]: the release the question named, to trying-out, watched every second. */
  const go = async (held: Held) => {
    setNotice(undefined)
    let listed: Set<string>
    try {
      listed = new Set(
        (await platform.listInstances(held.stagingId)).instances.map((i) => i.id),
      )
    } catch (error) {
      return failed(error, 'listInstances', { at: 'question', held })
    }
    setPhase({ at: 'putting', held, instance: null })
    clearInterval(poll.current)
    poll.current = setInterval(() => {
      platform.listInstances(held.stagingId).then(
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
      answered = await platform.deploy(
        held.stagingId,
        held.releaseId,
        crypto.randomUUID(),
      )
    } catch (error) {
      clearInterval(poll.current)
      return refusedDeploy(error, held)
    }
    clearInterval(poll.current)
    onPut?.()
    if (!live.current) return
    if (answered.state === 'failed') return neverAnswered(held, answered)
    const environments = await platform.listEnvironments(project.id).catch(() => [])
    if (live.current)
      setPhase({
        at: 'arrived',
        held,
        hostname: byKind(environments, 'staging')?.hostname ?? null,
      })
  }

  const refusedDeploy = async (error: unknown, held: Held) => {
    const refusal = refusalOf(error)
    if (refusal.kind === 'refused' && refusal.code === 'STEP_UP_REQUIRED') {
      remember(project.id, held.releaseId)
      return setPhase({ at: 'step-up', held })
    }
    if (refusal.kind === 'refused' && refusal.code === 'RELEASE_SECRET_NOT_SET')
      return needsSecrets(held)
    failed(error, 'deploy', { at: 'offer' })
  }

  /**
   * WHICH SECRETS TRYING-OUT LACKS: declared and not set there, from `listAppSecrets` (S1: M1),
   * never the refusal's message; each named by the question we asked for it on the draft.
   */
  const needsSecrets = async (held: Held) => {
    try {
      const [list, asked] = await Promise.all([
        platform.listAppSecrets(held.stagingId),
        ours.askedSecrets(project.id),
      ])
      const missing = list.secrets
        .filter((s) => s.declared && !s.set)
        .map((s) => ({
          name: s.name,
          ask: asked.find((a) => a.name === s.name)?.ask ?? null,
        }))
      if (!live.current) return
      setPhase(
        missing.length === 0
          ? { at: 'question', held }
          : { at: 'secrets', held, missing },
      )
    } catch (error) {
      failed(error, 'listAppSecrets', { at: 'offer' })
    }
  }

  /** IT NEVER ANSWERED: what serves there still, and the attempt that did not start. */
  const neverAnswered = async (held: Held, answered: Schemas['Instance']) => {
    let serving: Said = { words: words.facts.cantTell, tone: 'neutral' }
    let incident: Schemas['Incident'] | undefined
    try {
      const [environments, incidents] = await Promise.all([
        platform.listEnvironments(project.id),
        platform.listIncidents(held.stagingId),
      ])
      const staging = byKind(environments, 'staging')
      if (staging !== undefined) {
        const release =
          staging.instance === null
            ? undefined
            : await platform.getRelease(staging.instance.releaseId).catch(() => undefined)
        serving = servingFact(staging, release, timeZone)
      }
      incident =
        incidents.incidents.find((i) => i.instanceId === answered.id) ??
        incidents.incidents[0]
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') return expire()
    }
    if (!live.current) return
    setPhase({
      at: 'failed',
      held,
      serving,
      attempt: words.preview.facts.failed(
        incident === undefined
          ? null
          : agoWords(new Date(incident.createdAt), now(), timeZone),
      ),
      incidentId: incident?.id ?? null,
    })
  }

  if (phase.at === 'reading' || phase.at === 'none') return null
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
    <section className="trying-out" aria-label={t.put}>
      {noticeCard}
      {phase.at === 'there' ? <p className="body-lead">{t.alreadyThere}</p> : null}
      {phase.at === 'offer' || phase.at === 'asking' ? (
        <div className="describe__actions">
          <Button
            kind="secondary"
            disabled={phase.at === 'asking'}
            onClick={() => void ask()}
          >
            <Unbroken words={t.put} />
          </Button>
        </div>
      ) : null}
      {phase.at === 'question' ? (
        <Card>
          <p className="body-lead">
            {t.question(phase.held.version, phase.held.somethingThere)}
          </p>
          <div className="describe__actions">
            <Button kind="primary" onClick={() => void go(phase.held)}>
              {t.putItThere}
            </Button>
            <Button kind="secondary" onClick={() => setPhase({ at: 'offer' })}>
              {t.notNow}
            </Button>
          </div>
        </Card>
      ) : null}
      {phase.at === 'putting' ? (
        <>
          <StateChip state="working" label={t.working} />
          <Stations instance={phase.instance} />
          <p className="body-lead">{t.real}</p>
          <p className="building__leave">{t.leave}</p>
        </>
      ) : null}
      {phase.at === 'arrived' ? (
        <>
          <Stations instance={{ state: 'healthy' }} />
          <Card className="preview__wait" tone="waiting">
            <StateChip state="waiting" label={words.preview.waitingOn} />
            {phase.hostname === null ? null : (
              <span className="mono">
                <Hostname name={phase.hostname} />
              </span>
            )}
            <p className="body-lead">{t.arrived}</p>
          </Card>
        </>
      ) : null}
      {phase.at === 'failed' ? (
        <>
          <StateChip state="attention" label={t.needsYou} />
          <Stations instance={{ state: 'failed' }} />
          <h2 className="trying-out__title">{t.address}</h2>
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
          {phase.incidentId === null ? null : (
            <WhatWentWrong
              platform={platform}
              ours={ours}
              project={project}
              incidentId={phase.incidentId}
              expire={expire}
            />
          )}
        </>
      ) : null}
      {phase.at === 'secrets' ? (
        <Secrets
          missing={phase.missing}
          onSet={async (values) => {
            setNotice(undefined)
            try {
              for (const { name } of phase.missing)
                await platform.setAppSecret(
                  phase.held.stagingId,
                  name,
                  values[name] ?? '',
                  crypto.randomUUID(),
                )
              if (live.current) setPhase({ at: 'question', held: phase.held })
            } catch (error) {
              failed(error, 'setAppSecret', phase)
            }
          }}
        />
      ) : null}
      {phase.at === 'step-up' ? (
        <Card tone="attention">
          <p className="body-lead">
            <strong>{t.stepUp.title}</strong>
          </p>
          <p className="body-lead">{t.stepUp.body}</p>
          <div className="describe__actions">
            <Button
              kind="primary"
              href={stepUpHref(window.location.pathname + window.location.search)}
            >
              {t.stepUp.again}
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  )
}

/**
 * A LABEL THAT WRAPS AT ITS SPACES ONLY: a hyphenated word ("trying-out") is kept whole, so a narrow
 * button never reads "trying- / out" (the walk at 375, sitting 6). Its text, and so its name, is unchanged.
 */
function Unbroken({ words: said }: { words: string }) {
  // One child: a button lays its children out apart, with a gap between them.
  return (
    <span>
      {said.split(' ').map((word, i) => (
        <Fragment key={i}>
          {i === 0 ? '' : ' '}
          {word.includes('-') ? <span className="trying-out__word">{word}</span> : word}
        </Fragment>
      ))}
    </span>
  )
}

/** The four stations, as `Timeline` draws them, with the one at work said to a screen reader. */
function Stations({ instance }: { instance: Pick<Schemas['Instance'], 'state'> | null }) {
  const stations = stationsOf(instance)
  const label = (key: StationKey, halted: boolean) =>
    halted ? t.stations.never : t.stations[key]
  const now = stations.find((s) => s.state === 'now' || s.state === 'halted')
  return (
    <section className="trying-out__stations" aria-label={t.stationsLabel}>
      <Timeline
        stations={stations.map((s) => ({
          ...label(s.key, s.state === 'halted'),
          state: s.state,
        }))}
      />
      <p className="visually-hidden" role="status">
        {now === undefined
          ? t.stations.answering.label
          : label(now.key, now.state === 'halted').label}
      </p>
    </section>
  )
}

/**
 * A SECRET WITH NO VALUE THERE: needs you, one password field for each, named by the question we
 * asked on the draft. Its value leaves this page for the platform alone, and is emptied once sent.
 */
function Secrets({
  missing,
  onSet,
}: {
  missing: Missing[]
  onSet: (values: Record<string, string>) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [setting, setSetting] = useState(false)
  const short = (name: string) => {
    const value = values[name] ?? ''
    return value.length > 0 && value.length < SECRET_LEAST
  }
  const ready = missing.every(({ name }) => (values[name] ?? '').length >= SECRET_LEAST)
  const field = ({ name, ask }: Missing) => (
    <FormField
      key={name}
      id={`trying-out-secret-${name}`}
      label={ask ?? name}
      value={values[name] ?? ''}
      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
      secret
      hint={words.building.question.secretHint}
      {...(short(name)
        ? {
            message: {
              tone: 'attention',
              title: words.building.question.secretShort,
            },
          }
        : {})}
    />
  )
  // Those we asked for on the draft, then any we never asked for: each said of its own.
  const asked = missing.filter((m) => m.ask !== null)
  const never = missing.filter((m) => m.ask === null)
  return (
    <Card tone="attention">
      <StateChip state="attention" label={t.needsYou} />
      {asked.length === 0 ? null : (
        <>
          <p className="body-lead">{t.secret.asked(asked.length > 1)}</p>
          {asked.map(field)}
        </>
      )}
      {never.length === 0 ? null : (
        <>
          <p className="body-lead">{t.secret.never}</p>
          {never.map(field)}
        </>
      )}
      <div className="describe__actions">
        <Button
          kind="primary"
          disabled={!ready || setting}
          onClick={() => {
            const sent = values
            setValues({})
            setSetting(true)
            void onSet(sent).finally(() => setSetting(false))
          }}
        >
          {t.secret.set}
        </Button>
      </div>
    </Card>
  )
}

/**
 * [WHAT WENT WRONG] ON TRYING-OUT (walk-through moment 9): a fix conversation of ours, carrying the
 * incident, with a token minted for it in their session, then opened. The line starts it, or it
 * waits its turn.
 */
export function WhatWentWrong({
  platform,
  ours,
  project,
  incidentId,
  expire,
}: {
  platform: Platform
  ours: Ours
  project: { id: string; slug: string }
  incidentId: string
  expire: () => void
}) {
  const [pressing, setPressing] = useState(false)
  const [reference, setReference] = useState<string>()
  const press = async () => {
    setPressing(true)
    setReference(undefined)
    let step = 'mintToken'
    try {
      const minted = await platform.mintToken(
        project.id,
        mintRequest(t.fixTitle, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        fix: { incidentId },
        token: minted.secret,
      })
      navigate(
        `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(made.id)}`,
      )
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
          {t.whatWentWrong}
        </Button>
      </div>
    </>
  )
}
