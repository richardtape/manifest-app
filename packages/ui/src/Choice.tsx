import { cx } from './cx.js'

export interface ChoiceOption {
  title: string
  note?: string
  value: string
  checked?: boolean
}

export interface ChoiceProps {
  type?: 'radio' | 'checkbox'
  name?: string
  label?: string
  options?: ChoiceOption[]
  /** Radio only; undefined is nothing chosen yet. Checkboxes carry `checked` per option. */
  value?: string | undefined
  onChange?: (value: string) => void
  className?: string
}

/**
 * CARDS, NOT CONTROLS (Choice/README.md): every option a `<label>` around a real `<input>`,
 * so the whole card is the hit target and Tab reaches it. Titles are the person's words, notes
 * the consequence. A radio group is a `radiogroup`; checkboxes a `group`.
 */
export function Choice(props: ChoiceProps) {
  const type = props.type === 'checkbox' ? 'checkbox' : 'radio'
  const options = props.options || []
  return (
    <div
      className={cx('mf-choices', props.className)}
      role={type === 'radio' ? 'radiogroup' : 'group'}
      aria-label={props.label}
    >
      {options.map((o, i) => {
        const on = type === 'radio' ? o.value === props.value : !!o.checked
        return (
          <label key={i} className={cx('mf-choice', on && 'mf-choice--on')}>
            <input
              type={type}
              name={props.name}
              checked={on}
              onChange={() => {
                if (props.onChange) props.onChange(o.value)
              }}
            />
            <span>
              <span className="mf-choice__title" style={{ display: 'block' }}>
                {o.title}
              </span>
              {o.note ? (
                <span className="mf-choice__note" style={{ display: 'block' }}>
                  {o.note}
                </span>
              ) : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}
