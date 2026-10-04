import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import {
  bandOf,
  dayWords,
  phraseOf,
  stepOf,
  stepsOf,
  vancouverDays,
  type Step,
  type StepsInput,
} from './steps.js'

/**
 * THE THREE STEPS, IN UBC'S ORDER (F5b Task 2; the design's §1; D2): the privacy assessment, then the
 * trying-out address's registration, then the students' address's. Each step's state is read from
 * its own record (and, for the assessment and the students' address, its checklist item); the
 * current step is the first not done, and only it is a card. **Part one** (`sending: false`, Decision
 * 3) has nowhere to send a draft, so nothing is the person's to press, and every row the design marks
 * *needs you* is drawn as F5 draws it: not yet, or with the Manifest team. Waits are counted in
 * Vancouver days (Decision 2).
 */
const V = 'America/Vancouver'
const TORONTO = 'America/Toronto'
/** Noon on 5 October in Vancouver. */
const NOW = new Date('2026-10-05T19:00:00.000Z')

type Records = Schemas['LaunchRecords']
type Item = Schemas['LaunchReadinessItem']
const IAM = (
  over: Partial<Schemas['IamRegistration']> = {},
): Schemas['IamRegistration'] => ({
  ...fixtures.IAM_REGISTRATION,
  ...over,
})
const STAGING = (
  over: Partial<Schemas['IamRegistration']> = {},
): Schemas['IamRegistration'] => ({ ...fixtures.STAGING_REGISTRATION, ...over })
const PIA = (
  over: Partial<Schemas['PrivacyAssessment']> = {},
): Schemas['PrivacyAssessment'] => ({ ...fixtures.PRIVACY_ASSESSMENT, ...over })
const DRAFTED_AT = '2026-10-03T16:30:00.000Z'
const draftedPia = () =>
  PIA({
    state: 'draft',
    reviewer: null,
    approvedAt: null,
    externalTicketRef: null,
    submittedAt: null,
    submittedBy: null,
    draft: fixtures.assessmentDraft(DRAFTED_AT),
  })
const draftedIam = (
  environment: 'staging' | 'production',
  stage: 'drafted' | 'assessed',
) =>
  (environment === 'staging' ? STAGING : IAM)({
    registeredAttributes: [],
    registeredAt: null,
    certFingerprint: null,
    certExpiresAt: null,
    state: 'draft',
    externalTicketRef: null,
    submittedAt: null,
    submittedBy: null,
    package: fixtures.registrationPackage(environment, stage, DRAFTED_AT),
  })
const item = (id: Item['id'], over: Partial<Item> = {}): Item => ({
  ...fixtures.LAUNCH_READINESS.items.find((i) => i.id === id)!,
  ...over,
})
const readiness = (...items: Item[]): Schemas['LaunchReadiness'] => ({
  ...fixtures.LAUNCH_READINESS,
  items: fixtures.LAUNCH_READINESS.items.map(
    (i) => items.find((own) => own.id === i.id) ?? i,
  ),
})
const records = (over: Partial<Records> = {}): Records => ({
  ...fixtures.LAUNCH_RECORDS,
  ...over,
})
const input = (over: Partial<StepsInput> = {}): StepsInput => ({
  records: records(),
  readiness: readiness(),
  now: NOW,
  timeZone: V,
  sending: false,
  ...over,
})
/** The step alone, as `stepsOf` computes it before it knows which one is current. */
const one = (id: Step['id'], over: Partial<StepsInput> = {}) => {
  const i = input(over)
  return stepOf(id, {
    records: i.records,
    items: i.readiness.items,
    now: i.now,
    timeZone: i.timeZone,
    sending: i.sending,
  })
}
const UNMET_PIA = item('privacy-assessment', { state: 'unmet', since: null })
const MET_PIA = item('privacy-assessment', {
  state: 'met',
  since: '2026-09-21T19:00:00.000Z',
})
const UNMET_IAM = item('iam-registration', { state: 'unmet', since: null })
/** An app that signs nobody in: the platform's NOT_CWL_ITEM (`launch/readiness.ts`). */
const NOT_CWL = item('iam-registration', {
  owner: 'UBC IAM',
  state: 'met',
  why: 'This app does not sign people in with CWL, so it needs no IAM registration.',
  since: null,
})
const NOT_STARTED = {
  state: 'notyet',
  chip: 'Not started',
  label: 'Nothing counting yet',
  meta: 'May take several days',
  admission: true,
  action: null,
}

