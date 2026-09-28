import type { ReactNode } from 'react'
import { cx } from './cx.js'
import { InverseSurface } from './InverseSurface.js'

export interface DisclosureProps {
  /** What is inside, in our words: "What changed", "The exact words, for whoever you ask for help". */
  summary: string
  /** How many lines are inside, said while it is shut. */
  count?: number
  /** Machine text on purpose: the body is the inverse surface (InverseSurface/README.md). */
  machine?: boolean
  children: ReactNode
  className?: string
}

/**
 * A DISCLOSURE, OURS (F3 Task 10): the reference has none. A native `<details>`, shut by
 * default, so the browser gives it a keyboard, its role and its open state. The design
 * system's rule for machine text: "behind a disclosure that is shut by default", collapsed to
 * a line count; its summary stays in the product's voice, off the inverse surface.
 */
export function Disclosure(props: DisclosureProps) {
  return (
    <details
      className={cx(
        'mf-disclosure',
        props.machine && 'mf-disclosure--machine',
        props.className,
      )}
    >
      <summary className="mf-disclosure__summary">
        {props.summary}
        {props.count === undefined ? null : (
          <span className="mf-disclosure__count">
            {` · ${props.count} ${props.count === 1 ? 'line' : 'lines'}`}
          </span>
        )}
      </summary>
      {props.machine ? (
        <InverseSurface className="mf-disclosure__body">{props.children}</InverseSurface>
      ) : (
        <div className="mf-disclosure__body">{props.children}</div>
      )}
    </details>
  )
}
