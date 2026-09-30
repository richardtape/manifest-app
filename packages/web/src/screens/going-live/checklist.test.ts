import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { describe, expect, it } from 'vitest'
import { CLOCK_IDS, clocksUnmet } from './checklist.js'

/** The checklist's items with these states, the rest as the mock has them. */
const readiness = (states: Record<string, Schemas['LaunchReadinessItem']['state']>) => ({
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map((i) =>
    i.id in states ? { ...i, state: states[i.id]! } : i,
  ),
})

describe('the two production clocks (Decision 4)', () => {
  it('are the production registration and the privacy assessment', () =>
    expect(CLOCK_IDS).toEqual(['iam-registration', 'privacy-assessment']))

  it.each([
    [{ 'iam-registration': 'met', 'privacy-assessment': 'unmet' }, true],
    [{ 'iam-registration': 'unmet', 'privacy-assessment': 'met' }, true],
    [{ 'iam-registration': 'not_built', 'privacy-assessment': 'met' }, true],
    [{ 'iam-registration': 'met', 'privacy-assessment': 'met' }, false],
  ] as const)('%o: a clock unmet is %s', (states, unmet) =>
    expect(clocksUnmet(readiness(states))).toBe(unmet),
  )

  it('other items unmet leave the clocks met', () =>
    expect(
      clocksUnmet(
        readiness({
          'iam-registration': 'met',
          'privacy-assessment': 'met',
          rehearsal: 'unmet',
          scans: 'unmet',
        }),
      ),
    ).toBe(false))

  it('a checklist that lists neither clock has none unmet', () =>
    expect(
      clocksUnmet({
        ...fixtures.LAUNCH_READINESS,
        items: fixtures.LAUNCH_READINESS.items.filter(
          (i) => !(CLOCK_IDS as readonly string[]).includes(i.id),
        ),
      }),
    ).toBe(false))
})