describe('stepOf, part one (sending: false): nothing is theirs to press yet (Decision 3)', () => {
  it.each(['assessment', 'staging', 'production'] as const)(
    '%s, nothing on file: not started, F5’s admission, no action',
    (id) => {
      const s = one(id, {
        records: records({
          privacyAssessment: null,
          stagingRegistration: null,
          iamRegistration: null,
        }),
        readiness: readiness(UNMET_PIA, UNMET_IAM),
      })
      expect(s).toMatchObject({
        ...NOT_STARTED,
        kind: 'nothing',
        owner: 'the Manifest team',
      })
    },
  )

  it('a draft not sent is not started either, with the admission', () => {
    const s = one('assessment', {
      records: records({ privacyAssessment: draftedPia() }),
      readiness: readiness(UNMET_PIA),
    })
    expect(s).toMatchObject({ ...NOT_STARTED, kind: 'drafted' })
    expect(
      one('staging', {
        records: records({ stagingRegistration: draftedIam('staging', 'assessed') }),
      }),
    ).toMatchObject({ ...NOT_STARTED, kind: 'drafted' })
  })

  it('with UBC: waiting, owned by whoever answers, since the day it was sent, counted in Vancouver days', () => {
    expect(one('assessment')).toMatchObject({
      kind: 'submitted',
      state: 'waiting',
      owner: 'UBC’s Privacy Office',
      chip: 'With UBC’s Privacy Office',
      label: 'since 18 September',
      meta: 'waiting 17 days',
      days: 17,
      admission: true,
      action: null,
    })
    const submittedAt = '2026-10-01T19:00:00.000Z'
    expect(
      one('production', {
        records: records({
          iamRegistration: IAM({ state: 'submitted', registeredAt: null, submittedAt }),
        }),
        readiness: readiness(UNMET_IAM),
      }),
    ).toMatchObject({
      kind: 'submitted',
      state: 'waiting',
      owner: 'UBC’s identity team',
      chip: 'With UBC’s identity team',
      label: 'since 1 October',
      meta: 'waiting 4 days',
    })
  })

  it('with UBC and no day sent: the checklist’s own `since`, else undated, never “NaN days”', () => {
    const undated = PIA({ submittedAt: null })
    expect(
      one('assessment', {
        records: records({ privacyAssessment: undated }),
        readiness: readiness(
          item('privacy-assessment', { since: '2026-10-02T19:00:00.000Z' }),
        ),
      }),
    ).toMatchObject({ label: 'since 2 October', meta: 'waiting 3 days' })
    expect(
      one('staging', {
        records: records({
          stagingRegistration: STAGING({ state: 'submitted', submittedAt: 'not a day' }),
        }),
      }),
    ).toMatchObject({ state: 'waiting', label: '', meta: '', days: null })
  })

  it('UBC came back with questions: with the Manifest team, who has it (part one)', () =>
    expect(
      one('staging', {
        records: records({
          stagingRegistration: STAGING({
            state: 'change_requested',
            changeRequestedFrom: 'submitted',
          }),
        }),
      }),
    ).toMatchObject({
      kind: 'asked',
      state: 'waiting',
      owner: 'the Manifest team',
      chip: 'With the Manifest team',
      label: 'UBC’s identity team asked about it.',
      meta: 'The Manifest team has it.',
      action: null,
    }))

  it('the assessment sent back (draft again, its day sent kept: S1 M1 read from the platform’s code): with the Manifest team', () =>
    expect(
      one('assessment', {
        records: records({
          privacyAssessment: PIA({ state: 'draft', approvedAt: null }),
        }),
        readiness: readiness(UNMET_PIA),
      }),
    ).toMatchObject({
      kind: 'sent-back',
      state: 'waiting',
      owner: 'the Manifest team',
      chip: 'With the Manifest team',
      label: 'The Privacy Office sent it back.',
      meta: 'The Manifest team has it.',
      action: null,
    }))

  it('run out: with the Manifest team, in F5’s words', () =>
    expect(
      one('production', {
        records: records({ iamRegistration: IAM({ state: 'expired' }) }),
        readiness: readiness(UNMET_IAM),
      }),
    ).toMatchObject({
      kind: 'expired',
      state: 'waiting',
      owner: 'the Manifest team',
      chip: 'With the Manifest team',
      label: 'Its registration has run out.',
      meta: 'The Manifest team renews it.',
    }))

  it('a change on file with UBC (from active): F5’s words, with UBC’s identity team, in Vancouver days since it was filed', () =>
    expect(
      one('production', {
        records: records({
          iamRegistration: IAM({
            state: 'change_requested',
            changeRequestedFrom: 'active',
            submittedAt: '2026-10-02T17:00:00.000Z',
            updatedAt: '2026-10-02T17:00:00.000Z',
          }),
        }),
        readiness: readiness(UNMET_IAM),
      }),
    ).toMatchObject({
      kind: 'change',
      state: 'waiting',
      owner: 'UBC’s identity team',
      chip: 'With UBC’s identity team',
      label: 'A change, recorded 2 October',
      meta: 'waiting 3 days',
    }))

  it('a change on file is counted from the day it was filed (`submittedAt`), never reset by a later edit of the record (the review’s I2)', () => {
    // Filed on 20 September; an administrator added its ticket number on 5 October.
    const change = (submittedAt: string | null) =>
      one('production', {
        records: records({
          iamRegistration: IAM({
            state: 'change_requested',
            changeRequestedFrom: 'active',
            submittedAt,
            updatedAt: '2026-10-05T16:00:00.000Z',
          }),
        }),
        readiness: readiness(
          item('iam-registration', { state: 'unmet', since: '2026-09-21T19:00:00.000Z' }),
        ),
      })
    expect(change('2026-09-20T19:00:00.000Z')).toMatchObject({
      label: 'A change, recorded 20 September',
      meta: 'waiting 15 days',
    })
    // No day sent on the record: the checklist's `since`, then the record's last change.
    expect(change(null)).toMatchObject({
      label: 'A change, recorded 21 September',
      meta: 'waiting 14 days',
    })
  })

  it('done, and the checklist agrees: steady, dated by its answer', () => {
    expect(
      one('assessment', {
        records: records({
          privacyAssessment: PIA({
            state: 'approved',
            approvedAt: '2026-10-03T19:00:00.000Z',
          }),
        }),
        readiness: readiness(MET_PIA),
      }),
    ).toMatchObject({
      kind: 'done',
      state: 'steady',
      chip: 'Done',
      label: 'Approved 3 October',
      meta: '',
      admission: false,
      action: null,
    })
    // 2026-09-09T00:00Z is the evening of 8 September in Vancouver.
    expect(one('staging')).toMatchObject({
      kind: 'done',
      state: 'steady',
      label: 'Registered 8 September',
    })
    expect(one('production')).toMatchObject({
      kind: 'done',
      label: 'Registered 14 September',
    })
    expect(
      one('staging', {
        records: records({ stagingRegistration: STAGING({ registeredAt: null }) }),
      }),
    ).toMatchObject({ kind: 'done', label: 'Registered' })
  })

  it('done on its record, unmet on the checklist: with the Manifest team, never done (F5’s S3)', () => {
    expect(one('production', { readiness: readiness(UNMET_IAM) })).toMatchObject({
      kind: 'done-unmet',
      state: 'waiting',
      owner: 'the Manifest team',
      chip: 'With the Manifest team',
      label: 'Registered 14 September',
      meta: 'The newest version needs it changed.',
    })
    expect(
      one('assessment', {
        records: records({
          privacyAssessment: PIA({
            state: 'approved',
            approvedAt: '2026-10-03T19:00:00.000Z',
          }),
        }),
        readiness: readiness(UNMET_PIA),
      }),
    ).toMatchObject({ kind: 'done-unmet', state: 'waiting' })
  })

  it('a state from a newer contract: we can’t tell, and when it was recorded', () =>
    expect(
      one('staging', {
        records: records({
          stagingRegistration: STAGING({
            state: 'withdrawn' as Schemas['IamRegistration']['state'],
            updatedAt: '2026-10-01T19:00:00.000Z',
          }),
        }),
      }),
    ).toMatchObject({
      kind: 'unknown',
      state: 'notyet',
      chip: 'We can’t tell right now',
      label: 'recorded 1 October',
    }))
})

