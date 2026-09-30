import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import { CLOCK_IDS, clocksUnmet, rowsOf, type Row } from './checklist.js'

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

/**
 * THE SHORT JOBS, EACH IN OUR WORDS (F5 Task 6, Decisions 6 and 7), keyed on `id` × `state` and
 * whether there is a candidate, never on the `why`, which is written for developers (FE-9).
 * The dry run is an administrator's until FE-42 (a) lands (S1, Rich: "Both: row now, ask
 * platform"), so no row offers a press.
 */
describe('rowsOf: the short jobs, in our words (Review Focus 5)', () => {
  const HOST = 'reading-responses.manifest.internal'
  const context = { hostname: HOST }
  const IDS = [
    'domain',
    'iam-registration',
    'privacy-assessment',
    'rehearsal',
    'scans',
    'admin-approval',
    'load-rehearsal',
    'code-review',
  ] as const
  const STATES = ['met', 'unmet', 'not_built'] as const
  const item = (
    id: string,
    state: Schemas['LaunchReadinessItem']['state'],
  ): Schemas['LaunchReadinessItem'] => ({
    id: id as Schemas['LaunchReadinessItem']['id'],
    title: `The platform's own title for ${id}`,
    owner: 'platform admin (§9)',
    blocking: id !== 'code-review',
    state,
    why: 'Nothing is serving in staging yet, so there is no release to approve (§13).',
  })
  const checklist = (
    items: Schemas['LaunchReadinessItem'][],
    candidate: string | null = fixtures.RELEASE_ID,
  ): Schemas['LaunchReadiness'] => ({
    ...fixtures.LAUNCH_READINESS,
    candidateReleaseId: candidate,
    items,
  })
  const row = (
    id: string,
    state: Schemas['LaunchReadinessItem']['state'],
    candidate: string | null = fixtures.RELEASE_ID,
  ): Row => rowsOf(checklist([item(id, state)], candidate), context)[0]!

  it('the two clocks are cards of their own, never rows', () => {
    const rows = rowsOf(fixtures.LAUNCH_READINESS, context)
    expect(rows.map((r) => r.id)).not.toContain('iam-registration')
    expect(rows.map((r) => r.id)).not.toContain('privacy-assessment')
  })

  it('code review comes last, set apart; the rest keep the checklist’s order', () => {
    const rows = rowsOf(
      checklist([
        item('code-review', 'not_built'),
        item('domain', 'met'),
        item('scans', 'met'),
      ]),
      context,
    )
    expect(rows.map((r) => [r.id, r.apart])).toEqual([
      ['domain', false],
      ['scans', false],
      ['code-review', true],
    ])
  })

  it('every id × state the contract allows has a state of the five, a name, words, and no machinery', () => {
    for (const id of IDS)
      for (const state of STATES)
        for (const candidate of [fixtures.RELEASE_ID, null]) {
          const rows = rowsOf(checklist([item(id, state)], candidate), context)
          if (CLOCK_IDS.includes(id)) {
            expect(rows).toEqual([])
            continue
          }
          const r = rows[0]!
          const where = `${id} × ${state} × ${candidate === null ? 'none' : 'candidate'}`
          expect(
            ['working', 'waiting', 'attention', 'steady', 'notyet'],
            where,
          ).toContain(r.state)
          expect(r.name, where).not.toBe('')
          expect(r.words, where).not.toBe('')
          const said = [r.name, r.words, r.owner].join(' ').replace(HOST, '')
          expect(machineryIn(said), where).toEqual([])
          expect(said, where).not.toMatch(/weeks?\b|§|why|staging/i)
          // From the checklist alone, one row can be pressed: the dry run, theirs to start once a
          // version is on trying-out (FE-42 (a); Rich: "Build it now").
          expect(r.action, where).toBe(
            id === 'rehearsal' && state === 'unmet' && candidate !== null
              ? 'dry-run'
              : null,
          )
        }
  })

  it('met is steady; not built is not yet', () => {
    for (const id of [
      'domain',
      'rehearsal',
      'scans',
      'admin-approval',
      'load-rehearsal',
    ]) {
      expect(row(id, 'met').state, id).toBe('steady')
      expect(row(id, 'not_built').state, id).toBe('notyet')
    }
  })

  it.each(['rehearsal', 'scans', 'admin-approval'])(
    '%s unmet with nothing on trying-out is not yet, once a version is there (S1: M3)',
    (id) => {
      const r = row(id, 'unmet', null)
      expect(r.state).toBe('notyet')
      expect(r.words).toBe('Once a version is on your trying-out address.')
    },
  )

  it('scans met: checked, done for you', () =>
    expect(row('scans', 'met')).toMatchObject({
      state: 'steady',
      words:
        'Checked for security problems. Nothing needs fixing, and we check again on every build.',
      owner: 'done for you',
    }))

  it('scans unmet with a candidate: waiting on the Manifest team, with no action (Decision 7)', () =>
    expect(row('scans', 'unmet')).toMatchObject({
      state: 'waiting',
      words:
        'Something it’s built on has a known security problem. Keeping what apps are built on up to date is the Manifest team’s job.',
      owner: 'the Manifest team',
      action: null,
    }))

  it('the dry run with a candidate: needs you, theirs to start (FE-42 (a); Rich: "Build it now")', () =>
    expect(row('rehearsal', 'unmet')).toMatchObject({
      state: 'attention',
      words:
        'We put it up with nobody watching, check it answers and signs someone in, then take it down.',
      owner: 'you start it; minutes',
      action: 'dry-run',
    }))

  it('the dry run passed: done', () =>
    expect(row('rehearsal', 'met')).toMatchObject({
      state: 'steady',
      words: 'Done. It answered and signed someone in on the live setup.',
    }))

  it('the sign-off with a candidate: waiting on a Manifest administrator, who is not told', () =>
    expect(row('admin-approval', 'unmet')).toMatchObject({
      state: 'waiting',
      words:
        'A Manifest administrator looks at what it keeps, who it lets in and what it can reach, then signs it off, so nobody’s app reaches students with something it shouldn’t have. Manifest doesn’t tell them yet that it’s waiting.',
      owner: 'a Manifest administrator',
    }))

  it('its address, met: the address, yours for good, done for you', () => {
    expect(row('domain', 'met')).toMatchObject({
      state: 'steady',
      words: `Its address is ${HOST}, yours for good.`,
      address: HOST,
      owner: 'done for you',
    })
    const unknown = rowsOf(checklist([item('domain', 'met')]), { hostname: null })[0]!
    expect(unknown).toMatchObject({
      words: 'Its address is yours for good.',
      address: null,
    })
  })

  it('code review: not yet, nobody yet, and what keeps it safe instead', () =>
    expect(row('code-review', 'not_built')).toMatchObject({
      state: 'notyet',
      words:
        'Nobody reviews the code itself yet. What keeps it safe is how it runs: it can only reach what it asks for, and only its own data.',
      owner: 'nobody yet',
      apart: true,
    }))

  it('a test with everyone at once only when the checklist lists it (S1: M3)', () => {
    expect(rowsOf(checklist([item('domain', 'met')]), context).map((r) => r.id)).toEqual([
      'domain',
    ])
    expect(row('load-rehearsal', 'unmet')).toMatchObject({ owner: 'us, in minutes' })
  })

  it('an id the platform adds tomorrow is shown, never hidden (spec D23.8)', () => {
    const r = rowsOf(checklist([item('accessibility-audit', 'unmet')]), context)[0]!
    expect(r.name).toBe(
      "Something new on the list: The platform's own title for accessibility-audit",
    )
    expect(r.state).toBe('notyet')
    expect(r.action).toBeNull()
  })

  it('the sign-off refused, read from its approval, is the one row that needs them (Task 8)', () => {
    const refused = rowsOf(checklist([item('admin-approval', 'unmet')]), {
      ...context,
      approval: { ...fixtures.APPROVAL, decision: 'rejected', reason: 'Not yet, sorry.' },
    })[0]!
    expect(refused).toMatchObject({ state: 'attention', action: 'talk-it-through' })
  })

  it('from the checklist alone, nothing is at work, and only the dry run needs you: nobody has decided', () => {
    const rows = IDS.flatMap((id) =>
      STATES.flatMap((state) => [row(id, state), row(id, state, null)].filter(Boolean)),
    )
    expect(rows.filter((r) => r.state === 'attention').map((r) => r.id)).toEqual([
      'rehearsal',
    ])
    expect(rows.map((r) => r.state)).not.toContain('working')
  })
})
