import type { Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import {
  appCard,
  audienceWords,
  beforeLaunch,
  mine,
  studentsFact,
  unreadableCard,
  versionWords,
} from './model.js'

const inst = (state: string) =>
  ({
    id: 'i',
    environmentId: 'e',
    releaseId: 'r',
    kind: 'web',
    state,
    lastSeenAt: null,
  }) as unknown as Schemas['Instance']
/** 9:00am in Vancouver. */
const rel = { createdAt: '2026-09-18T16:00:00Z' } as Schemas['Release']
const V = 'America/Vancouver'

describe('the students’ fact: what reaches an address (Environment.instance)', () => {
  it('nothing deployed is not yet', () =>
    expect(studentsFact(null, undefined, V)).toEqual({
      state: 'notyet',
      words: 'Not live yet',
    }))
  it('healthy is steady, in words, with its version', () =>
    expect(studentsFact(inst('healthy'), rel, V)).toEqual({
      state: 'steady',
      words: 'Answering · the version from 18 September, 9:00am',
    }))
  it.each(['pending', 'building', 'provisioning', 'starting', 'waking'])(
    '%s is working',
    (s) => expect(studentsFact(inst(s), rel, V).state).toBe('working'),
  )
  it('failed is needs-you, in words', () =>
    expect(studentsFact(inst('failed'), rel, V)).toEqual({
      state: 'attention',
      words: 'It never answered',
    }))
  it('hibernated is not yet, in words', () =>
    expect(studentsFact(inst('hibernated'), rel, V)).toEqual({
      state: 'notyet',
      words: 'Asleep until somebody opens it',
    }))
  it('a state from a newer contract is not yet, honestly (Review Focus 4)', () =>
    expect(studentsFact(inst('no-such-state'), rel, V)).toEqual({
      state: 'notyet',
      words: "We can't tell right now",
    }))
  it('no fact carries a machinery word (C3, Decision 9)', () => {
    const states = [
      'pending',
      'building',
      'provisioning',
      'starting',
      'healthy',
      'failed',
    ]
    for (const s of [
      ...states,
      'hibernated',
      'waking',
      'destroying',
      'gone',
      'no-such-state',
    ])
      expect(machineryIn(studentsFact(inst(s), rel, V).words), s).toEqual([])
  })
})

describe('words', () => {
  it('versions are dates, in Vancouver', () =>
    expect(versionWords('2026-09-18T16:00:00Z', V)).toBe(
      'the version from 18 September, 9:00am',
    ))
  it('an afternoon version', () =>
    expect(versionWords('2026-09-18T23:05:00Z', V)).toBe(
      'the version from 18 September, 4:05pm',
    ))
  it('audience', () =>
    expect(audienceWords({ scale: 'class', burst: 'synchronised' } as never)).toBe(
      'one class, all arriving at once',
    ))
  it.each([
    ['solo', 'steady', 'just you, coming and going'],
    ['large_course', 'steady', 'a large course, coming and going'],
    ['public', 'synchronised', 'anyone at all, all arriving at once'],
  ])('audience %s, %s', (scale, burst, words) =>
    expect(audienceWords({ scale, burst } as never)).toBe(words),
  )
  it('no audience yet says nothing', () => expect(audienceWords(null)).toBe(''))
  it('an audience value from a newer contract is left out, never shown raw', () =>
    expect(audienceWords({ scale: 'galaxy', burst: 'steady' } as never)).toBe(
      'coming and going',
    ))
})

describe('mine: an administrator sees their own (Review Focus 3, FE-10)', () => {
  const list = [
    { slug: 'a', owner: { id: 'u1' } },
    { slug: 'b', owner: { id: 'u2' } },
  ] as unknown as Schemas['ProjectList']
  const slugs = (projects: Schemas['ProjectList']) => projects.map((p) => p.slug)
  it('an administrator keeps only what they own', () =>
    expect(slugs(mine(list, { id: 'u1', role: 'admin' } as Schemas['Me']))).toEqual([
      'a',
    ]))
  it('a member keeps everything: listProjects already answers only their projects', () =>
    expect(slugs(mine(list, { id: 'u1', role: 'member' } as Schemas['Me']))).toEqual([
      'a',
      'b',
    ]))
})

describe('a card whose project could not be read (review, deferred minor)', () => {
  it('keeps what the list told us, and says honestly that it cannot tell the rest', () => {
    const project = {
      id: 'p',
      slug: 'reading-responses',
      name: 'Reading responses',
      audience: { scale: 'class', burst: 'synchronised' },
    } as unknown as Schemas['Project']
    const cantTell = { state: 'notyet', words: "We can't tell right now" }
    expect(unreadableCard(project)).toEqual({
      id: 'p',
      slug: 'reading-responses',
      name: 'Reading responses',
      audience: 'one class, all arriving at once',
      students: cantTell,
      draft: { hostname: undefined, fact: cantTell },
      tryingOut: { hostname: undefined, fact: cantTell },
      beforeStudents: false,
    })
  })
})

/**
 * BEFORE YOUR STUDENTS CAN USE IT (F5 Task 5, Decision 3): a built app, not launched, with a
 * production clock unmet. Only a built, unlaunched app's checklist is read at all.
 */
describe('before your students can use it (Decision 3)', () => {
  const PROJECT = fixtures.PROJECT_EXPANDED
  const sandbox = (p: Schemas['Project']) =>
    p.environments?.find((e) => e.kind === 'sandbox')
  const unbuilt: Schemas['Project'] = {
    ...PROJECT,
    environments: PROJECT.environments!.map((e) =>
      e.kind === 'sandbox' ? { ...e, instance: null } : e,
    ),
  }
  const launched: Schemas['Project'] = {
    ...PROJECT,
    launchedAt: '2026-10-03T17:00:00.000Z',
  }
  const BOTH_MET: Schemas['LaunchReadiness'] = {
    ...fixtures.LAUNCH_READINESS,
    items: fixtures.LAUNCH_READINESS.items.map((i) => ({ ...i, state: 'met' as const })),
  }

  it('a built app that has not launched is one whose checklist we read', () => {
    expect(beforeLaunch(PROJECT, sandbox(PROJECT))).toBe(true)
    expect(beforeLaunch(unbuilt, sandbox(unbuilt))).toBe(false)
    expect(beforeLaunch(launched, sandbox(launched))).toBe(false)
    expect(beforeLaunch(PROJECT, undefined)).toBe(false)
  })

  it('its card carries the line while a production clock is unmet', () =>
    expect(appCard(PROJECT, new Map(), V, fixtures.LAUNCH_READINESS).beforeStudents).toBe(
      true,
    ))

  it.each([
    ['not built', unbuilt, fixtures.LAUNCH_READINESS],
    ['launched', launched, fixtures.LAUNCH_READINESS],
    ['both clocks met', PROJECT, BOTH_MET],
    ['its checklist not read', PROJECT, undefined],
  ] as const)('%s: no line', (_, project, readiness) =>
    expect(appCard(project, new Map(), V, readiness).beforeStudents).toBe(false),
  )
})