describe('stepOf, part two (sending: true): what becomes theirs once FE-46 lands', () => {
  const empty = records({
    privacyAssessment: null,
    stagingRegistration: null,
    iamRegistration: null,
  })

  it('nothing on file: needs you, owned by you, [Start], no admission', () =>
    expect(
      one('assessment', {
        records: empty,
        readiness: readiness(UNMET_PIA),
        sending: true,
      }),
    ).toMatchObject({
      kind: 'nothing',
      state: 'attention',
      owner: 'you',
      label: 'Nothing started.',
      action: 'start',
      admission: false,
    }))

  it('drafted, not sent: needs you, check it and send it', () =>
    expect(
      one('assessment', {
        records: records({ privacyAssessment: draftedPia() }),
        readiness: readiness(UNMET_PIA),
        sending: true,
      }),
    ).toMatchObject({
      kind: 'drafted',
      state: 'attention',
      owner: 'you',
      label: 'Ready for you to check and send.',
      action: 'check-and-send',
      admission: false,
    }))

  it('UBC’s questions, sent back, and run out: needs you, a new draft', () => {
    const asked = one('staging', {
      records: records({
        stagingRegistration: STAGING({
          state: 'change_requested',
          changeRequestedFrom: 'submitted',
        }),
      }),
      sending: true,
    })
    expect(asked).toMatchObject({
      state: 'attention',
      owner: 'you',
      action: 'start',
      label: 'UBC’s identity team asked about it.',
      note: 'The Manifest team will be in touch with what they asked.',
    })
    expect(
      one('assessment', {
        records: records({
          privacyAssessment: PIA({ state: 'draft', approvedAt: null }),
        }),
        readiness: readiness(UNMET_PIA),
        sending: true,
      }),
    ).toMatchObject({
      state: 'attention',
      action: 'start',
      label: 'The Privacy Office sent it back.',
      note: 'The Manifest team will be in touch about why.',
    })
    expect(
      one('production', {
        records: records({ iamRegistration: IAM({ state: 'expired' }) }),
        readiness: readiness(UNMET_IAM),
        sending: true,
      }),
    ).toMatchObject({
      state: 'attention',
      action: 'start',
      label: 'Its registration has run out.',
      note: 'Check it again and send it.',
    })
  })

  it('(FE-46) with the Manifest team: sent on its day, waiting since, and who it goes to next', () => {
    // FE-46's proposed shape (`state: 'sent'`, `sentAt`): renamed at sitting 3's Step 0.
    const sent = {
      ...PIA({ submittedAt: null }),
      state: 'sent',
      sentAt: '2026-10-03T19:00:00.000Z',
    } as unknown as Schemas['PrivacyAssessment']
    expect(
      one('assessment', {
        records: records({ privacyAssessment: sent }),
        readiness: readiness(UNMET_PIA),
        sending: true,
      }),
    ).toMatchObject({
      kind: 'sent',
      state: 'waiting',
      owner: 'the Manifest team',
      chip: 'With the Manifest team',
      label: 'sent 3 October',
      meta: 'waiting 2 days',
      note: 'They send it on to UBC’s Privacy Office.',
      action: null,
    })
  })

  it('with UBC, done and done-unmet read as in part one, without the admission', () => {
    expect(one('assessment', { sending: true })).toMatchObject({
      kind: 'submitted',
      state: 'waiting',
      admission: false,
    })
    expect(one('staging', { sending: true })).toMatchObject({
      kind: 'done',
      state: 'steady',
    })
  })
})

