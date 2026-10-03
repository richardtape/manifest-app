import type { Needs, RoundView } from '@manifest-app/server/progress'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { Children, type ReactNode } from 'react'
import { words } from '../../words.js'
import { monthResetsAt, whenWords } from '../describe/model.js'
import { SupportReference, useReported } from '../reference.js'
import { detailWords } from './detail.js'
import { ADMIN, money, SIGN_IN_REFUSED } from './model.js'

/**
 * What a card's buttons do: Carry on, Try again, Try a different way; Stop here. Every card of
 * a round that still holds its app offers Stop here (F4 Decision 5), or the changes waiting
 * behind it could only move on by Carry on, which spends (the whole-branch review's I1).
 */
export interface Presses {
  /** Absent for a conversation that is not the reader's (F6b D3): only its person carries it on. */
  build?: (way?: 'different') => void
  /** Absent unless it is theirs, or they own the app (F6b D3). */
  stop?: () => void
  /** F6b Decision 10: [Leave it out], their own alone; `leaving` while its change starts. */
  leaveOut?: () => void
  leaving?: boolean
}

/** `plain` is still: a Stop they chose (Rich), which is neither a problem nor a wait. */
type Tone = 'attention' | 'waiting' | 'plain'

/** One card: what is true, its reference where it is a problem, and its buttons. */
function NeedsCard({
  tone,
  first = null,
  said,
  reference,
  children,
}: {
  tone: Tone
  /** Said before the rest: who stopped it (F6b Decision 6). */
  first?: string | null
  said: string
  reference: string | null
  children?: ReactNode
}) {
  return (
    <Card tone={tone}>
      {first === null ? null : <p className="body-lead">{first}</p>}
      <p className="body-lead">{said}</p>
      {reference === null ? null : <SupportReference reference={reference} />}
      {Children.toArray(children).length === 0 ? null : (
        <div className="describe__actions">{children}</div>
      )}
    </Card>
  )
}

/** Each press, drawn only where the reader may make it (F6b D3). */
const build = (presses: Presses, label: string, way?: 'different') => {
  const pressed = presses.build
  return pressed === undefined ? null : (
    <Button kind="primary" onClick={() => (way === undefined ? pressed() : pressed(way))}>
      {label}
    </Button>
  )
}
const carryOn = (presses: Presses) => build(presses, words.building.carryOn)
const stopHere = (presses: Presses) =>
  presses.stop === undefined ? null : (
    <Button kind="secondary" onClick={presses.stop}>
      {words.building.stopHere}
    </Button>
  )

/** Our server restarted under their work (Review Focus 3): a problem, so a reference of ours. */
function Interrupted({ presses }: { presses: Presses }) {
  const reference = useReported({ code: 'ROUND_INTERRUPTED' })
  return (
    <NeedsCard
      tone="attention"
      said={words.building.needs.interrupted}
      reference={reference}
    >
      {carryOn(presses)}
      {stopHere(presses)}
    </NeedsCard>
  )
}

/**
 * M10 (F4's deferred Minor): A NEED THIS PAGE DOES NOT KNOW, from a newer server. Never nothing:
 * our generic words and buttons, with the reference our server recorded, or one of ours,
 * reported once, the kind as its operation (camel-cased, as our server takes one).
 */
function Undrawn({
  kind,
  reference,
  presses,
}: {
  kind: string
  reference: string | null
  presses: Presses
}) {
  if (reference !== null)
    return (
      <NeedsCard tone="attention" said={words.refused.body} reference={reference}>
        {carryOn(presses)}
        {stopHere(presses)}
      </NeedsCard>
    )
  return <UndrawnReported kind={kind} presses={presses} />
}

function UndrawnReported({ kind, presses }: { kind: string; presses: Presses }) {
  const operation = kind
    .replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 64)
  const reference = useReported({
    code: 'NEEDS_NOT_DRAWN',
    ...(/^[a-z]/.test(operation) ? { operation } : {}),
  })
  return (
    <NeedsCard tone="attention" said={words.refused.body} reference={reference}>
      {carryOn(presses)}
      {stopHere(presses)}
    </NeedsCard>
  )
}

