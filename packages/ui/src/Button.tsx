import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.js'

export interface ButtonProps {
  kind?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghostDanger'
  size?: 'sm'
  /** Renders an <a> instead of a <button>. */
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/** Attributes in the bundle's order, so the markup is the reference's (Decision 2). */
export function Button(props: ButtonProps) {
  const className = cx(
    'mf-btn',
    'mf-btn--' + (props.kind || 'primary'),
    props.size === 'sm' && 'mf-btn--sm',
    props.className,
  )
  if (props.href)
    return (
      <a
        className={className}
        style={props.style}
        onClick={props.onClick}
        href={props.href}
      >
        {props.children}
      </a>
    )
  return (
    <button
      className={className}
      style={props.style}
      onClick={props.onClick}
      type={props.type || 'button'}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
