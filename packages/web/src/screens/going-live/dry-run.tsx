import type { Schemas } from '@manifest/contract'
import { Button, Card } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { navigate } from '../../router.js'
import { words } from '../../words.js'
import { pressFailed } from '../change/press.js'
import { mintRequest } from '../making/token.js'
import { SupportReference } from '../reference.js'
import {
  cutByOurDeadline,
  incidentLater,
  incidentOf,
  StepUpCard,
  WhatWentWrong,
} from '../trying-out/parts.js'
import { newestAttempt } from '../trying-out/stations.js'
import type { Five, Row } from './checklist.js'
import { RowView } from './row.js'

const r = words.goingLive.rows
const o = words.goingLive.owners
const d = words.goingLive.dryRun

/** After our deadline, the checklist is read this often for the row to move (Review Focus 3)… */
export const DRY_RUN_POLL_MS = 5000
/** …this many times: five minutes more. */
export const DRY_RUN_READS = 60

/**
 * The platform's answers that mean the page's reading is out of date: nothing on trying-out now,
 * launched meanwhile, or an app that signs nobody in (its item met). The page reads again.
 */
const READ_AGAIN = new Set([
  'REHEARSAL_NO_CANDIDATE',
  'REHEARSAL_LAUNCHED',
  'REHEARSAL_NOT_CWL',
])

/**
 * THE DRY RUN'S ROW, MOMENT 12 (F5 Task 7), pure: read from the checklist item alone, since no
 * operation reads a rehearsal back. Since the platform's 4a (FE-42 (a)) the owner may run it, and
 * Rich brought the press back (2026-09-30, "Build it now"):
 * - nothing on trying-out: not yet, once a version is there (S1: M3);
 * - a version there, not yet passed: needs you, theirs to start;
 * - passed: done.
 *
 * A run that failed reads, from the checklist, as one not yet run: only the press's own answer
 * says what it saw. Keyed on `state` and a candidate, never on `why` (FE-9).
 */
export function dryRunRow(item: Schemas['LaunchReadinessItem'], candidate: boolean): Row {
  const row = (state: Five, said: string, action: Row['action'] = null): Row => ({
    id: item.id,
    state,
    owner: o.youStart,
    name: r.rehearsal.name,
    words: said,
    address: null,
    action,
    apart: false,
  })
  if (item.state === 'not_built')
    return { ...row('notyet', r.notTracked), owner: o.nobody }
  if (item.state === 'met') return row('steady', r.rehearsal.met)
  return candidate
    ? row('attention', r.rehearsal.yours, 'dry-run')
    : row('notyet', r.once)
}

type Phase =
  /** The row as the page read it; `said`, a line of ours about the last press. */
  | { at: 'offer'; said: string | null }
  | { at: 'running' }
  /** Our deadline cut the wait (Review Focus 3): the checklist read until the row moves. */
  | { at: 'unsure' }
  | { at: 'passed' }
  /** It signed nobody in: what it saw, for *[Fix it]*. */
  | { at: 'failed'; rehearsal: Schemas['Rehearsal'] }
  /** Its start never answered (REHEARSAL_DEPLOY_FAILED): this attempt's incident, once read. */
  | { at: 'didnt-start'; incidentId: string | null }
  | { at: 'step-up' }

/**
 * THE DRY RUN, DRAWN AND PRESSED (walk-through moment 12; F5 Task 7, Decision 8). **Everything
 * here is the person's own session, in the browser**: our server never runs it, and is only handed
 * what a failed one saw, for a fix.
 * - **[Run the dry run]** sends one `runRehearsal`, and the row works while it runs: *"You can
 *   leave: it carries on."* (S1: M4). It ends done, or needs you with *[Fix it]*.
 * - **A second sign-in** (Spec action 8 (b)) is a card in place; *[Sign in again]* comes back with
 *   `?then=dry-run`, and one press runs it.
 * - **Our deadline is not its answer**: the checklist is read until the row moves.
 */