describe('not needed: an app that signs nobody in (S1 M2 read from the platform’s NOT_CWL_ITEM)', () => {
  it('both registrations steady, not needed, and the assessment still stands', () => {
    const steps = stepsOf(
      input({
        records: records({ stagingRegistration: null, iamRegistration: null }),
        readiness: readiness(NOT_CWL),
      }),
    )
    for (const s of [steps[1], steps[2]])
      expect(s).toMatchObject({
        kind: 'not-needed',
        state: 'steady',
        chip: 'Not needed',
        label: 'Not needed: it doesn’t sign anyone in.',
        current: false,
        next: null,
      })
    expect(steps[0]).toMatchObject({ kind: 'submitted', current: true })
  })

  it('an app that signed people in, drafted both, then stopped keeps its drafts: both still not needed (m134, measured on 7100)', () => {
    const steps = stepsOf(
      input({
        records: records({
          stagingRegistration: draftedIam('staging', 'assessed'),
          iamRegistration: draftedIam('production', 'assessed'),
        }),
        readiness: readiness(NOT_CWL),
      }),
    )
    for (const s of [steps[1], steps[2]])
      expect(s).toMatchObject({
        kind: 'not-needed',
        state: 'steady',
        label: 'Not needed: it doesn’t sign anyone in.',
        current: false,
      })
    expect(steps[0]).toMatchObject({ kind: 'submitted', current: true })
  })

  it('a registration in force is never read as signing nobody in, whatever its state (a launched app’s change with UBC: the item is met)', () => {
    // The platform's `liveRegistrationItem`: after a launch, a change on file keeps `registeredAt`,
    // and the item stays met while it covers the release.
    const registered = IAM({
      state: 'change_requested',
      changeRequestedFrom: 'active',
    })
    expect(registered.registeredAt).not.toBeNull()
    const s = one('staging', {
      records: records({ stagingRegistration: null, iamRegistration: registered }),
      readiness: readiness(item('iam-registration')),
    })
    expect(s.kind).not.toBe('not-needed')
  })

  it('every step done or not needed: none current', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: PIA({
            state: 'approved',
            approvedAt: '2026-10-03T19:00:00.000Z',
          }),
          stagingRegistration: null,
          iamRegistration: null,
        }),
        readiness: readiness(MET_PIA, NOT_CWL),
      }),
    )
    expect(steps.map((s) => s.current)).toEqual([false, false, false])
  })
})

