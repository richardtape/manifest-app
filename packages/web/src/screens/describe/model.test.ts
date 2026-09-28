import { describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { intakeRefused, monthResetsAt, vancouverMidnightAfter } from './model.js'

/**
 * MOMENT 3'S REFUSALS, IN WORDS (Rich's, after F2 sitting 1): whose limit, and when it
 * resets, in the person's own time zone. Each goes on to Name it with no suggestions, but
 * a gateway that did not answer, which may be tried again.
 */
const AT = new Date('2026-09-27T20:31:00-07:00')
const VANCOUVER = 'America/Vancouver'

describe('when the limits reset', () => {
  it('the platform’s month: the first of the next month, 00:00 UTC', () => {
    expect(monthResetsAt(AT).toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(monthResetsAt(new Date('2026-12-31T23:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    )
  })
  it('a person’s day: the next midnight in Vancouver', () => {
    expect(vancouverMidnightAfter(AT).toISOString()).toBe('2026-09-28T07:00:00.000Z')
    expect(vancouverMidnightAfter(new Date('2026-12-01T12:00:00Z')).toISOString()).toBe(
      '2026-12-02T08:00:00.000Z',
    )
  })
  it("the changeover nights: tomorrow's midnight on tomorrow's clock (deferred Minor, Rich: fix it)", () => {
    // 1:30am on the night the clocks went forward: the next midnight is PDT's, never 1am.
    expect(vancouverMidnightAfter(new Date('2025-03-09T09:30:00Z')).toISOString()).toBe(
      '2025-03-10T07:00:00.000Z',
    )
    // 12:30am on the night they went back, before the change: PST's midnight, never 11pm.
    expect(vancouverMidnightAfter(new Date('2025-11-02T07:30:00Z')).toISOString()).toBe(
      '2025-11-03T08:00:00.000Z',
    )
  })
})

describe('intakeRefused', () => {
  it('the person’s day is used up: midnight, said as midnight in Vancouver, and on to naming', () => {
    expect(intakeRefused('INTAKE_DAILY_LIMIT_REACHED', AT, VANCOUVER)).toEqual({
      words: words.describe.pausedToday('midnight'),
      then: 'naming',
    })
    expect(words.describe.pausedToday('midnight')).toBe(
      "You've described as many new apps today as one person can. That resets at midnight. You can still name it yourself.",
    )
  })
  it('elsewhere, the same midnight is said in their own time', () => {
    expect(intakeRefused('INTAKE_DAILY_LIMIT_REACHED', AT, 'America/Toronto').words).toBe(
      words.describe.pausedToday('3am'),
    )
  })
  it('the platform’s month is spent: for everyone, until 5pm on 30 September, and on to naming', () => {
    expect(intakeRefused('INTAKE_BUDGET_EXHAUSTED', AT, VANCOUVER)).toEqual({
      words:
        "Describing new apps is paused for everyone until 5pm on 30 September, when this month's allowance resets. You can still name it yourself.",
      then: 'naming',
    })
  })
  it.each(['INTAKE_MODEL_UNAVAILABLE', 'AI_CATALOGUE_DISABLED'])(
    '%s waits on an administrator, and on to naming',
    (code) => {
      expect(intakeRefused(code, AT, VANCOUVER)).toEqual({
        words: words.describe.waitingOnAdmin,
        then: 'naming',
      })
    },
  )
  it.each(['AI_BACKEND_UNAVAILABLE', 'UNREACHABLE'])(
    '%s may be tried again, or named by hand',
    (code) => {
      expect(intakeRefused(code, AT, VANCOUVER)).toEqual({
        words: words.describe.couldntRead,
        then: 'choose',
      })
    },
  )
  it('anything else is ours, and on to naming', () => {
    expect(intakeRefused('FORBIDDEN', AT, VANCOUVER)).toEqual({
      words: words.refused.body,
      then: 'naming',
    })
  })
})
