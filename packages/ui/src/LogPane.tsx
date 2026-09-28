import type { CSSProperties } from 'react'
import { cx } from './cx.js'

export interface LogPaneProps {
  lines: string[]
  /** How many lines were already stored when the view opened; those render muted. */
  writtenBefore?: number
  className?: string
  style?: CSSProperties
}

/**
 * THE MACHINE'S OWN WORDS, NUMBERED (InverseSurface/README.md): the numbers muted and never
 * selected with the text; lines written before the view opened muted too. Ported from the
 * reference (F3 Task 10); parity.test.tsx holds its markup.
 */
export function LogPane(props: LogPaneProps) {
  const lines = props.lines || []
  const written = props.writtenBefore === undefined ? 0 : props.writtenBefore
  return (
    <div className={cx('mf-log', props.className)} style={props.style}>
      {lines.map((text, i) => (
        <div key={i} className={i < written ? 'mf-log__line--old' : undefined}>
          <span className="mf-log__num">{String(i + 1).padStart(3, ' ') + '  '}</span>
          {text}
        </div>
      ))}
    </div>
  )
}