export function DryRun({
  row,
  platform,
  ours,
  project,
  production,
  back,
  expire,
  onRan,
}: {
  row: Row
  platform: Platform
  ours: Ours
  project: Schemas['Project']
  /** The live address, as the page read it: where this attempt's start is told apart. */
  production: Schemas['Environment'] | undefined
  /** Back from signing in again (`?then=dry-run`): the same button, said so. */
  back: boolean
  expire: () => void
  /** Its answer moved the checklist: the page reads it again. */
  onRan: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'offer', said: null })
  const [pressedOnce, setPressedOnce] = useState(false)
  const [reference, setReference] = useState<string>()
  const [fixing, setFixing] = useState(false)
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

  const press = async () => {
    setPressedOnce(true)
    setReference(undefined)
    setPhase({ at: 'running' })
    // M2: what the live setup listed at the press, so a start that failed is this attempt's.
    let listed: ReadonlySet<string> | null = null
    if (production !== undefined)
      try {
        listed = new Set(
          (await platform.listInstances(production.id)).instances.map((i) => i.id),
        )
      } catch (error) {
        if (refusalOf(error).kind === 'signed-out') return expire()
      }
    let ran: Schemas['Rehearsal']
    try {
      ran = await platform.runRehearsal(project.id, crypto.randomUUID())
    } catch (error) {
      if (!live.current) return
      if (cutByOurDeadline(error)) return readOn()
      return refused(error, listed)
    }
    if (!live.current) return
    if (!ran.passed) return setPhase({ at: 'failed', rehearsal: ran })
    setPhase({ at: 'passed' })
    onRan()
  }

  const refused = (error: unknown, listed: ReadonlySet<string> | null) => {
    const refusal = refusalOf(error)
    const code = refusal.kind === 'refused' ? refusal.code : null
    if (code === 'STEP_UP_REQUIRED') return setPhase({ at: 'step-up' })
    if (code !== null && READ_AGAIN.has(code)) {
      setPhase({ at: 'offer', said: null })
      return onRan()
    }
    // The platform's 5b (Spec action 8 (c)): it ran, and its take-down was refused.
    if (code === 'REHEARSAL_TEARDOWN_FAILED')
      return setPhase({ at: 'offer', said: d.teardown })
    if (code === 'REHEARSAL_DEPLOY_FAILED') return void didntStart(listed)
    const said = pressFailed(error, 'runRehearsal')
    if (said.expired) return expire()
    setReference(said.reference)
    setPhase({ at: 'offer', said: null })
  }

  /** Its start never answered: M2's *[What went wrong]*, fed by THIS attempt's incident. */
  const didntStart = async (listed: ReadonlySet<string> | null) => {
    setPhase({ at: 'didnt-start', incidentId: null })
    if (production === undefined || listed === null) return
    try {
      const attempt = newestAttempt(
        (await platform.listInstances(production.id)).instances,
        listed,
      )
      if (attempt === null) return
      const found =
        (await incidentOf(platform, production.id, attempt.id)) ??
        (await incidentLater(platform, production.id, attempt.id))
      if (found === undefined || !live.current) return
      setPhase((p) =>
        p.at === 'didnt-start' ? { at: 'didnt-start', incidentId: found.id } : p,
      )
    } catch (error) {
      if (refusalOf(error).kind === 'signed-out') expire()
    }
  }

  /**
   * OUR DEADLINE CUT THE WAIT, NOT THE DRY RUN (Review Focus 3): never "it failed". The checklist
   * is read every 5 s for five minutes; the item met is done, and the page reads again. Still
   * unmet by then, we say we could not see how it ended, and offer it again.
   */
  const readOn = () => {
    setPhase({ at: 'unsure' })
    let reads = 0
    let ended = false
    const gaveUp = () =>
      setPhase((p) => (p.at === 'unsure' ? { at: 'offer', said: d.unsureLong } : p))
    clearInterval(poll.current)
    poll.current = setInterval(() => {
      reads += 1
      const last = reads >= DRY_RUN_READS
      if (last) clearInterval(poll.current)
      platform.getLaunchReadiness(project.id).then(
        (readiness) => {
          if (!live.current || ended) return
          const item = readiness.items.find((i) => i.id === row.id)
          if (readiness.launched || item?.state === 'met') {
            ended = true
            clearInterval(poll.current)
            if (item?.state === 'met') setPhase({ at: 'passed' })
            return onRan()
          }
          if (last) gaveUp()
        },
        () => live.current && !ended && last && gaveUp(),
      )
    }, DRY_RUN_POLL_MS)
  }

  /**
   * [FIX IT]: the fix already under way for this dry run, or a token minted in their session,
   * named for it, and what the dry run saw handed to our server with it: never its `reason`.
   */
  const fix = async (rehearsal: Schemas['Rehearsal']) => {
    setFixing(true)
    setReference(undefined)
    const open = (id: string) =>
      navigate(`/apps/${slug}/conversations/${encodeURIComponent(id)}`)
    let step = 'fixForDryRun'
    try {
      const under = await ours.fixForDryRun(project.id, rehearsal.id)
      if (under !== null) return open(under.id)
      step = 'mintToken'
      const minted = await platform.mintToken(
        project.id,
        mintRequest(d.fixTitle, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(project.id, {
        fix: {
          dryRun: {
            rehearsalId: rehearsal.id,
            signInStatus: rehearsal.evidence.signInStatus,
            attributesReleased: rehearsal.evidence.attributesReleased,
            attributesAsked: rehearsal.attributes,
          },
        },
        token: minted.secret,
      })
      open(made.id)
    } catch (error) {
      setFixing(false)
      const said = pressFailed(error, step)
      if (said.expired) expire()
      else setReference(said.reference)
    }
  }

  const noticeCard =
    reference === undefined ? null : (
      <div role="alert">
        <Card tone="attention">
          <p className="body-small">{words.tryingOut.couldnt}</p>
          <SupportReference reference={reference} />
        </Card>
      </div>
    )
  const as = (state: Five, said: string): Row => ({
    ...row,
    state,
    words: said,
    action: null,
  })

  switch (phase.at) {
    case 'running':
      return (
        <RowView row={as('working', d.running)}>
          <p className="body-small">{d.leave}</p>
        </RowView>
      )
    case 'unsure':
      return (
        <RowView row={as('working', d.running)}>
          <p className="body-small" role="status">
            {d.unsure}
          </p>
        </RowView>
      )
    case 'passed':
      return <RowView row={as('steady', r.rehearsal.met)} />
    case 'failed':
      return (
        <RowView row={as('attention', d.failed)}>
          {noticeCard}
          <div className="going-live__row-action">
            <Button
              kind="secondary"
              size="sm"
              disabled={fixing}
              onClick={() => void fix(phase.rehearsal)}
            >
              {d.fixIt}
            </Button>
          </div>
        </RowView>
      )
    case 'didnt-start':
      return (
        <RowView row={as('attention', d.didntStart)}>
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
        </RowView>
      )
    case 'step-up':
      return (
        <RowView row={{ ...row, action: null }}>
          <StepUpCard returnTo={`/apps/${slug}/going-live?then=dry-run`} />
        </RowView>
      )
    case 'offer':
      if (row.action !== 'dry-run') return <RowView row={row} />
      return (
        <RowView row={row}>
          {noticeCard}
          {back && !pressedOnce ? (
            <p className="body-small">{words.goingLive.letIn.again}</p>
          ) : null}
          {phase.said === null ? null : (
            <p className="body-small" role="status">
              {phase.said}
            </p>
          )}
          <div className="going-live__row-action">
            <Button kind="secondary" size="sm" onClick={() => void press()}>
              {d.button}
            </Button>
          </div>
        </RowView>
      )
  }
}