/** A need, in words: the walk-through's, Rich's, or ours (words.ts marks which). */
function needCard(
  needs: Exclude<Needs, { kind: 'token' }>,
  reference: string | null,
  presses: Presses,
  now: () => Date,
  timeZone: string | undefined,
): ReactNode {
  const said = words.building.needs
  switch (needs.kind) {
    case 'tries':
      return (
        <NeedsCard
          tone="attention"
          said={said.tries(needs.step, needs.servingBefore)}
          reference={reference}
        >
          {build(presses, words.building.tryDifferent, 'different')}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'checkpoint':
      return (
        <NeedsCard
          tone="attention"
          said={said.checkpoint(
            money(needs.capUsd),
            needs.monthLeftUsd === null ? null : money(needs.monthLeftUsd),
          )}
          reference={null}
        >
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'withdrawn':
      // Not a problem, and not the $2: the platform's rule for confidential data (Rich: ask first).
      return (
        <NeedsCard tone="attention" said={said.withdrawn} reference={null}>
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'month': {
      // Before a first session there is no reset: the contract's rule, the first of the month.
      const resets =
        needs.resetsAt === null ? monthResetsAt(now()) : new Date(needs.resetsAt)
      return (
        <NeedsCard
          tone="attention"
          said={said.month(whenWords(resets, timeZone))}
          reference={reference}
        >
          {stopHere(presses)}
        </NeedsCard>
      )
    }
    case 'conflict':
      return (
        <NeedsCard tone="attention" said={said.conflict} reference={reference}>
          {build(presses, words.building.tryAgain)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'moves':
      return (
        <NeedsCard tone="attention" said={said.moves} reference={reference}>
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'unreachable':
      return (
        <NeedsCard
          tone="waiting"
          said={said.unreachable[needs.what]}
          reference={reference}
        >
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'stalled':
      // F5 Decision 14: Carry on asks again (a retry re-pays, so it is theirs to press).
      return (
        <NeedsCard tone="attention" said={words.stalled[needs.why]} reference={reference}>
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    case 'cannot':
      return (
        <NeedsCard tone="waiting" said={said.cannot(needs.what)} reference={reference} />
      )
    case 'detail': {
      // F6b Decision 9: UBC's identity team must agree first; until FE-47, nothing pretends to ask.
      const d = words.building.detail
      return (
        <NeedsCard
          tone="attention"
          first={d.needs(detailWords(needs.details))}
          said={d.cannotAskYet}
          reference={null}
        >
          {presses.leaving === true ? (
            <StateChip state="working" label={d.leavingOut} />
          ) : presses.leaveOut === undefined ? null : (
            <Button kind="primary" onClick={presses.leaveOut}>
              {d.leaveOut}
            </Button>
          )}
        </NeedsCard>
      )
    }
    case 'refused':
      if (needs.code === SIGN_IN_REFUSED)
        return (
          <NeedsCard tone="waiting" said={said.signInRefused} reference={reference}>
            {carryOn(presses)}
            {stopHere(presses)}
          </NeedsCard>
        )
      return ADMIN.has(needs.code) ? (
        <NeedsCard tone="waiting" said={said.waitingOnAdmin} reference={reference}>
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      ) : (
        <NeedsCard tone="attention" said={words.refused.body} reference={reference}>
          {carryOn(presses)}
          {stopHere(presses)}
        </NeedsCard>
      )
    default: {
      // Every kind above, or typecheck says so; a newer server's kind is still drawn (M10).
      const unknown: never = needs
      return (
        <Undrawn
          kind={String((unknown as { kind?: unknown }).kind)}
          reference={reference}
          presses={presses}
        />
      )
    }
  }
}

/** A need that waits on someone other than its person: said as it is, to whoever reads it. */
const waitsOnOthers = (needs: Exclude<Needs, { kind: 'token' }>): boolean =>
  needs.kind === 'unreachable' ||
  needs.kind === 'cannot' ||
  (needs.kind === 'refused' && (needs.code === SIGN_IN_REFUSED || ADMIN.has(needs.code)))

/**
 * WHAT A ROUND NEEDS OF THEM, ONE CARD (F3 Task 11): each `Needs` in the walk-through's words,
 * a problem's with its reference, and a stopped or interrupted round's own. A token needs
 * nothing of them: the page hands one over without a word (building.tsx).
 */
export function RoundNeeds({
  round,
  presses,
  stoppedBy = null,
  whose = null,
  now,
  timeZone,
}: {
  round: RoundView | null
  presses: Presses
  /**
   * F6b Decision 6: who stopped it, when it says something its own person did not do: *"Stopped
   * by Alex."*, or its person taken off the app, said instead of the card.
   */
  stoppedBy?: { said: string; removed: boolean } | null
  /**
   * F6b D3: the conversation's person, when the reader is someone else. What it needs of its
   * person is theirs to read and answer (their allowance, their Carry on): a colleague reads whose
   * wait it is. A wait on someone else (Manifest, an administrator, the model) is said as it is.
   */
  whose?: string | null
  now: () => Date
  timeZone: string | undefined
}) {
  if (round === null) return null
  const theirs = (presses: Presses) =>
    whose === null ? null : (
      <NeedsCard tone="attention" said={words.together.waitsFor(whose)} reference={null}>
        {stopHere(presses)}
      </NeedsCard>
    )
  if (round.status === 'stopped')
    return stoppedBy?.removed === true ? (
      <NeedsCard tone="plain" said={stoppedBy.said} reference={null} />
    ) : (
      <NeedsCard
        tone="plain"
        first={stoppedBy?.said ?? null}
        said={words.building.needs.stopped}
        reference={null}
      >
        {carryOn(presses)}
      </NeedsCard>
    )
  if (round.status === 'interrupted')
    return theirs(presses) ?? <Interrupted presses={presses} />
  const needs = round.needs
  if (needs === null || needs.kind === 'token') return null
  // A round needs them while it waits; once built, only what it could not add is said.
  if (
    round.status !== 'needs-you' &&
    !(round.status === 'done' && needs.kind === 'cannot')
  )
    return null
  if (whose !== null && !waitsOnOthers(needs)) return theirs(presses)
  return needCard(needs, round.reference, presses, now, timeZone)
}
