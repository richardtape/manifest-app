// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { Choice } from './index.js'

/**
 * CHOICE'S `labelledBy`, OURS (minors m116): a group whose label is already on the page, as
 * visible text, is named by it, so a screen reader hears it once. Without it, the reference's
 * `aria-label` (the parity test holds that markup).
 */
const mount = (element: React.ReactElement) => {
  const holder = document.createElement('div')
  holder.innerHTML = renderToStaticMarkup(element)
  document.body.append(holder)
  return holder
}
afterEach(() => document.body.replaceChildren())
const options = [
  { title: '7 days', value: '7' },
  { title: '30 days', value: '30' },
]

describe('Choice', () => {
  it('labelledBy: named by the visible label, with no aria-label of its own', () => {
    const group = mount(
      React.createElement(Choice, {
        name: 'days',
        labelledBy: 'how-long',
        value: '7',
        options,
      }),
    ).querySelector('[role="radiogroup"]')!
    expect(group.getAttribute('aria-labelledby')).toBe('how-long')
    expect(group.hasAttribute('aria-label')).toBe(false)
  })

  it('without it: the reference’s aria-label, and no aria-labelledby', () => {
    const group = mount(
      React.createElement(Choice, {
        type: 'checkbox',
        name: 'may',
        label: 'What may it do?',
        options,
      }),
    ).querySelector('[role="group"]')!
    expect(group.getAttribute('aria-label')).toBe('What may it do?')
    expect(group.hasAttribute('aria-labelledby')).toBe(false)
  })
})
