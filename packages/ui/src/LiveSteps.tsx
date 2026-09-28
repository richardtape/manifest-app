import { cx } from './cx.js'
import { Icon, TICK } from './icons.js'

export interface Step {
  text: string
  note?: string
  /** `done` ticks, `now` pulses, `next` is dimmed, `halted` is a filled red mark with no tick. */
  state?: 'done' | 'now' | 'next' | 'halted'
}

export interface LiveStepsProps {
  steps?: Step[]
  className?: string
}

/**
 * A LIST OF WHAT IS ACTUALLY HAPPENING, each line ticking when that part has finished, never
 * on a timer (LiveSteps/README.md). An `<ol>`; the current step is `aria-current="step"`.
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
            <span>
              <span className="mf-step__text">{s.text}</span>
              {s.note ? (
                <span className="mf-step__note" style={{ display: 'block' }}>
                  {s.note}
                </span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
