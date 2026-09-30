import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import { clockOf, type Clock } from './clocks.js'

/**
 * A CLOCK CARD SAYS ONLY WHAT THE RECORD SAYS (F5 Task 6, Decision 5): the registration and the
 * assessment an administrator keeps. Nothing measured in days is ever animated, so no clock is
 * ever working; and the duration is Rich's "may take several days", never weeks.
 */
const V = 'America/Vancouver'
const NOW = new Date('2026-09-30T19:00:00.000Z') // noon on 30 September in Vancouver
const IAM = (over: Partial<Schemas['IamRegistration']>): Schemas['IamRegistration'] => ({
  ...fixtures.IAM_REGISTRATION,
  ...over,
})
const PIA = (
  over: Partial<Schemas['PrivacyAssessment']>,
): Schemas['PrivacyAssessment'] => ({
  ...fixtures.PRIVACY_ASSESSMENT,
  ...over,
})
const NOT_STARTED = {
  state: 'notyet',
  chip: 'Not started',
  label: 'Nothing counting yet',
  meta: 'May take several days',
  admission: true,
}

describe('clockOf: what the record says (Decision 5)', () => {
  it.each(['registration', 'assessment'] as const)(
    '%s, nothing recorded: not started',
    (which) => expect(clockOf(which, null, NOW, V)).toEqual({ which, ...NOT_STARTED }),
  )

  it('a draft is not started either', () => {
    expect(clockOf('registration', IAM({ state: 'draft' }), NOW, V)).toEqual({
      which: 'registration',
      ...NOT_STARTED,
    })
    expect(clockOf('assessment', PIA({ state: 'draft' }), NOW, V)).toEqual({
      which: 'assessment',
      ...NOT_STARTED,
    })
  })

  it('submitted is with UBC, still, recorded on its day and counting the days since', () => {
    const updatedAt = '2026-09-18T19:00:00.000Z'
    expect(
      clockOf('registration', IAM({ state: 'submitted', updatedAt }), NOW, V),
    ).toEqual({
      which: 'registration',
      state: 'waiting',
      chip: 'With UBC’s identity team',
      label: 'recorded 18 September',
      meta: 'waiting 12 days',
      admission: true,
    })
    expect(clockOf('assessment', PIA({ state: 'submitted', updatedAt }), NOW, V)).toEqual(
      {
        which: 'assessment',
        state: 'waiting',
        chip: 'With UBC’s Privacy Office',
        label: 'recorded 18 September',
        meta: 'waiting 12 days',
        admission: true,
      },
    )
  })

  it('counts the days in Vancouver: a record written late in the evening is that day’s', () => {
    // 11:30pm on 18 September in Vancouver, already the 19th in UTC.
    const updatedAt = '2026-09-19T06:30:00.000Z'
    const c = clockOf('registration', IAM({ state: 'submitted', updatedAt }), NOW, V)
    expect([c.label, c.meta]).toEqual(['recorded 18 September', 'waiting 12 days'])
  })

  it('dates each record by its own offset, never now’s (the F2 trap’s day)', () => {
    // 00:30 on 31 October, summer time; "now" is 3 November, after the clocks go back in
    // Node's time-zone data. Read with now's offset, the record would be the 30th.
    const updatedAt = '2026-10-31T07:30:00.000Z'
    const now = new Date('2026-11-03T20:00:00.000Z')
    const c = clockOf('assessment', PIA({ state: 'submitted', updatedAt }), now, V)
    expect([c.label, c.meta]).toEqual(['recorded 31 October', 'waiting 3 days'])
  })

  it.each([
    ['2026-09-30T16:00:00.000Z', 'waiting since today'],
    ['2026-09-29T16:00:00.000Z', 'waiting 1 day'],
  ])('recorded %s: %s', (updatedAt, meta) =>
    expect(
      clockOf('registration', IAM({ state: 'submitted', updatedAt }), NOW, V).meta,
    ).toBe(meta),
  )

  it('a record whose day cannot be read is still with UBC, undated, and never takes the page down (the final review)', () =>
    expect(
      clockOf('registration', IAM({ state: 'submitted', updatedAt: 'garbage' }), NOW, V),
    ).toEqual({
      which: 'registration',
      state: 'waiting',
      chip: 'With UBC’s identity team',
      label: '',
      meta: '',
      admission: true,
    }))

  it('a change on file is with UBC’s identity team, still, counting the days since it was recorded (Rich, 2026-09-30: the contract’s `change_requested` is our change, with UBC)', () => {
    const updatedAt = '2026-09-27T19:00:00.000Z'
    expect(
      clockOf('registration', IAM({ state: 'change_requested', updatedAt }), NOW, V),
    ).toEqual({
      which: 'registration',
      state: 'waiting',
      chip: 'With UBC’s identity team',
      label: 'A change, recorded 27 September',
      meta: 'waiting 3 days',
      admission: true,
    })
  })

  it('a registration that ran out is with the Manifest team, still', () =>
    expect(clockOf('registration', IAM({ state: 'expired' }), NOW, V)).toEqual({
      which: 'registration',
      state: 'waiting',
      chip: 'With the Manifest team',
      label: 'Its registration has run out.',
      meta: 'The Manifest team renews it.',
      admission: true,
    }))

  it('active is done, dated by when it was registered', () =>
    expect(
      clockOf(
        'registration',
        IAM({ state: 'active', registeredAt: '2026-10-03T17:00:00.000Z' }),
        NOW,
        V,
      ),
    ).toEqual({
      which: 'registration',
      state: 'steady',
      chip: 'Done',
      label: 'Registered 3 October',
      meta: '',
      admission: false,
    }))

  it('active with no day recorded is done, undated', () =>
    expect(
      clockOf('registration', IAM({ state: 'active', registeredAt: null }), NOW, V).label,
    ).toBe('Registered'))

  it('approved is done, dated by when it was approved', () =>
    expect(
      clockOf(
        'assessment',
        PIA({ state: 'approved', approvedAt: '2026-10-03T17:00:00.000Z' }),
        NOW,
        V,
      ),
    ).toEqual({
      which: 'assessment',
      state: 'steady',
      chip: 'Done',
      label: 'Approved 3 October',
      meta: '',
      admission: false,
    }))

  /**
   * THE RECORD AND THE CHECKLIST DISAGREE (the final review, Rich 2026-09-30: "With the Manifest
   * team"). An `active` registration that does not cover the version on trying-out is unmet on
   * the platform (a sign-in attribute added since, or its addresses changed): never "Done" while
   * the checklist, the band and the launch say otherwise.
   */
  const ITEM = (id: string, state: Schemas['LaunchReadinessItem']['state']) => ({
    ...fixtures.LAUNCH_READINESS.items.find((i) => i.id === id)!,
    state,
  })

  it('an active registration the checklist counts unmet is with the Manifest team, never done', () =>
    expect(
      clockOf(
        'registration',
        IAM({ state: 'active', registeredAt: '2026-09-15T00:00:00.000Z' }),
        NOW,
        V,
        ITEM('iam-registration', 'unmet'),
      ),
    ).toEqual({
      which: 'registration',
      state: 'waiting',
      chip: 'With the Manifest team',
      label: 'Registered 14 September',
      meta: 'The newest version needs it changed.',
      admission: true,
    }))

  it('an approved assessment the checklist counts unmet is with the Manifest team too', () => {
    const c = clockOf(
      'assessment',
      PIA({ state: 'approved', approvedAt: '2026-10-03T17:00:00.000Z' }),
      NOW,
      V,
      ITEM('privacy-assessment', 'unmet'),
    )
    expect([c.state, c.chip, c.label, c.meta]).toEqual([
      'waiting',
      'With the Manifest team',
      'Approved 3 October',
      'The newest version needs it changed.',
    ])
  })

  it('done, and the checklist agrees: done', () =>
    expect(
      clockOf(
        'registration',
        IAM({ state: 'active', registeredAt: '2026-10-03T17:00:00.000Z' }),
        NOW,
        V,
        ITEM('iam-registration', 'met'),
      ).chip,
    ).toBe('Done'))

  it('nothing recorded, and the checklist counts it met: done, nothing more needed', () =>
    expect(
      clockOf('registration', null, NOW, V, ITEM('iam-registration', 'met')),
    ).toEqual({
      which: 'registration',
      state: 'steady',
      chip: 'Done',
      label: 'Nothing more needed.',
      meta: '',
      admission: false,
    }))

  it('a state from a newer contract says only what is true: we cannot tell, and when it was recorded (Review Focus 5)', () =>
    expect(
      clockOf(
        'registration',
        IAM({ state: 'suspended' as never, updatedAt: '2026-09-18T19:00:00.000Z' }),
        NOW,
        V,
      ),
    ).toEqual({
      which: 'registration',
      state: 'notyet',
      chip: 'We can’t tell right now',
      label: 'recorded 18 September',
      meta: 'May take several days',
      admission: true,
    }))

  it('no clock is ever working, never says weeks, and names no machinery', () => {
    const records: [
      Clock['which'],
      Schemas['IamRegistration'] | Schemas['PrivacyAssessment'] | null,
    ][] = [
      ['registration', null],
      ...(['draft', 'submitted', 'active', 'change_requested', 'expired'] as const).map(
        (state) =>
          ['registration', IAM({ state })] as [
            Clock['which'],
            Schemas['IamRegistration'],
          ],
      ),
      ['assessment', null],
      ...(['draft', 'submitted', 'approved'] as const).map(
        (state) =>
          ['assessment', PIA({ state })] as [
            Clock['which'],
            Schemas['PrivacyAssessment'],
          ],
      ),
    ]
    for (const [which, record] of records) {
      const c = clockOf(which, record, NOW, V)
      expect(c.state, JSON.stringify(record?.state)).not.toBe('working')
      const said = [c.chip, c.label, c.meta].join(' ')
      expect(said).not.toMatch(/weeks?\b/i)
      expect(machineryIn(said)).toEqual([])
    }
  })
})
