import type { Needs, RoundView } from '@manifest-app/server/progress'
import { Button, Card } from '@manifest-app/ui'
import type { ReactNode } from 'react'
import { words } from '../../words.js'
import { monthResetsAt, whenWords } from '../describe/model.js'
import { SupportReference, useReported } from '../reference.js'
import { ADMIN, money } from './model.js'

/** What a card's buttons do: Carry on, Try again, Try a different way; Stop here. */
export interface Presses {
  build: (way?: 'different') => void
  stop: () => void
}

type Tone = 'attention' | 'waiting'

/** One card: what is true, its reference where it is a problem, and its buttons. */
function NeedsCard({
  tone,
  said,
  reference,
  children,
}: {
  tone: Tone
  said: string
  reference: string | null
  children?: ReactNode
}) {
  return (
    <Card tone={tone}>
      <p className="body-lead">{said}</p>
      {reference === null ? null : <SupportReference reference={reference} />}
      {children === undefined ? null : (
        <div className="describe__actions">{children}</div>
      )}
    </Card>
  )
}

const carryOn = (presses: Presses) => (
  <Button kind="primary" onClick={() => presses.build()}>
    {words.building.carryOn}
  </Button>
)
const stopHere = (presses: Presses) => (
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
          <Button kind="primary" onClick={() => presses.build('different')}>
            {words.building.tryDifferent}
          </Button>
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
    case 'month': {
      // Before a first session there is no reset: the contract's rule, the first of the month.
      const resets =
        needs.resetsAt === null ? monthResetsAt(now()) : new Date(needs.resetsAt)
      return (
        <NeedsCard
          tone="attention"
          said={said.month(whenWords(resets, timeZone))}
          reference={reference}
        />
      )
    }
    case 'conflict':
      return (
        <NeedsCard tone="attention" said={said.conflict} reference={reference}>
          <Button kind="primary" onClick={() => presses.build()}>
            {words.building.tryAgain}
          </Button>
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
        </NeedsCard>
      )
    case 'cannot':
      return (
        <NeedsCard tone="waiting" said={said.cannot(needs.what)} reference={reference} />
      )
    case 'refused':
      return ADMIN.has(needs.code) ? (
        <NeedsCard tone="waiting" said={said.waitingOnAdmin} reference={reference}>
          {carryOn(presses)}
        </NeedsCard>
      ) : (
        <NeedsCard tone="attention" said={words.refused.body} reference={reference}>
          {carryOn(presses)}
        </NeedsCard>
      )
  }
}

/**
 * WHAT A ROUND NEEDS OF THEM, ONE CARD (F3 Task 11): each `Needs` in the walk-through's words,
 * a problem's with its reference, and a stopped or interrupted round's own. A token needs
 * nothing of them: the page hands one over without a word (building.tsx).
 */
export function RoundNeeds({
  round,
  presses,
  now,
  timeZone,
}: {
  round: RoundView | null
  presses: Presses
  now: () => Date
  timeZone: string | undefined
}) {
  if (round === null) return null
  if (round.status === 'stopped')
    return (
      <NeedsCard tone="attention" said={words.building.needs.stopped} reference={null}>
        {carryOn(presses)}
      </NeedsCard>
    )
  if (round.status === 'interrupted') return <Interrupted presses={presses} />
  const needs = round.needs
  if (needs === null || needs.kind === 'token') return null
  // A round needs them while it waits; once built, only what it could not add is said.
  if (
    round.status !== 'needs-you' &&
    !(round.status === 'done' && needs.kind === 'cannot')
  )
    return null
  return needCard(needs, round.reference, presses, now, timeZone)
}
