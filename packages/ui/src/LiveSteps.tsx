import type { ReactNode } from 'react'
import { cx } from './cx.js'
import { Icon, TICK } from './icons.js'

export interface Step {
  text: string
  note?: string
  /** `done` ticks, `now` pulses, `next` is dimmed, `halted` is a filled red mark with no tick. */
  state?: 'done' | 'now' | 'next' | 'halted'
  /**
   * OURS (F3 Task 10): under the `now` step, what we are doing now, in a polite live region
   * (LiveSteps/README.md: a screen reader hears the sentence). Drawn on no other step.
   */
  line?: string
  /**
   * OURS (F3 Task 10): the step's disclosure, drawn inside it after its words: a finished
   * step's *What changed*, or a step's exact words while it tries again.
   */
  detail?: ReactNode
}

export interface LiveStepsProps {
  steps?: Step[]
  className?: string
}

/**
 * A LIST OF WHAT IS ACTUALLY HAPPENING, each line ticking when that part has finished, never
 * on a timer (LiveSteps/README.md). An `<ol>`; the current step is `aria-current="step"`.
 * Without `line` and `detail`, its markup is the reference's (parity.test.tsx).
 */
export function LiveSteps(props: LiveStepsProps) {
  const steps = props.steps || []
  return (
    <ol
      className={cx('mf-steps', props.className)}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {steps.map((s, i) => {
        const state = s.state || 'next'
        const words = (
          <>
            <span className="mf-step__text">{s.text}</span>
            {s.note ? (
              <span className="mf-step__note" style={{ display: 'block' }}>
                {s.note}
              </span>
            ) : null}
            {state === 'now' && s.line ? (
              <span
                className="mf-step__line"
                aria-live="polite"
                style={{ display: 'block' }}
              >
                {s.line}
              </span>
            ) : null}
          </>
        )
        return (
          <li
            key={i}
            className={cx('mf-step', 'mf-step--' + state)}
            aria-current={state === 'now' ? 'step' : undefined}
          >
            <span
              className={cx(
                'mf-step__mark',
                'mf-step__mark--' + state,
                state === 'now' && 'mf-pulse',
              )}
            >
              {state === 'done' ? (
                <Icon
                  paths={TICK}
                  size={11}
                  stroke="var(--ink-inverse-strong)"
                  width={3.4}
                />
              ) : null}
            </span>
            {/* A disclosure is flow content, which a <span> may not hold: a step with one is a
                block, and may shrink, so a long line inside it never widens the page. */}
            {s.detail ? (
              <div className="mf-step__body">
                {words}
                <div className="mf-step__detail">{s.detail}</div>
              </div>
            ) : (
              <span>{words}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