describe('stepsOf: one sequence, one current step (D2; Review Focus 3)', () => {
  it('numbers them in UBC’s order: the assessment, trying-out’s, the students’', () =>
    expect(stepsOf(input()).map((s) => [s.n, s.id])).toEqual([
      [1, 'assessment'],
      [2, 'staging'],
      [3, 'production'],
    ]))

  it('staging registered while the assessment is with UBC: the assessment is current, staging’s line says registered', () => {
    const [a, s, p] = stepsOf(input())
    expect(a).toMatchObject({ current: true, kind: 'submitted' })
    expect(s).toMatchObject({
      current: false,
      kind: 'done',
      label: 'Registered 8 September',
      next: null,
    })
    expect(p).toMatchObject({ current: false, kind: 'done', next: null })
  })

  it('production registered while staging is with UBC: staging is current, never two cards', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: PIA({
            state: 'approved',
            approvedAt: '2026-10-01T19:00:00.000Z',
          }),
          stagingRegistration: STAGING({
            state: 'submitted',
            registeredAt: null,
            submittedAt: '2026-10-02T19:00:00.000Z',
          }),
        }),
        readiness: readiness(MET_PIA),
      }),
    )
    expect(steps.map((s) => s.current)).toEqual([false, true, false])
    expect(steps[2]).toMatchObject({ kind: 'done', state: 'steady' })
  })

  it('a step to come says what it waits for; one with nothing on file says only that', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: null,
          stagingRegistration: null,
          iamRegistration: null,
        }),
        readiness: readiness(UNMET_PIA, UNMET_IAM),
      }),
    )
    expect(steps[0]).toMatchObject({
      current: true,
      next: null,
      label: 'Nothing counting yet',
    })
    expect(steps[1]).toMatchObject({
      current: false,
      state: 'notyet',
      next: 'Next, once the Privacy Office has approved the assessment.',
      label: '',
      meta: '',
    })
    expect(steps[2]).toMatchObject({
      current: false,
      next: 'Next, once your trying-out address is registered.',
      label: '',
      meta: '',
    })
  })

  it('a step to come with something on file keeps its own state in its line', () => {
    const steps = stepsOf(
      input({
        records: records({
          iamRegistration: IAM({
            state: 'submitted',
            registeredAt: null,
            submittedAt: '2026-10-01T19:00:00.000Z',
          }),
          stagingRegistration: STAGING({
            state: 'submitted',
            registeredAt: null,
            submittedAt: '2026-09-30T19:00:00.000Z',
          }),
        }),
        readiness: readiness(UNMET_IAM),
      }),
    )
    // On file beyond a draft: it says its own state, and nothing it waits for (the review's I1).
    expect(steps[2]).toMatchObject({
      current: false,
      state: 'waiting',
      next: null,
      label: 'since 1 October',
      meta: 'waiting 4 days',
    })
  })

  it('a later step waits for the nearest step before it not done, never one already done (the review’s I1)', () => {
    // The assessment with UBC, trying-out's registered, the students' address nothing on file.
    const steps = stepsOf(
      input({
        records: records({ iamRegistration: null }),
        readiness: readiness(UNMET_IAM),
      }),
    )
    expect(steps[1]).toMatchObject({ kind: 'done', label: 'Registered 8 September' })
    expect(steps[2]).toMatchObject({
      current: false,
      next: 'Next, once the Privacy Office has approved the assessment.',
    })
    expect(steps[2].next).not.toMatch(/trying-out address is registered/)
  })

  it('the assessment sent back while trying-out’s is with UBC: trying-out’s line says its own state, not that it waits (the review’s I1)', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: PIA({ state: 'draft', approvedAt: null }),
          stagingRegistration: STAGING({
            state: 'submitted',
            registeredAt: null,
            submittedAt: '2026-10-01T19:00:00.000Z',
          }),
        }),
        readiness: readiness(UNMET_PIA),
      }),
    )
    expect(steps[0]).toMatchObject({ current: true, kind: 'sent-back' })
    expect(steps[1]).toMatchObject({
      current: false,
      next: null,
      chip: 'With UBC’s identity team',
      label: 'since 1 October',
      meta: 'waiting 4 days',
    })
  })

  it('every step done: none current, three steady lines', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: PIA({
            state: 'approved',
            approvedAt: '2026-09-21T19:00:00.000Z',
          }),
        }),
        readiness: readiness(MET_PIA),
      }),
    )
    expect(steps.map((s) => [s.current, s.state])).toEqual([
      [false, 'steady'],
      [false, 'steady'],
      [false, 'steady'],
    ])
  })

  it('only the current step offers an action: a later step that would need them is not yet (part two)', () => {
    const steps = stepsOf(
      input({
        records: records({
          privacyAssessment: null,
          stagingRegistration: draftedIam('staging', 'drafted'),
          iamRegistration: null,
        }),
        readiness: readiness(UNMET_PIA, UNMET_IAM),
        sending: true,
      }),
    )
    expect(steps[0]).toMatchObject({ current: true, state: 'attention', action: 'start' })
    expect(steps[1]).toMatchObject({ current: false, state: 'notyet', action: null })
  })
})

