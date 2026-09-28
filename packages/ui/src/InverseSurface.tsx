import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.js'
import { Icon, WARN } from './icons.js'

export interface InverseSurfaceProps {
  title?: string
  body?: string
  /** A mono inset: a key, a code block. Selectable in full. */
  inset?: string
  /** Shows the warning mark. Used once in the product, above a one-time key. */
  warn?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * MACHINE TEXT A PERSON IS SHOWN ON PURPOSE (InverseSurface/README.md): the build log, a
 * delegated key, an incident's repair prompt, and nothing else. Never for emphasis. Ported
 * from the reference (F3 Task 10); parity.test.tsx holds its markup.
 */
export function InverseSurface(props: InverseSurfaceProps) {
  return (
    <div className={cx('mf-inverse', props.className)} style={props.style}>
      {props.title ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {props.warn ? (
            <Icon paths={WARN} size={18} stroke="var(--warning-mark)" />
          ) : null}
          <h3 className="mf-inverse__title">{props.title}</h3>
        </div>
      ) : null}
      {props.body ? <p className="mf-inverse__body">{props.body}</p> : null}
      {props.inset ? <div className="mf-inverse__inset">{props.inset}</div> : null}
      {props.children}
    </div>
  )
}
