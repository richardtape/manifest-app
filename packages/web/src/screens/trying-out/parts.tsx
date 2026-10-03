import type { Schemas } from '@manifest/contract'
import { Button, Card, FormField, StateChip, Timeline } from '@manifest-app/ui'
import { useState } from 'react'
import { stepUpHref } from '../../auth.js'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { PressNotice } from '../change/notice.js'
import { pressFailed, type Notice } from '../change/press.js'
import { mintRequest } from '../making/token.js'
import { stationsOf, type StationKey } from './stations.js'

/**
 * WHAT TRYING-OUT AND GOING LIVE DRAW ALIKE (F5 Decision 10): moved out of put.tsx, so a version
 * put on the trying-out address and one let in to students pass the same stations, ask a secret
 * the same way, and hand a failure to the same fix.
 */

const t = words.tryingOut

/** The platform refuses a value under 6 characters (F3 M1): said before it is sent. */
const SECRET_LEAST = 6

/** A secret the release declares and the address has no value for, named by our question. */
export type Missing = { name: string; ask: string | null }

/**
 * M1 (F5 Decision 11): OUR DEADLINE CUT THE WAIT, NOT THE PLATFORM'S ANSWER. `AbortSignal.timeout`
 * rejects `fetch` with a `TimeoutError` (platform/api.ts): the request went, and the deploy may
 * still finish. A connection refused (a `TypeError`) sent nothing, and is a press that did not go.
 * An older browser says `AbortError` for the same deadline, and nothing else of ours aborts a
 * request (minors m44; `refusal.ts` reads both alike).
 */
export function cutByOurDeadline(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  )
}

/** A new instance in these states never answered, and is not going to (M1). */
export const ENDED_BADLY = new Set<Schemas['Instance']['state']>([
  'failed',
  'destroying',
  'gone',
])

/** After our deadline, the new instance is read every second for up to five minutes more (M1). */
export const UNSURE_READS = 300
/** M2: an attempt's incident not yet written is read once more, this long after. */
export const INCIDENT_AGAIN_MS = 2000

/**
 * M2 (F5 Decision 11, Review Focus 4): THIS ATTEMPT'S INCIDENT, by its instance, never the newest
 * listed, which may be an older attempt's. Undefined when none of its own is listed.
 */
export async function incidentOf(
  platform: Platform,
  environmentId: string,
  instanceId: string,
): Promise<Schemas['Incident'] | undefined> {
  return (await platform.listIncidents(environmentId)).incidents.find(
    (i) => i.instanceId === instanceId,
  )
}

/**
 * M2: none of its own yet (the platform may write it a moment after the attempt ends): read once
 * more, 2 s later, and never again. Still none, undefined: the facts stand without the button.
 */
export async function incidentLater(
  platform: Platform,
  environmentId: string,
  instanceId: string,
): Promise<Schemas['Incident'] | undefined> {
  await new Promise((resolve) => setTimeout(resolve, INCIDENT_AGAIN_MS))
  return incidentOf(platform, environmentId, instanceId).catch(() => undefined)
}

/**
 * The four stations, as `Timeline` draws them, with the one at work said to a screen reader;
 * named for where the version is going (trying-out's by default).
 */
export function Stations({
  instance,
  name = t.stationsLabel,
}: {
  instance: Pick<Schemas['Instance'], 'state'> | null
  name?: string
}) {
  const stations = stationsOf(instance)
  const label = (key: StationKey, halted: boolean) =>
    halted ? t.stations.never : t.stations[key]
  const now = stations.find((s) => s.state === 'now' || s.state === 'halted')
  return (
    <section className="trying-out__stations" aria-label={name}>
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
export function Secrets({
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
 * SIGNING IN AGAIN, IN PLACE (moment 14's card): *[Sign in again]* goes to the platform's step-up
 * and back to `returnTo`. The platform never replays the refused request: they press again. The
 * card's rule, about what reaches students, is said only where it is true (going live).
 */
export function StepUpCard({
  returnTo,
  aboutStudents = false,
}: {
  returnTo: string
  aboutStudents?: boolean
}) {
  return (
    // Said to a screen reader too: the button they pressed is gone (the final review's M8).
    <div role="alert">
      <Card tone="attention">
        <p className="body-lead">
          <strong>{t.stepUp.title}</strong>
        </p>
        <p className="body-lead">{t.stepUp.body}</p>
        {aboutStudents ? (
          <p className="body-lead">{words.goingLive.letIn.stepUpRule}</p>
        ) : null}
        <div className="describe__actions">
          <Button kind="primary" href={stepUpHref(returnTo)}>
            {t.stepUp.again}
          </Button>
        </div>
      </Card>
    </div>
  )
}

/**
 * [WHAT WENT WRONG] ON TRYING-OUT (walk-through moment 9), AND ON THE LIVE ADDRESS (moment 14; F5
 * Decision 13): a fix conversation of ours, carrying the incident and the address it happened on,
 * with a token minted for it in their session, then opened. The line starts it, or it waits its
 * turn. A fix already under way for the same incident is opened instead: its round deploys to the
 * draft, so the failed attempt, and this button, stay until the fixed version is put there (the
 * whole-branch review's I2).
 */
export function WhatWentWrong({
  platform,
  ours,
  project,
  incidentId,
  environment = 'staging',
  expire,
}: {
  platform: Platform
  ours: Ours
  project: { id: string; slug: string; name: string }
  incidentId: string
  /** Where it did not start: trying-out's (F4's fix, sent as F4 sent it) or the live address. */
  environment?: 'staging' | 'production'
  expire: () => void
}) {
  const [pressing, setPressing] = useState(false)
  const [reference, setReference] = useState<Notice>()
  const press = async () => {
    setPressing(true)
    setReference(undefined)
    let step = 'fixFor'
    const open = (id: string) =>
      navigate(
        `/apps/${encodeURIComponent(project.slug)}/conversations/${encodeURIComponent(id)}`,
      )
    try {
      const under = await ours.fixFor(project.id, incidentId)
      if (under !== null) {
        open(under.id)
        return
      }
      step = 'mintToken'
      const live = environment === 'production'
      const minted = await platform.mintToken(
        project.id,
        mintRequest(live ? words.goingLive.letIn.fixTitle : t.fixTitle, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        fix: live ? { incidentId, environment } : { incidentId },
        token: minted.secret,
        tokenId: minted.token.id,
      })
      open(made.id)
    } catch (error) {
      setPressing(false)
      const said = pressFailed(error, step)
      if (said.expired) expire()
      else setReference(said)
    }
  }
  return (
    <>
      {reference === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <PressNotice notice={reference} name={project.name} couldnt={t.couldnt} />
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