/**
 * THE MOCK'S FIVE STAGES (S0; the platform's sitting 10, `MANIFEST_MOCK_RECORDS`), their records
 * copied from the mock's `launch.ts` (`launchRecords`, `iamItem`, `piaItem`): each a row of the table.
 */
const STAGES: [string, StepsInput, (steps: [Step, Step, Step]) => void][] = [
  [
    'none: step 1 current, nothing on file',
    input({
      records: records({
        privacyAssessment: null,
        stagingRegistration: null,
        iamRegistration: null,
      }),
      readiness: readiness(UNMET_PIA, UNMET_IAM),
    }),
    (s) => {
      expect(s.map((x) => x.current)).toEqual([true, false, false])
      expect(s[0]).toMatchObject({ kind: 'nothing', admission: true })
    },
  ],
  [
    'drafted: step 1 current, drafted',
    input({
      records: records({
        privacyAssessment: draftedPia(),
        stagingRegistration: draftedIam('staging', 'drafted'),
        iamRegistration: draftedIam('production', 'drafted'),
      }),
      readiness: readiness(UNMET_PIA, UNMET_IAM),
    }),
    (s) => {
      expect(s.map((x) => x.current)).toEqual([true, false, false])
      expect(s[0]).toMatchObject({ kind: 'drafted', state: 'notyet' })
    },
  ],
  [
    'assessed: step 2 current',
    input({
      records: records({
        privacyAssessment: PIA({
          state: 'approved',
          approvedAt: '2026-09-30T19:00:00.000Z',
        }),
        stagingRegistration: draftedIam('staging', 'assessed'),
        iamRegistration: draftedIam('production', 'assessed'),
      }),
      readiness: readiness(
        item('privacy-assessment', { state: 'met', since: '2026-09-30T19:00:00.000Z' }),
        UNMET_IAM,
      ),
    }),
    (s) => {
      expect(s.map((x) => x.current)).toEqual([false, true, false])
      expect(s[0]).toMatchObject({ kind: 'done', label: 'Approved 30 September' })
      expect(s[1]).toMatchObject({ kind: 'drafted', state: 'notyet', admission: true })
    },
  ],
  [
    'approved: none current',
    input({
      records: records({
        privacyAssessment: PIA({
          state: 'approved',
          approvedAt: '2026-09-21T19:00:00.000Z',
        }),
      }),
      readiness: readiness(MET_PIA),
    }),
    (s) => expect(s.map((x) => x.current)).toEqual([false, false, false]),
  ],
  [
    'sent (the default): step 1 current, with the Privacy Office, while steps 2 and 3 say registered',
    input(),
    (s) => {
      expect(s.map((x) => x.current)).toEqual([true, false, false])
      expect(s[0]).toMatchObject({ kind: 'submitted', chip: 'With UBC’s Privacy Office' })
      expect(s[1].label).toMatch(/^Registered /)
      expect(s[2].label).toMatch(/^Registered /)
    },
  ],
]

