// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { Disclosure, LogPane } from './index.js'

/**
 * A DISCLOSURE OF OURS (F3 Task 10): the reference has none. The design system's rule for
 * machine text (InverseSurface/README.md): "behind a disclosure that is shut by default",
 * collapsed to a line count. A native <details>, so the browser gives it a keyboard, a role and
 * its open state for nothing.
 */
const mount = (element: React.ReactElement) => {
  const holder = document.createElement('div')
  holder.innerHTML = renderToStaticMarkup(element)
  document.body.append(holder)
  return holder
}
afterEach(() => document.body.replaceChildren())

describe('Disclosure', () => {
  it('is a <details>, shut by default, whose first child is its summary', () => {
    const details = mount(
      React.createElement(Disclosure, { summary: 'What changed', children: 'Two pages' }),
    ).querySelector('details')!
    expect(details).not.toBeNull()
    expect(details.open).toBe(false)
    expect(details.hasAttribute('open')).toBe(false)
    expect(details.firstElementChild?.tagName).toBe('SUMMARY')
    expect(details.firstElementChild?.textContent).toBe('What changed')
  })

  it('has a summary a keyboard reaches: a real <summary>, never taken out of the tab order', () => {
    const summary = mount(
      React.createElement(Disclosure, { summary: 'What changed', children: 'Two pages' }),
    ).querySelector('summary')!
    expect(summary.hasAttribute('tabindex')).toBe(false)
    expect(summary.querySelector('[tabindex], a, button')).toBeNull()
  })

  it('says how many lines are inside while shut', () => {
    const one = mount(
      React.createElement(Disclosure, {
        summary: 'The exact words',
        count: 1,
        children: 'x',
      }),
    ).querySelector('summary')!
    expect(one.textContent).toBe('The exact words · 1 line')
    const many = mount(
      React.createElement(Disclosure, {
        summary: 'The exact words',
        count: 48,
        children: 'x',
      }),
    ).querySelector('summary')!
    expect(many.textContent).toBe('The exact words · 48 lines')
  })

  it('puts machine text on the inverse surface, and nothing else', () => {
    const machine = mount(
      React.createElement(Disclosure, {
        summary: 'The exact words',
        machine: true,
        count: 2,
        children: React.createElement(LogPane, {
          lines: ['npm error missing: marked', 'exit 1'],
        }),
      }),
    ).querySelector('details')!
    const surface = machine.querySelector('.mf-inverse')
    expect(surface).not.toBeNull()
    expect(surface!.querySelector('.mf-log')?.textContent).toContain(
      'npm error missing: marked',
    )
    expect(machine.querySelector('summary')!.closest('.mf-inverse')).toBeNull()

    const words = mount(
      React.createElement(Disclosure, { summary: 'What changed', children: 'Two pages' }),
    ).querySelector('details')!
    expect(words.querySelector('.mf-inverse')).toBeNull()
  })
})
