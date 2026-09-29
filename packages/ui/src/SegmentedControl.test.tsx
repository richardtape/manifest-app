// @vitest-environment jsdom
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { SegmentedControl, type SegmentOption } from './index.js'

/**
 * OUR ADDITIONS TO THE PROTOTYPE'S SegmentedControl (F4 Task 2). Its README asks for "real
 * <button>s, arrow-key navigable", which the reference does not do. parity.test.tsx holds that,
 * `tabindex` aside, the markup is still the reference's, byte for byte.
 * - Arrow keys move the selection and the focus, wrapping; Home and End go to either end.
 * - Only the selected segment is in the tab order, so Tab passes the control in one stop.
 * - `controls` names the panel a tab shows; `label` names the group.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

const ADDRESSES: SegmentOption[] = [
  { label: 'Your draft', value: 'sandbox' },
  { label: 'Trying out', value: 'staging' },
  { label: 'Students', value: 'production' },
]

/** The control as a screen holds it: its value in state, changed only by `onChange`. */
function Held(props: {
  options: (string | SegmentOption)[]
  start: string
  role?: 'tablist' | 'radiogroup'
  label?: string
}) {
  const [value, setValue] = React.useState(props.start)
  return (
    <SegmentedControl
      options={props.options}
      value={value}
      onChange={setValue}
      role={props.role}
      label={props.label}
    />
  )
}

const mount = (element: React.ReactElement) => {
  const holder = document.createElement('div')
  document.body.append(holder)
  root = createRoot(holder)
  act(() => root!.render(element))
  return holder
}
const tabs = (holder: HTMLElement) => [...holder.querySelectorAll('button')]
const selected = (holder: HTMLElement) =>
  tabs(holder).filter(
    (b) =>
      b.getAttribute('aria-selected') === 'true' ||
      b.getAttribute('aria-checked') === 'true',
  )
const press = (key: string) =>
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
const focusOn = (button: HTMLButtonElement) => act(() => button.focus())

describe('SegmentedControl, arrow keys', () => {
  it('moves the selection and the focus right, wrapping from the last to the first', () => {
    const holder = mount(<Held options={ADDRESSES} start="sandbox" />)
    focusOn(tabs(holder)[0]!)
    press('ArrowRight')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Trying out'])
    expect(document.activeElement).toBe(tabs(holder)[1])
    press('ArrowRight')
    press('ArrowRight')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Your draft'])
    expect(document.activeElement).toBe(tabs(holder)[0])
  })

  it('moves left, wrapping from the first to the last', () => {
    const holder = mount(<Held options={ADDRESSES} start="sandbox" />)
    focusOn(tabs(holder)[0]!)
    press('ArrowLeft')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Students'])
    expect(document.activeElement).toBe(tabs(holder)[2])
  })

  it('goes to the first with Home and the last with End', () => {
    const holder = mount(<Held options={ADDRESSES} start="staging" />)
    focusOn(tabs(holder)[1]!)
    press('End')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Students'])
    expect(document.activeElement).toBe(tabs(holder)[2])
    press('Home')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Your draft'])
    expect(document.activeElement).toBe(tabs(holder)[0])
  })

  it('moves a radiogroup with up and down as well, as radio buttons do', () => {
    const holder = mount(
      <Held options={['Desktop', 'Phone']} start="Desktop" role="radiogroup" />,
    )
    focusOn(tabs(holder)[0]!)
    press('ArrowDown')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Phone'])
    expect(document.activeElement).toBe(tabs(holder)[1])
    press('ArrowUp')
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Desktop'])
    expect(document.activeElement).toBe(tabs(holder)[0])
  })

  it('leaves other keys to the page', () => {
    const holder = mount(<Held options={ADDRESSES} start="sandbox" />)
    focusOn(tabs(holder)[0]!)
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      document.activeElement!.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(false)
    expect(selected(holder).map((b) => b.textContent)).toEqual(['Your draft'])
  })
})

describe('SegmentedControl, the tab order', () => {
  it('holds only the selected segment in the tab order', () => {
    const holder = mount(<Held options={ADDRESSES} start="staging" />)
    expect(tabs(holder).map((b) => b.tabIndex)).toEqual([-1, 0, -1])
    focusOn(tabs(holder)[1]!)
    press('ArrowRight')
    expect(tabs(holder).map((b) => b.tabIndex)).toEqual([-1, -1, 0])
  })

  it('keeps the first segment reachable when nothing is selected', () => {
    const holder = mount(
      <SegmentedControl options={ADDRESSES} value="nothing of these" />,
    )
    expect(tabs(holder).map((b) => b.tabIndex)).toEqual([0, -1, -1])
  })
})

describe('SegmentedControl, names', () => {
  it('sets aria-controls on a tab that names its panel, and on no other', () => {
    const holder = mount(
      <SegmentedControl
        value="sandbox"
        options={[
          { label: 'Your draft', value: 'sandbox', controls: 'panel-draft' },
          { label: 'Trying out', value: 'staging' },
        ]}
      />,
    )
    expect(tabs(holder).map((b) => b.getAttribute('aria-controls'))).toEqual([
      'panel-draft',
      null,
    ])
  })

  it('names the group with label', () => {
    const holder = mount(
      <SegmentedControl
        options={ADDRESSES}
        value="sandbox"
        label="Which address you are looking at"
      />,
    )
    const group = holder.querySelector('[role="tablist"]')!
    expect(group.getAttribute('aria-label')).toBe('Which address you are looking at')
  })
})
