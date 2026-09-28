// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LiveSteps, type Step } from './index.js'

/**
 * OUR TWO EXTENSIONS TO THE PROTOTYPE'S LiveSteps (F3 Task 10, moment 6: "steps, plus a line
 * now"). Neither is in the reference, so parity.test.tsx cannot hold them; it still holds that
 * without them the markup is the reference's, byte for byte.
 * - `line`: what we are doing now, under the step at work, in a polite live region, so a screen
 *   reader hears the sentence rather than a mark changing (LiveSteps/README.md).
 * - `detail`: a step's disclosure, drawn inside that step.
 */
const dom = (steps: Step[]) => {
  const template = document.createElement('template')
  template.innerHTML = renderToStaticMarkup(React.createElement(LiveSteps, { steps }))
  return template.content
}
const items = (list: DocumentFragment) => [...list.querySelectorAll('li')]

describe('LiveSteps, with a line', () => {
  it('draws the line under the step at work, in a polite live region', () => {
    const list = dom([
      { text: 'Writing the pages', state: 'done' },
      {
        text: 'Checking it holds together',
        state: 'now',
        line: 'Writing the page students post on.',
      },
      { text: 'Building it', state: 'next' },
    ])
    const now = items(list)[1]!
    const live = now.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toBe('Writing the page students post on.')
    expect(now.querySelector('.mf-step__text')?.textContent).toBe(
      'Checking it holds together',
    )
  })

  it('draws no line on a step that is not at work', () => {
    const list = dom([
      { text: 'Done', state: 'done', line: 'an old line' },
      { text: 'Next', state: 'next', line: 'a line too early' },
      { text: 'Halted', state: 'halted', line: 'a line after it stopped' },
      { text: 'No state', line: 'a line on a step with none' },
    ])
    expect(list.querySelectorAll('[aria-live]')).toHaveLength(0)
    expect(list.textContent).not.toMatch(/line/)
  })

  it('keeps the note beneath the text, and the line beneath the note', () => {
    const now = items(
      dom([
        {
          text: 'Building it (second try)',
          state: 'now',
          note: 'A piece it depends on was missing',
          line: 'Building it again.',
        },
      ]),
    )[0]!
    const order = [
      ...now.querySelectorAll('.mf-step__text, .mf-step__note, [aria-live]'),
    ].map((e) => e.textContent)
    expect(order).toEqual([
      'Building it (second try)',
      'A piece it depends on was missing',
      'Building it again.',
    ])
  })
})

describe('LiveSteps, with a detail', () => {
  it('draws a step’s detail inside that step, after its words', () => {
    const detail = React.createElement(
      'details',
      { className: 'what-changed' },
      React.createElement('summary', null, 'What changed'),
      'Two pages, and the rule about who sees what',
    )
    const list = dom([
      { text: 'Writing the pages', state: 'done', detail },
      { text: 'Checking it holds together', state: 'now' },
    ])
    const [done, now] = items(list)
    expect(done!.querySelector('details.what-changed')?.textContent).toBe(
      'What changedTwo pages, and the rule about who sees what',
    )
    expect(now!.querySelector('details')).toBeNull()
    // After the step's own words, never before them.
    const words = done!.querySelector('.mf-step__text')!
    const details = done!.querySelector('details')!
    expect(
      words.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
