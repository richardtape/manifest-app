import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.js'

export interface CardProps {
  tone?: 'plain' | 'working' | 'waiting' | 'steady' | 'attention'
  title?: string
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card(props: CardProps) {
  const tone = props.tone || 'plain'
  return (
    <div
      className={cx('mf-card', tone !== 'plain' && 'mf-card--' + tone, props.className)}
      style={props.style}
    >
      {props.title ? <h3 className="mf-card__title">{props.title}</h3> : null}
      {props.children}
    </div>
  )
}
