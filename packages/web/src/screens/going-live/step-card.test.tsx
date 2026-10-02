// @vitest-environment jsdom
import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { Steps } from './step-card.js'
import { stepsOf, type StepsInput } from './steps.js'

/**
 * THE SEQUENCE, DRAWN (F5b Task 3, D2): one numbered list of three steps in UBC's order; the
 * current step alone is a `ClockItem` card, each other one line. One clock card on the page at a
 * time (`ClockItem`'s *"Two at most on a screen"*), and nothing on it moves.
 */
const s = words.goingLive.steps
const V = 'America/Vancouver'
const NOW = new Date('2026-10-05T19:00:00.000Z')
const NOTHING: Schemas['LaunchRecords'] = {
  projectId: fixtures.PROJECT_ID,
  privacyAssessment: null,
  stagingRegistration: null,
  iamRegistration: null,
}
const UNMET: Schemas['LaunchReadiness'] = {
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id === 'iam-registration' || i.id === 'privacy-assessment'
      ? { ...i, state: 'unmet' as const, since: null }
      : i,
  ),
}
const ALL_DONE: Schemas['LaunchRecords'] = {
  ...fixtures.LAUNCH_RECORDS,
  privacyAssessment: {
    ...fixtures.PRIVACY_ASSESSMENT,
    state: 'approved',
    approvedAt: '2026-09-21T19:00:00.000Z',
  },
}
const ALL_MET: Schemas['LaunchReadiness'] = {
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map((i) => ({ ...i, state: 'met' as const })),
}
const steps = (over: Partial<StepsInput> = {}) =>
  stepsOf({
    records: fixtures.LAUNCH_RECORDS,
    readiness: fixtures.LAUNCH_READINESS,
    now: NOW,
    timeZone: V,
    sending: false,
    ...over,
  })
const cards = () => [...document.querySelectorAll<HTMLElement>('.mf-clockitem')]
const list = () => screen.getByRole('list', { name: s.label })
const items = () => within(list()).getAllByRole('listitem')

afterEach(cleanup)

describe('Steps: one card at a time (D2)', () => {
  it('the mock’s default (the assessment with the Privacy Office, both registrations active): one card, the assessment’s, and two steady lines, in UBC’s order', () => {
    render(<Steps steps={steps()} />)
    expect(list().tagName).toBe('OL')
    expect(items()).toHaveLength(3)
    expect(cards()).toHaveLength(1)
    const [first, second, third] = items()
    expect(first!.querySelector('.mf-clockitem h3')?.textContent).toBe(s.assessment.title)
    expect(first!.querySelector('.mf-chip')?.textContent).toBe(s.assessment.with)
    expect(first!.textContent).toContain('since 18 September')
    expect(first!.textContent).toContain('waiting 17 days')
    expect(second!.textContent).toContain(s.staging.title)
    expect(second!.querySelector('.mf-chip')?.textContent).toBe(s.done)
    expect(second!.textContent).toContain('Registered 8 September')
    expect(second!.querySelector('.mf-clockitem')).toBeNull()
    expect(third!.textContent).toContain(s.production.title)
    expect(third!.textContent).toContain('Registered 14 September')
  })

  it('every step done: three steady lines, and no card', () => {
    render(<Steps steps={steps({ records: ALL_DONE, readiness: ALL_MET })} />)
    expect(cards()).toHaveLength(0)
    for (const item of items())
      expect(item.querySelector('.mf-chip')?.classList.contains('mf-is-steady')).toBe(
        true,
      )
  })

  it('nothing on file: step 1 the card, not started, with F5’s admission; steps 2 and 3 say what they wait for', () => {
    render(<Steps steps={steps({ records: NOTHING, readiness: UNMET })} />)
    expect(cards()).toHaveLength(1)
    const [card] = cards()
    expect(card!.querySelector('.mf-chip')?.textContent).toBe(s.notStarted)
    expect(card!.textContent).toContain(s.duration)
    expect(card!.textContent).toContain(s.admission.title)
    expect(card!.textContent).toContain(s.admission.body)
    expect(card!.textContent).toContain(s.assessment.body)
    // "We fill in what Manifest knows; you answer the rest." is untrue until something can be sent.
    expect(card!.textContent).not.toContain(s.assessment.yours)
    const [, second, third] = items()
    expect(second!.textContent).toContain(s.staging.next)
    expect(third!.textContent).toContain(s.production.next)
    expect(second!.textContent).not.toContain(s.nothingCounting)
  })

  it('part one: nothing to press on any step, and nothing needs you (No stopgap)', () => {
    for (const given of [
      steps(),
      steps({ records: NOTHING, readiness: UNMET }),
      steps({ records: ALL_DONE, readiness: ALL_MET }),
    ]) {
      render(<Steps steps={given} />)
      expect(list().querySelector('a, button')).toBeNull()
      expect(list().querySelector('.mf-is-attention')).toBeNull()
      cleanup()
    }
  })

  it('nothing on it moves: no pulse, no working fill', () => {
    render(<Steps steps={steps({ records: NOTHING, readiness: UNMET })} />)
    expect(list().querySelector('.mf-pulse, .mf-bar__fill--working')).toBeNull()
  })

  it('a later step with something on file keeps its state in its line, never as a second card (Review Focus 3)', () => {
    const records: Schemas['LaunchRecords'] = {
      ...fixtures.LAUNCH_RECORDS,
      iamRegistration: {
        ...fixtures.IAM_REGISTRATION,
        state: 'submitted',
        registeredAt: null,
        submittedAt: '2026-10-01T19:00:00.000Z',
      },
    }
    render(
      <Steps
        steps={steps({
          records,
          readiness: {
            ...fixtures.LAUNCH_READINESS,
            items: UNMET.items,
          },
        })}
      />,
    )
    expect(cards()).toHaveLength(1)
    const third = items()[2]!
    expect(third.textContent).toContain(s.production.next)
    expect(third.textContent).toContain('since 1 October · waiting 4 days')
    expect(third.querySelector('.mf-chip')?.textContent).toBe(s.production.with)
  })

  it('the card’s children: what the caller draws under the current step (Tasks 6, 7)', () => {
    render(<Steps steps={steps()}>{(step) => <p>child of {step.id}</p>}</Steps>)
    expect(screen.getByText('child of assessment').closest('li')).toBe(items()[0])
    expect(screen.queryByText('child of staging')).toBeNull()
  })

  it('says several days, never weeks, and none of the platform’s words (C3)', () => {
    render(<Steps steps={steps({ records: NOTHING, readiness: UNMET })} />)
    expect(list().textContent).not.toMatch(/week/i)
    expect(machineryIn(list().textContent ?? '')).toEqual([])
  })
})
