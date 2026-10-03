import type { Happening, Line, Need } from '@manifest-app/server/progress'
import { describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import {
  clockWords,
  dayWords,
  howLongWords,
  lineWords,
  linesByDay,
  needWords,
  needsStillTrue,
  type PageNeed,
} from './lines.js'

/**
 * F6 TASK 9: A HAPPENING IN WORDS (Decision 1: words are made at reading, here), and what needs
 * the person, in words with its button. Pure. Times in the person's own time zone (F5's dates).
 */
const TZ = 'America/Vancouver'
const AT = '2026-10-01T17:03:00.000Z' // 10:03am in Vancouver
const line = (
  happening: Happening,
  who: string | null = null,
  whom: string | null = null,
): Line => ({
  id: 'e1',
  at: AT,
  happening,
  who,
  whom,
})
const l = words.keeping.lines

describe('clockWords, dayWords and howLongWords', () => {
  it('a time is "10:03am", a day "1 October", in the zone given', () => {
    expect(clockWords(AT, TZ)).toBe('10:03am')
    expect(dayWords(AT, TZ)).toBe('1 October')
    expect(dayWords('2026-10-02T06:30:00.000Z', TZ)).toBe('1 October')
  })

  it.each([
    ['2026-10-01T17:03:00.000Z', '2026-10-01T17:07:00.000Z', '4 minutes'],
    ['2026-10-01T17:03:00.000Z', '2026-10-01T17:03:20.000Z', '1 minute'],
    ['2026-10-01T17:03:00.000Z', '2026-10-01T18:03:00.000Z', '1 hour'],
    ['2026-10-01T17:03:00.000Z', '2026-10-01T19:05:00.000Z', '2 hours and 2 minutes'],
  ])('from %s to %s is %s', (from, to, said) => {
    expect(howLongWords(from, to)).toBe(said)
  })
})

describe('lineWords: every happening (the table in Words proposed for Rich)', () => {
  it.each<[string, Happening, string]>([
    ['went live', { kind: 'went-live', instanceId: 'i' }, l.wentLive],
    [
      'a new version',
      { kind: 'reached-students', instanceId: 'i', releaseId: 'r' },
      l.reachedStudents,
    ],
    [
      'a change failed',
      { kind: 'change-failed', incidentId: 'n', releaseId: 'r' },
      l.changeFailed,
    ],
    ['signed off', { kind: 'signed-off', releaseId: 'r' }, l.signedOff],
    ['turned down', { kind: 'turned-down', releaseId: 'r' }, l.turnedDown],
    ['a dry run passed', { kind: 'dry-run', passed: true }, l.dryRunPassed],
    ['a dry run failed', { kind: 'dry-run', passed: false }, l.dryRunFailed],
    ['sent to identity', { kind: 'sent', to: 'identity' }, l.sentIdentity],
    ['sent to privacy', { kind: 'sent', to: 'privacy' }, l.sentPrivacy],
    [
      'registered',
      { kind: 'answered', by: 'identity', state: 'active' },
      l.identityRegistered,
    ],
    [
      'a change asked',
      { kind: 'answered', by: 'identity', state: 'change_requested' },
      l.identityChange,
    ],
    [
      'identity answered',
      { kind: 'answered', by: 'identity', state: 'rejected' },
      l.identityAnswered,
    ],
    [
      'privacy approved',
      { kind: 'answered', by: 'privacy', state: 'approved' },
      l.privacyApproved,
    ],
    [
      'privacy answered',
      { kind: 'answered', by: 'privacy', state: 'rejected' },
      l.privacyAnswered,
    ],
    ['switched off', { kind: 'switched-off', by: null }, l.switchedOff],
    ['switched on', { kind: 'switched-on', by: null }, l.switchedOn],
    [
      'renamed',
      { kind: 'renamed', from: 'Old name', to: 'New', by: null },
      'Renamed from Old name',
    ],
    ['unreachable', { kind: 'unreachable', from: AT }, l.unreachable],
    [
      'answering again',
      { kind: 'answering-again', from: AT, to: '2026-10-01T17:07:00.000Z' },
      'Answering again. It was down for 4 minutes.',
    ],
  ])('%s', (_name, happening, said) => {
    expect(lineWords(line(happening), TZ)).toBe(said)
  })

  it('a member’s line names its member by whom, and who did it when we know', () => {
    const added = {
      kind: 'member-added',
      userId: 'u',
      role: 'collaborator',
      previousRole: null,
      by: 'a',
    } as const
    expect(lineWords(line(added, null, 'Dan New'))).toBe('Dan New was added')
    expect(lineWords(line(added, 'Alice', 'Dan New'))).toBe('Alice added Dan New')
    const promoted = { ...added, role: 'owner', previousRole: 'collaborator' } as const
    expect(lineWords(line(promoted, null, 'Dan New'))).toBe('Dan New is now an owner')
    expect(
      lineWords(
        line(
          { ...promoted, role: 'collaborator', previousRole: 'owner' },
          'Alice',
          'Dan',
        ),
      ),
    ).toBe('Alice made Dan a helper')
    const removed = { kind: 'member-removed', userId: 'u', by: 'a' } as const
    // (S3) a member removed is no longer kept: "Someone".
    expect(lineWords(line(removed))).toBe('Someone was taken off it')
    expect(lineWords(line(removed, 'Alice', 'Bob'))).toBe('Alice took Bob off it')
  })

  it('switching and renaming say who, when we know', () => {
    expect(lineWords(line({ kind: 'switched-off', by: 'a' }, 'Alice'))).toBe(
      'Alice switched it off',
    )
    expect(lineWords(line({ kind: 'switched-on', by: 'a' }, 'Alice'))).toBe(
      'Alice switched it back on',
    )
    expect(
      lineWords(line({ kind: 'renamed', from: 'Old', to: 'New', by: 'a' }, 'Alice')),
    ).toBe('Alice renamed it from Old')
  })

  it('no machinery in any of them (C3)', () => {
    const all: Happening[] = [
      { kind: 'went-live', instanceId: 'i' },
      { kind: 'reached-students', instanceId: 'i', releaseId: 'r' },
      { kind: 'change-failed', incidentId: 'n', releaseId: 'r' },
      { kind: 'unreachable', from: AT },
      { kind: 'answering-again', from: AT, to: AT },
      { kind: 'answered', by: 'identity', state: 'active' },
    ]
    expect(machineryIn(all.map((h) => lineWords(line(h))).join(' '))).toEqual([])
  })
})

describe('linesByDay: the history grouped by day, newest first, in the person’s zone', () => {
  it('lines on the same Vancouver day share it; the order is kept', () => {
    const at = (iso: string, id: string): Line => ({
      ...line({ kind: 'went-live', instanceId: 'i' }),
      at: iso,
      id,
    })
    const grouped = linesByDay(
      [
        at('2026-10-02T18:00:00.000Z', 'c'),
        at('2026-10-02T06:00:00.000Z', 'b'),
        at('2026-10-01T18:00:00.000Z', 'a'),
      ],
      TZ,
    )
    expect(grouped.map((g) => [g.day, g.lines.map((x) => x.id)])).toEqual([
      ['2 October', ['c']],
      ['1 October', ['b', 'a']],
    ])
  })
})

describe('needWords: each need, its sentence and its button', () => {
  const app = { projectId: 'p', name: 'Reading responses', slug: 'reading-responses' }
  const b = words.keeping.band
  it('a question: Open it, to the conversation', () => {
    const need: Need = {
      kind: 'question',
      app,
      conversationId: 'c 1',
      title: 'Word count',
      since: AT,
    }
    expect(needWords(need, TZ)).toEqual({
      says: b.question('Reading responses'),
      button: { label: b.open, href: '/apps/reading-responses/conversations/c%201' },
    })
  })

  it('down, to an owner: Start it again', () => {
    const need: Need = { kind: 'down', app, from: AT, owner: true }
    expect(needWords(need, TZ)).toEqual({
      says: `${b.down('Reading responses', '10:03am')} ${b.downOwner}`,
      button: { label: b.startAgain, href: '/apps/reading-responses' },
    })
  })

  it('down, to a helper (Review Focus 5): no button, and who can', () => {
    const need: Need = { kind: 'down', app, from: AT, owner: false }
    expect(needWords(need, TZ)).toEqual({
      says: `${b.down('Reading responses', '10:03am')} ${b.downHelper}`,
      button: null,
    })
  })

  it('answering again: What happened?, with how long', () => {
    const need: Need = {
      kind: 'answering-again',
      app,
      from: AT,
      to: '2026-10-01T17:07:00.000Z',
    }
    expect(needWords(need, TZ)).toEqual({
      says: 'Reading responses: answering again since 10:07am. It was down for 4 minutes.',
      button: { label: b.whatHappened, href: '/apps/reading-responses' },
    })
  })

  it('a change that didn’t go live: Give this to your agent', () => {
    const need: Need = {
      kind: 'change-failed',
      app,
      incidentId: 'n',
      at: AT,
      owner: false,
    }
    expect(needWords(need, TZ)).toEqual({
      says: b.changeFailed('Reading responses'),
      button: { label: b.giveIt, href: '/apps/reading-responses/preview?tab=students' },
    })
  })

  it('the page’s own: something on its way to the students needs them, Going live', () => {
    expect(needWords({ kind: 'going-live', app }, TZ)).toEqual({
      says: b.goingLive('Reading responses'),
      button: { label: b.goingLiveButton, href: '/apps/reading-responses/going-live' },
    })
  })

  it.each([true, false])(
    'their agent’s question (F6b Task 12), to an owner (%s) or a helper: Agents, where it is answered or said who can',
    (owner) => {
      const need: Need = {
        kind: 'agent-asks',
        app,
        pendingActionId: 'q',
        tokenId: 't',
        action: 'members:manage',
        at: AT,
        expiresAt: '2026-10-02T17:03:00.000Z',
        owner,
      }
      expect(needWords(need, TZ)).toEqual({
        says: 'Reading responses: your agent is asking something.',
        button: { label: 'Agents', href: '/apps/reading-responses/agents' },
      })
      expect(machineryIn(needWords(need, TZ).says)).toEqual([])
    },
  )
})

describe('needsStillTrue: a switched-off app’s needs are its questions alone (the whole-branch review’s I1)', () => {
  const off = { projectId: 'off', name: 'Reading responses', slug: 'reading-responses' }
  const on = { projectId: 'on', name: 'Class check-ins', slug: 'class-check-ins' }
  const needs: PageNeed[] = [
    { kind: 'down', app: off, from: AT, owner: true },
    { kind: 'answering-again', app: off, from: AT, to: '2026-10-01T17:07:00.000Z' },
    { kind: 'change-failed', app: off, incidentId: 'n', at: AT, owner: true },
    { kind: 'going-live', app: off },
    { kind: 'question', app: off, conversationId: 'c', title: 'Word count', since: AT },
    { kind: 'down', app: on, from: AT, owner: true },
    // F6b Task 12: a switch-off revokes every token, so nothing could be said yes to.
    {
      kind: 'agent-asks',
      app: off,
      pendingActionId: 'q',
      tokenId: 't',
      action: 'members:manage',
      at: AT,
      expiresAt: '2026-10-02T17:03:00.000Z',
      owner: true,
    },
  ]

  it('switched off (the platform’s state, which our server cannot see: S1, M4): its questions alone; another app’s, all', () => {
    expect(needsStillTrue(needs, (projectId) => projectId === 'off')).toEqual([
      needs[4],
      needs[5],
    ])
  })

  it('nothing switched off: every need', () => {
    expect(needsStillTrue(needs, () => false)).toEqual(needs)
  })
})
