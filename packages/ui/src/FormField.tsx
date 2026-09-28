import type { ChangeEvent } from 'react'
import { cx } from './cx.js'
import { Icon, TICK } from './icons.js'

export type Tone = 'steady' | 'attention' | 'working' | 'neutral'

export interface FieldMessage {
  tone: Tone
  /** The platform's own `message`. Never rewrite it (FormField/README.md). */
  title: string
  /** The platform's own `hint`. */
  body?: string
}

/**
 * OUR EXTENSION (F2's deferred Minor, Rich: say the limits): how much is typed, near a limit.
 * Words, never colour alone: over the limit, `text` says so.
 */
export interface FieldCountProps {
  id: string
  text: string
  over: boolean
}

/** The count, beneath a field; on its own for a field that is not a FormField. */
export function FieldCount({ id, text, over }: FieldCountProps) {
  return (
    <p
      id={id}
      className={cx('mf-field__count', over && 'mf-field__count--over')}
      aria-live="polite"
    >
      {text}
    </p>
  )
}

export interface FormFieldProps {
  label: string
  hint?: string
  value?: string
  placeholder?: string
  mono?: boolean
  id?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  message?: FieldMessage
  /** Near a limit: how much is typed (ours; not in the reference). */
  count?: { text: string; over: boolean }
  className?: string
}

/** The bundle's TONE, the colours a message takes. */
const TONE: Record<string, { bg: string; bd: string; fg: string; note: string }> = {
  steady: {
    bg: 'var(--steady-tint)',
    bd: 'var(--steady-border)',
    fg: 'var(--steady)',
    note: 'var(--steady-muted)',
  },
  attention: {
    bg: 'var(--attention-tint)',
    bd: 'var(--attention-border)',
    fg: 'var(--attention)',
    note: 'var(--attention-muted)',
  },
  working: {
    bg: 'var(--working-tint)',
    bd: 'var(--working-border)',
    fg: 'var(--working-deep)',
    note: 'var(--working-deep)',
  },
  neutral: {
    bg: 'var(--surface-sunken)',
    bd: 'var(--border-subtle)',
    fg: 'var(--ink-subtle)',
    note: 'var(--ink-muted)',
  },
}

/**
 * LABEL, HINT, CONTROL, AND THE PLATFORM'S OWN WORDS when it refuses (FormField/README.md):
 * the message as the bold line, the hint beneath, never rewritten. The hint sits above the
 * control, because it changes what a person types. The message is `role="status"`, and the
 * input names it with `aria-describedby`.
 */
export function FormField(props: FormFieldProps) {
  const id = props.id || 'mf-field'
  const msg = props.message
  const t = msg ? TONE[msg.tone] || TONE['neutral']! : null
  const describedBy = [props.count && id + '-count', msg && id + '-msg']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cx('mf-field', props.className)}>
      <label className="mf-field__label" htmlFor={id}>
        {props.label}
      </label>
      {props.hint ? <p className="mf-field__hint">{props.hint}</p> : null}
      <input
        id={id}
        type="text"
        className={cx('mf-field__input', props.mono && 'mf-field__input--mono')}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        aria-describedby={describedBy || undefined}
        readOnly={!props.onChange}
      />
      {props.count ? <FieldCount id={id + '-count'} {...props.count} /> : null}
      {msg && t ? (
        <div
          id={id + '-msg'}
          className="mf-msg"
          role="status"
          style={{
            background: t.bg,
            border: '1px solid ' + t.bd,
            alignItems: msg.body ? 'flex-start' : 'center',
          }}
        >
          {msg.tone === 'steady' ? (
            <Icon paths={TICK} size={17} stroke="var(--steady)" width={2.2} />
          ) : (
            <Icon
              paths={['M12 7v6', 'M12 16.5v.01']}
              size={17}
              stroke="var(--attention)"
              width={2}
            />
          )}
          <div>
            <p className="mf-msg__title" style={{ color: t.fg }}>
              {msg.title}
            </p>
            {msg.body ? (
              <p className="mf-msg__body" style={{ color: t.note }}>
                {msg.body}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