describe('the mock’s five stages, each a row (S0)', () => {
  it.each(STAGES)('%s', (_, given, check) => check(stepsOf(given)))
})

describe('the property: exactly one current step while any is not done', () => {
  const pias = [
    null,
    draftedPia(),
    PIA(),
    PIA({ state: 'draft', approvedAt: null }),
    PIA({ state: 'approved', approvedAt: '2026-10-01T19:00:00.000Z' }),
  ]
  const registrations = (env: 'staging' | 'production') => [
    null,
    draftedIam(env, 'drafted'),
    (env === 'staging' ? STAGING : IAM)({ state: 'submitted', registeredAt: null }),
    (env === 'staging' ? STAGING : IAM)({
      state: 'change_requested',
      changeRequestedFrom: 'submitted',
    }),
    (env === 'staging' ? STAGING : IAM)({
      state: 'change_requested',
      changeRequestedFrom: 'active',
    }),
    (env === 'staging' ? STAGING : IAM)({ state: 'expired' }),
    (env === 'staging' ? STAGING : IAM)(),
  ]
  const piaItems = [UNMET_PIA, MET_PIA]
  const iamItems = [UNMET_IAM, item('iam-registration'), NOT_CWL]

  it('holds over every record × item × sending, and only the first not done is current', () => {
    let seen = 0
    for (const privacyAssessment of pias)
      for (const stagingRegistration of registrations('staging'))
        for (const iamRegistration of registrations('production'))
          for (const p of piaItems)
            for (const i of iamItems)
              for (const sending of [false, true]) {
                const steps = stepsOf(
                  input({
                    records: records({
                      privacyAssessment,
                      stagingRegistration,
                      iamRegistration,
                    }),
                    readiness: readiness(p, i),
                    sending,
                  }),
                )
                const notDone = steps.filter((s) => s.state !== 'steady')
                const current = steps.filter((s) => s.current)
                expect(current).toHaveLength(notDone.length > 0 ? 1 : 0)
                if (notDone.length > 0) expect(current[0]).toBe(notDone[0])
                for (const s of steps) {
                  // Part one: never needs you, no action, every not-done step owns the admission.
                  if (!sending) {
                    expect(s.state).not.toBe('attention')
                    expect(s.action).toBeNull()
                  }
                  // Only the current step is ever needs you, or offers anything.
                  if (!s.current) expect(s.action).toBeNull()
                  expect(s.state).not.toBe('working')
                  const said = [
                    s.chip,
                    s.label,
                    s.meta,
                    s.next ?? '',
                    s.note ?? '',
                    s.owner,
                  ]
                  for (const text of said) {
                    expect(machineryIn(text)).toEqual([])
                    expect(text).not.toMatch(/week/i)
                    expect(text).not.toMatch(/NaN|undefined|null/)
                  }
                }
                seen++
              }
    expect(seen).toBe(pias.length * 7 * 7 * 2 * 3 * 2)
  })
})

