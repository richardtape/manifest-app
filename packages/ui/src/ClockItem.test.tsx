// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClockItem, type ClockItemProps } from './index.js'

/**
 * OUR EXTENSION TO THE PROTOTYPE'S ClockItem (F5 Task 4, Decision 5): `state`, so a card can
 * say what the record says, not only "Not started". The reference has no state, so
 * parity.test.tsx cannot hold it; it still holds that without one the card is the
 * reference's, byte for byte. A clock is held by a person, so nothing on it ever moves
 * (ClockItem/README.md, ProgressBar/README.md: "Never animate it").
 */
const card = (props: Partial<ClockItemProps>) => {
  const template = document.createElement('template')
  template.innerHTML = renderToStaticMarkup(
    React.createElement(ClockItem, {
      title: 'A privacy assessment',
      body: 'Body',
      ...props,
    }),
  )
  return template.content
}
const chip = (c: DocumentFragment) => c.querySelector('.mf-chip')!
const track = (c: DocumentFragment) => c.querySelector('.mf-clock')!

describe('ClockItem, with a state of ours', () => {
  it('draws the not-yet chip for a clock not started', () => {
    const c = card({ state: 'notyet', chip: 'Not started' })
    expect(chip(c).classList.contains('mf-is-notyet')).toBe(true)
    expect(chip(c).textContent).toBe('Not started')
  })

  it('draws the waiting chip, still, for a clock someone has', () => {
    const c = card({ state: 'waiting', chip: 'With UBC’s Privacy Office' })
    expect(chip(c).classList.contains('mf-is-waiting')).toBe(true)
    expect(chip(c).textContent).toBe('With UBC’s Privacy Office')
    expect(chip(c).querySelector('.mf-pulse')).toBeNull()
  })

  it('draws the steady chip for a clock that is done', () => {
    const c = card({ state: 'steady', chip: 'Approved' })
    expect(chip(c).classList.contains('mf-is-steady')).toBe(true)
    expect(chip(c).textContent).toBe('Approved')
  })

  it('hatches the bar only while nothing is counting', () => {
    const notyet = card({ state: 'notyet' })
    expect(notyet.querySelector('.mf-clockbar')).toBeNull()
    expect(track(notyet)).not.toBeNull()
    for (const state of ['waiting', 'steady'] as const) {
      const c = card({ state })
      expect(c.querySelector(`.mf-clockbar--${state} .mf-clock`), state).not.toBeNull()
    }
  })

  it('moves nothing, in any state: no drifting fill, no pulse', () => {
    for (const state of [undefined, 'notyet', 'waiting', 'steady'] as const) {
      const c = card({ state, chip: 'x', clockLabel: 'a', clockMeta: 'b' })
      expect(c.querySelector('.mf-pulse'), String(state)).toBeNull()
      expect(c.querySelector('.mf-bar__fill--working'), String(state)).toBeNull()
      expect(c.querySelector('[role="progressbar"]'), String(state)).toBeNull()
    }
  })

  it('says the caller’s words on the bar, in every state', () => {
    for (const state of [undefined, 'notyet', 'waiting', 'steady'] as const) {
      const c = card({
        state,
        clockLabel: 'recorded 18 September',
        clockMeta: 'waiting 12 days',
      })
      const meta = c.querySelector('.mf-bar__meta')!
      expect(meta.textContent, String(state)).toBe('recorded 18 Septemberwaiting 12 days')
      expect(c.textContent, String(state)).not.toMatch(/weeks|Nothing counting yet/)
    }
  })

  it('says the reference’s “Takes weeks” only when no words are given, and only before a clock starts', () => {
    expect(card({}).querySelector('.mf-bar__meta')!.textContent).toBe(
      'Nothing counting yetTakes weeks',
    )
    expect(card({ state: 'notyet' }).querySelector('.mf-bar__meta')!.textContent).toBe(
      'Nothing counting yetTakes weeks',
    )
    for (const state of ['waiting', 'steady'] as const)
      expect(card({ state }).textContent, state).not.toMatch(/weeks|Nothing counting yet/)
  })

  it('draws no button without an action, in any state', () => {
    for (const state of [undefined, 'notyet', 'waiting', 'steady'] as const) {
      const c = card({ state, admissionTitle: 'A', admissionBody: 'B' })
      expect(c.querySelector('button, a'), String(state)).toBeNull()
    }
  })

  it('m3: draws its title at the level the page asks, and the reference’s h3 without one', () => {
    expect(card({ level: 2 }).querySelector('h2.mf-clockitem__title')?.textContent).toBe(
      'A privacy assessment',
    )
    expect(card({ level: 2 }).querySelector('h3')).toBeNull()
    expect(card({}).querySelector('h3.mf-clockitem__title')).not.toBeNull()
  })

  it('keeps the admission the caller gives, in every state', () => {
    for (const state of ['notyet', 'waiting', 'steady'] as const) {
      const admit = card({
        state,
        admissionTitle: 'Manifest can’t start this one for you yet.',
        admissionBody: 'For now the Manifest team does it by hand.',
      }).querySelector('.mf-admit')!
      expect(admit.textContent, state).toBe(
        'Manifest can’t start this one for you yet.For now the Manifest team does it by hand.',
      )
    }
  })
})
