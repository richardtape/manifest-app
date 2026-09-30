import { Button } from './Button.js'
import { cx } from './cx.js'
import { ProgressBar } from './ProgressBar.js'
import { StateChip } from './StateChip.js'

export interface ClockItemProps {
  title: string
  body: string
  chip?: string | undefined
  clockLabel?: string | undefined
  clockMeta?: string | undefined
  /** The honest admission, when the platform cannot track the item itself. */
  admissionTitle?: string | undefined
  admissionBody?: string | undefined
  action?: string | undefined
  actionHref?: string | undefined
  className?: string | undefined
  /**
   * OURS (F5 Task 4, Decision 5): the clock's state, from the record an administrator keeps.
   * Absent, the reference's not-started card, byte for byte. `notyet` is that card with the
   * not-yet chip; `waiting` and `steady` fill the bar, still, in their colour.
   */
  state?: 'notyet' | 'waiting' | 'steady' | undefined
}

/**
 * A clock someone has, or one that is done: the reference's track, filled and still, with the
 * caller's words in the state's colour (components.css, `.mf-clockbar`). Never the reference's
 * defaults, which are a not-started clock's words.
 */
function Held(props: {
  state: 'waiting' | 'steady'
  label: string | undefined
  meta: string | undefined
}) {
  return (
    <div className={'mf-clockbar mf-clockbar--' + props.state}>
      <div className="mf-clock" />
      <div className="mf-bar__meta">
        <span>{props.label}</span>
        <span style={{ fontWeight: 600 }}>{props.meta}</span>
      </div>
    </div>
  )
}

/**
 * A THING ANSWERED BY SOMEBODY ELSE, SHOWN LONG BEFORE ANYBODY NEEDS IT (ClockItem/README.md):
 * nothing to tick, only a clock. Never a due date; always who answers it; two at most on a
 * screen. Ported from the reference (F5 Task 4); parity.test.tsx holds its markup without
 * `state`, and ClockItem.test.tsx holds `state`. Nothing on it moves, in any state.
 */
export function ClockItem(props: ClockItemProps) {
  return (
    <div className={cx('mf-clockitem', props.className)}>
      <div className="mf-clockitem__top">
        <h3 className="mf-clockitem__title">{props.title}</h3>
        <StateChip
          state={props.state || 'waiting'}
          label={props.chip || 'Not started'}
          pulse={false}
        />
      </div>
      <p className="mf-clockitem__body">{props.body}</p>
      {props.state === 'waiting' || props.state === 'steady' ? (
        <Held state={props.state} label={props.clockLabel} meta={props.clockMeta} />
      ) : (
        <ProgressBar kind="clock" label={props.clockLabel} meta={props.clockMeta} />
      )}
      {props.admissionTitle ? (
        <div className="mf-admit">
          <span className="mf-admit__title">{props.admissionTitle}</span>
          <p className="mf-admit__body">{props.admissionBody}</p>
        </div>
      ) : null}
      {props.action ? (
        <Button kind="primary" href={props.actionHref || '#'} style={{ width: '100%' }}>
          {props.action}
        </Button>
      ) : null}
    </div>
  )
}