describe('vancouverDays: calendar days in Vancouver, never hours (Decision 2; Review Focus 4)', () => {
  /** A same-day submission: noon in Vancouver (the platform's `vancouverNoon`). */
  const SENT = '2026-10-05T19:00:00.000Z'

  it.each([
    ['00:30 in Vancouver', '2026-10-05T07:30:00.000Z', 0],
    ['12:30 in Vancouver', '2026-10-05T19:30:00.000Z', 0],
    ['23:30 in Vancouver', '2026-10-06T06:30:00.000Z', 0],
    ['23:30 in Toronto (20:30 in Vancouver)', '2026-10-06T03:30:00.000Z', 0],
    ['00:05 the next day in Vancouver', '2026-10-06T07:05:00.000Z', 1],
  ])('sent at noon, read at %s: %i', (_, at, days) =>
    expect(vancouverDays(SENT, new Date(at))).toBe(days),
  )

  it('a moment before it was sent is 0, never negative', () =>
    expect(vancouverDays(SENT, new Date('2026-10-04T19:00:00.000Z'))).toBe(0))

  it('across 1 November, counts calendar days whatever the zone data says of the clocks', () =>
    // Sent at noon on 31 October; read at 00:30 on 2 November in Vancouver: 36 hours, two days.
    expect(
      vancouverDays('2026-10-31T19:00:00.000Z', new Date('2026-11-02T08:30:00.000Z')),
    ).toBe(2))

  it('a day that cannot be read is null: no meta, never “NaN days”', () =>
    expect(vancouverDays('not a day', NOW)).toBeNull())

  it('waits on the page are Vancouver days, whoever reads them: Toronto at 23:30 sees the same count', () => {
    const late = new Date('2026-10-06T03:30:00.000Z')
    const given = input({
      records: records({ privacyAssessment: PIA({ submittedAt: SENT }) }),
      now: late,
    })
    expect(stepsOf({ ...given, timeZone: TORONTO })[0].meta).toBe('waiting since today')
    expect(stepsOf({ ...given, timeZone: V })[0].meta).toBe('waiting since today')
  })
})

describe('dayWords: moved from clocks.ts, unchanged', () => {
  it('names the day in their own zone', () => {
    expect(dayWords('2026-09-19T06:30:00.000Z', V)).toBe('18 September')
    expect(dayWords('2026-09-19T06:30:00.000Z', TORONTO)).toBe('19 September')
    expect(dayWords('nope', V)).toBeNull()
  })
})

describe('bandOf: the Overview’s band (Task 3)', () => {
  const empty = input({
    records: records({
      privacyAssessment: null,
      stagingRegistration: null,
      iamRegistration: null,
    }),
    readiness: readiness(UNMET_PIA, UNMET_IAM),
  })

  it('launched: no band', () => expect(bandOf(stepsOf(input()), true, false)).toBeNull())

  it('every step done: no band', () =>
    expect(
      bandOf(
        stepsOf(
          input({
            records: records({
              privacyAssessment: PIA({
                state: 'approved',
                approvedAt: '2026-09-21T19:00:00.000Z',
              }),
            }),
            readiness: readiness(MET_PIA),
          }),
        ),
        false,
        false,
      ),
    ).toBeNull())

  it('step 1 with nothing on file, and something to send: [Start them], needs you', () =>
    expect(bandOf(stepsOf({ ...empty, sending: true }), false, true)).toEqual({
      button: 'start',
      state: 'attention',
    }))

  it('the same in part one: [Going live], not yet, never needs you', () =>
    expect(bandOf(stepsOf(empty), false, false)).toEqual({
      button: 'going-live',
      state: 'notyet',
    }))

  it('a step waiting: [Going live], waiting', () =>
    expect(bandOf(stepsOf(input()), false, false)).toEqual({
      button: 'going-live',
      state: 'waiting',
    }))
})

describe('phraseOf: a step’s state as part of another page’s sentence (Trying out’s line, Task 3)', () => {
  it.each([
    ['nothing on file', records({ stagingRegistration: null }), 'not started yet'],
    [
      'drafted',
      records({ stagingRegistration: draftedIam('staging', 'assessed') }),
      'not started yet',
    ],
    [
      'with UBC',
      records({
        stagingRegistration: STAGING({
          state: 'submitted',
          registeredAt: null,
          submittedAt: '2026-10-01T19:00:00.000Z',
        }),
      }),
      'with UBC’s identity team, waiting 4 days',
    ],
    [
      'with UBC, undated',
      records({
        stagingRegistration: STAGING({ state: 'submitted', submittedAt: null }),
      }),
      'with UBC’s identity team',
    ],
    [
      'UBC asked',
      records({
        stagingRegistration: STAGING({
          state: 'change_requested',
          changeRequestedFrom: 'submitted',
        }),
      }),
      'with the Manifest team',
    ],
    [
      'run out',
      records({ stagingRegistration: STAGING({ state: 'expired' }) }),
      'with the Manifest team',
    ],
    [
      'a state we do not know',
      records({
        stagingRegistration: STAGING({
          state: 'withdrawn' as Schemas['IamRegistration']['state'],
        }),
      }),
      'we can’t tell where it is right now',
    ],
  ])('%s', (_, given, phrase) =>
    expect(phraseOf(one('staging', { records: given }))).toBe(phrase),
  )
})
