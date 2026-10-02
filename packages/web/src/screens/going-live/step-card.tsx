import { ClockItem, StateChip } from '@manifest-app/ui'
import type { ReactNode } from 'react'
import { words } from '../../words.js'
import type { Step } from './steps.js'

const s = words.goingLive.steps

/**
 * THE THREE STEPS, DRAWN (F5b Task 3, D2): one numbered list in UBC's order. The current step alone
 * is a `ClockItem` card (so one clock card on the page at a time: *"Two at most on a screen"*), with
 * what the caller draws for it under it (its body by step, Tasks 6 and 7); each other step is one
 * line: its state in a word, its name, what it waits for, and what is on file. Nothing moves.
 */
export function Steps({
  steps,
  children,
}: {
  steps: readonly [Step, Step, Step]
  children?: (step: Step) => ReactNode
}) {
  return (
    <ol className="going-live__steps" aria-label={s.label}>
      {steps.map((step) =>
        step.current ? (
          <li key={step.id} className="going-live__step going-live__step--current">
            <ClockItem
              title={s[step.id].title}
              body={bodyOf(step)}
              state={step.state}
              chip={step.chip}
              clockLabel={step.label}
              clockMeta={step.meta}
              {...(step.admission
                ? { admissionTitle: s.admission.title, admissionBody: s.admission.body }
                : {})}
            />
            {step.note === null ? null : (
              <p className="body-small going-live__step-note">{step.note}</p>
            )}
            {children?.(step)}
          </li>
        ) : (
          <li key={step.id} className="going-live__step">
            <StateChip state={step.state} label={step.chip} pulse={false} />
            <div className="going-live__row-words">
              <span className="going-live__name">{s[step.id].title}</span>
              {step.next === null ? null : <p className="body-small">{step.next}</p>}
              {step.label === '' && step.meta === '' ? null : (
                <p className="body-small">
                  {[step.label, step.meta].filter((said) => said !== '').join(' · ')}
                </p>
              )}
            </div>
          </li>
        ),
      )}
    </ol>
  )
}

/** The card's body: the assessment's second sentence only once there is something to start (part two). */
function bodyOf(step: Step): string {
  return step.id === 'assessment' && !step.admission
    ? `${s.assessment.body} ${s.assessment.yours}`
    : s[step.id].body
}
