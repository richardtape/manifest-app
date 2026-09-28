import type { BuildStep, RoundView } from '@manifest-app/server/progress'
import {
  Button,
  Disclosure,
  LiveSteps,
  LogPane,
  StateChip,
  TwoFacts,
  type Step,
} from '@manifest-app/ui'
import type { ReactNode } from 'react'
import { words } from '../../words.js'
import { chipOf, hostOf, linesOf, money } from './model.js'
import { RoundNeeds, type Presses } from './needs.js'

const KEYS: BuildStep[] = ['pages', 'holds', 'build', 'draft', 'answers']
type StepView = RoundView['steps'][number]

/**
 * A STEP'S DISCLOSURE: *What changed* in the lead's own accounts, with the files behind it; or
 * the platform's own words while a try fails. Machine text sits behind a disclosure shut by
 * default, on the inverse surface (InverseSurface/README.md).
 */
function detailOf(step: StepView): ReactNode {
  const lines = step.exact === null ? [] : linesOf(step.exact)
  const exact =
    lines.length === 0 ? null : (
      <Disclosure
        summary={
          step.changed === null ? words.building.exactWords : words.building.exactChanges
        }
        count={lines.length}
        machine
      >
        <LogPane lines={lines} />
      </Disclosure>
    )
  if (step.changed === null) return exact
  return (
    <Disclosure summary={words.building.whatChanged}>
      <p className="building__changed">{step.changed}</p>
      {exact}
    </Disclosure>
  )
}

/** The five steps as LiveSteps draws them: before the first frame, every one to come. */
function stepsOf(round: RoundView | null): Step[] {
  if (round === null)
    return KEYS.map((key) => ({ text: words.building.steps[key], state: 'next' }))
  // A message of theirs waiting is said under the step at work; else the lead's own line.
  const line = round.messageWaiting ? words.building.gotIt : (round.line ?? undefined)
  return round.steps.map((step) => ({
    text: words.building.steps[step.key] + words.building.tries(step.tries),
    state: step.state,
    ...(step.note === null ? {} : { note: step.note }),
    ...(line === undefined ? {} : { line }),
    detail: detailOf(step),
  }))
}

/**
 * THE WORK, ON THE RIGHT (walk-through moment 6, layout C): the state, what it needs of them,
 * the steps with the line under the one at work, the permission to leave, the draft address
 * (and what is serving beside the last attempt, while one fails), the cost, and Stop.
 */
export function Work({
  round,
  connecting,
  notice,
  presses,
  now,
  timeZone,
}: {
  round: RoundView | null
  connecting: boolean
  notice: ReactNode
  presses: Presses
  now: () => Date
  timeZone: string | undefined
}) {
  const chip = chipOf(round)
  const working = round === null || round.status === 'working'
  const stoppable =
    round !== null && (round.status === 'working' || round.status === 'paused')
  const draft = round?.draft ?? null
  const cost = round?.cost
  const costLine =
    cost === undefined || (cost.conversationUsd === null && cost.monthLeftUsd === null)
      ? null
      : words.building.cost(
          cost.conversationUsd === null ? null : money(cost.conversationUsd),
          cost.monthLeftUsd === null ? null : money(cost.monthLeftUsd),
        )
  return (
    <section className="building__work" aria-label={words.building.workLabel}>
      <div className="building__state">
        <StateChip
          state={chip.state}
          label={chip.label}
          {...(chip.pulse === undefined ? {} : { pulse: chip.pulse })}
        />
        {connecting ? (
          <span className="building__quiet" role="status">
            {words.building.reconnecting}
          </span>
        ) : null}
      </div>
      {notice}
      <div className="building__needs" aria-live="polite">
        <RoundNeeds round={round} presses={presses} now={now} timeZone={timeZone} />
      </div>
      <LiveSteps steps={stepsOf(round)} />
      {round?.status === 'done' ? (
        <p className="body-lead">{words.building.startedAndAnswered}</p>
      ) : working ? (
        <p className="building__leave">{words.building.leave}</p>
      ) : null}
      {draft === null ? null : (
        <div className="building__draft">
          <span className="building__label">{words.building.draftAddress}</span>
          <a className="mono" href={draft.address} target="_blank" rel="noreferrer">
            {hostOf(draft.address)}
          </a>
        </div>
      )}
      {draft?.lastAttempt === 'failed' ? (
        <TwoFacts
          serving={{
            overline: words.building.facts.serving,
            title: draft.serving
              ? words.building.facts.servingLastGood
              : words.building.facts.servingNothing,
            tone: draft.serving ? 'steady' : 'neutral',
          }}
          attempt={{
            overline: words.building.facts.attempt,
            title: words.building.facts.attemptFailed,
            tone: 'attention',
          }}
          // The footnote promises an older version answering: only true when one is.
          {...(draft.serving ? {} : { foot: null })}
        />
      ) : null}
      {costLine === null ? null : <p className="building__cost">{costLine}</p>}
      {stoppable ? (
        <div className="building__stop">
          <Button kind="secondary" onClick={presses.stop}>
            {words.building.stop}
          </Button>
          <p className="building__quiet">{words.building.stopNote}</p>
        </div>
      ) : null}
    </section>
  )
}
