// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FieldCount, FormField } from './index.js'

/**
 * OUR EXTENSION TO THE PROTOTYPE'S FormField: a count, near a limit (F2's deferred Minor,
 * Rich: say the limits). Not in the reference, so parity.test.tsx cannot hold it; it still
 * holds that without it the markup is the reference's, byte for byte.
 *
 * The count is words, never colour alone: over the limit it says so, and it is named by the
 * input's `aria-describedby`, beside any message.
 */
const dom = (element: React.ReactElement) => {
  const template = document.createElement('template')
  template.innerHTML = renderToStaticMarkup(element)
  return template.content
}

describe('FormField, with a count', () => {
  it('shows the count beneath the input, and the input names it', () => {
    const field = dom(
      React.createElement(FormField, {
        id: 'f',
        label: 'Its name',
        value: 'x',
        onChange: () => undefined,
        count: { text: '450 of 500 characters', over: false },
      }),
    )
    const count = field.querySelector('#f-count')!
    expect(count.textContent).toBe('450 of 500 characters')
    expect(count.className).toBe('mf-field__count')
    expect(field.querySelector('input')!.getAttribute('aria-describedby')).toBe('f-count')
  })

  it('over the limit, marked as over as well as said', () => {
    const field = dom(
      React.createElement(FormField, {
        id: 'f',
        label: 'Its name',
        value: 'x',
        onChange: () => undefined,
        count: { text: '501 of 500 characters: shorten it', over: true },
        message: { tone: 'attention', title: 'a message' },
      }),
    )
    expect(field.querySelector('#f-count')!.className).toBe(
      'mf-field__count mf-field__count--over',
    )
    expect(field.querySelector('input')!.getAttribute('aria-describedby')).toBe(
      'f-count f-msg',
    )
  })

  it('stands alone, for a field that is not a FormField (the description box)', () => {
    const count = dom(
      React.createElement(FieldCount, {
        id: 'd-count',
        text: '3,700 of 4,000',
        over: false,
      }),
    ).firstElementChild!
    expect(count.outerHTML).toBe(
      '<p id="d-count" class="mf-field__count" aria-live="polite">3,700 of 4,000</p>',
    )
  })
})
