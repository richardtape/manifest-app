import type { KeyboardEvent } from 'react'
import { cx } from './cx.js'

export interface SegmentOption {
  value: string
  label: string
  /** OURS (F4 Task 2): the id of the panel this tab shows, as `aria-controls`. */
  controls?: string
}

export interface SegmentedControlProps {
  options: (string | SegmentOption)[]
  value: string
  onChange?: (value: string) => void
  /** `tablist` when the segments switch panels (the default); `radiogroup` when they set a value. */
  role?: 'tablist' | 'radiogroup' | undefined
  /** OURS (F4 Task 2): the group's accessible name, as `aria-label`. */
  label?: string | undefined
  className?: string
}

/** Which way each key moves. A radiogroup's segments answer up and down too, as radio buttons do. */
const STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }
const RADIO_STEP: Record<string, number> = { ...STEP, ArrowDown: 1, ArrowUp: -1 }

/**
 * SWITCHES WHAT YOU ARE LOOKING AT, NEVER WHAT YOU ARE DOING (SegmentedControl/README.md): real
 * `<button>`s in a `tablist`, or a `radiogroup` when they set a value.
 * OURS (F4 Task 2): arrow keys move the selection and the focus, wrapping, and Home and End go
 * to either end; only the selected segment is in the tab order. Without `controls` and `label`,
 * and `tabindex` aside, its markup is the reference's (parity.test.tsx).
 */
export function SegmentedControl(props: SegmentedControlProps) {
  const options = (props.options || []).map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  )
  const radio = props.role === 'radiogroup'
  const chosen = options.findIndex((o) => o.value === props.value)
  // Never out of reach: with nothing selected, the first segment takes the tab stop.
  const stop = chosen === -1 ? 0 : chosen

  const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const last = options.length - 1
    const step = (radio ? RADIO_STEP : STEP)[event.key]
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : step === undefined
            ? null
            : (from + step + options.length) % options.length
    if (to === null) return
    event.preventDefault()
    const buttons = event.currentTarget.parentElement?.querySelectorAll('button')
    buttons?.[to]?.focus()
    if (props.onChange) props.onChange(options[to]!.value)
  }

  return (
    <div
      className={cx('mf-seg', props.className)}
      role={props.role || 'tablist'}
      aria-label={props.label}
    >
      {options.map((o, i) => {
        const on = o.value === props.value
        return (
          <button
            key={i}
            type="button"
            role={radio ? 'radio' : 'tab'}
            className={cx('mf-seg__tab', on && 'mf-seg__tab--on')}
            aria-selected={radio ? undefined : on}
            aria-checked={radio ? on : undefined}
            onClick={() => {
              if (props.onChange) props.onChange(o.value)
            }}
            onKeyDown={(event) => move(event, i)}
            tabIndex={i === stop ? 0 : -1}
            aria-controls={o.controls}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
