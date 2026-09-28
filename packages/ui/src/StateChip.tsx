import { cx } from './cx.js'

/** The five states. Every status in the product is one of these and no others. */
export type State = 'working' | 'waiting' | 'attention' | 'steady' | 'notyet'

const STATES: readonly string[] = ['working', 'waiting', 'attention', 'steady', 'notyet']

export interface StateChipProps {
  state: State
  /** Working states name a duration here: "Working, a few minutes". */
  label: string
  /** Defaults to true for `working` and `attention`, false for the rest. */
  pulse?: boolean
  className?: string
}

/** A dot and a word, never colour alone. A state from a newer contract is `notyet`. */
export function StateChip(props: StateChipProps) {
  const state = STATES.includes(props.state) ? props.state : 'notyet'
  const pulse =
    props.pulse === undefined ? state === 'working' || state === 'attention' : props.pulse
  return (
    <span className={cx('mf-chip', 'mf-is-' + state, props.className)}>
      <span className={cx('mf-chip__dot', pulse && 'mf-pulse')} />
      {props.label}
    </span>
  )
}
