import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { agoWords, attemptFact, releasesToRead, servingFact } from './facts.js'

/**
 * THE TWO FACTS, FOR ONE ADDRESS (F4 Task 5, walk-through moment 7). *Serving right now* is the
 * environment's own `instance`, "the instance the hostname reaches", never `listInstances`' first
 * entry. *The last attempt* cannot be read from the list's order: it is "the one seen most
 * recently first" (F4 sitting 1, M3: a new instance was listed SECOND while it started), and an
 * instance carries no time of its own (FE-38). So a failed attempt is the last one when its
 * version is newer than the one serving; the same version failing is an earlier try.
 */
const TZ = 'America/Vancouver'
const f = words.preview.facts
const ENV_ID = '33333333-3333-4333-8333-333333333331'

const release = (id: string, createdAt: string): Schemas['Release'] =>
  ({ id, createdAt }) as Schemas['Release']
const OLD = release('r-old', '2026-09-28T22:12:00.000Z') // 3:12pm in Vancouver
const NEW = release('r-new', '2026-09-28T23:00:00.000Z')
const RELEASES = new Map([
  [OLD.id, OLD],
  [NEW.id, NEW],
])

const instance = (
  id: string,
  releaseId: string,
  state: Schemas['Instance']['state'],
  serving = false,
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: ENV_ID,
  releaseId,
  kind: 'web',
  state,
  lastSeenAt: state === 'healthy' ? '2026-09-28T23:10:00.000Z' : null,
  serving,
})
const env = (
  kind: Schemas['Environment']['kind'],
  serving: Schemas['InstanceSummary'] | null,
): Schemas['Environment'] => ({
  id: ENV_ID,
  projectId: '22222222-2222-4222-8222-222222222222',
  kind,
  hostname: `reading-responses.${kind}.manifest.internal`,
  url: `https://reading-responses.${kind}.manifest.internal`,
  instance:
    serving === null
      ? null
      : {
          id: serving.id,
          environmentId: serving.environmentId,
          releaseId: serving.releaseId,
          kind: serving.kind,
          state: serving.state,
          lastSeenAt: serving.lastSeenAt,
        },
})
const incident = (instanceId: string, createdAt: string): Schemas['Incident'] => ({
  id: `incident-${instanceId}`,
  instanceId,
  releaseId: 'r-new',
  exitReason: 'the readiness probe never answered 200',
  logTail: '',
  failedCheck: 'GET /healthz',
  diffSinceHealthy: '',
  createdAt,
  prompt: '',
})
const NOW = new Date('2026-09-28T23:14:00.000Z')

describe('serving right now', () => {
  it("is the address's own instance, with its version's date", () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    expect(servingFact(env('sandbox', serving), OLD, TZ)).toEqual({
      words: 'The version from 28 September, 3:12pm',
      tone: 'steady',
    })
  })

  it('nothing on the draft yet says when it appears; elsewhere, only that nothing is there', () => {
    expect(servingFact(env('sandbox', null), undefined, TZ)).toEqual({
      words: f.nothingDraft,
      tone: 'neutral',
    })
    expect(f.nothingDraft).toBe(
      'Nothing there yet. It appears when the first build is done.',
    )
    expect(servingFact(env('staging', null), undefined, TZ).words).toBe(f.nothing)
  })

  it('a version whose date cannot be read is still answering, without a date', () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    expect(servingFact(env('sandbox', serving), undefined, TZ)).toEqual({
      words: words.facts.answering,
      tone: 'steady',
    })
  })

  it('an address reaching one that is not answering says so in our words', () => {
    const asleep = instance('i-1', OLD.id, 'hibernated', true)
    expect(servingFact(env('sandbox', asleep), OLD, TZ).words).toBe(words.facts.asleep)
  })
})

describe('the last attempt', () => {
  it('is the same version when the one serving was the last to go there', () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    expect(
      attemptFact(env('sandbox', serving), [serving], [], RELEASES, NOW, TZ),
    ).toEqual({
      words: f.same,
      tone: 'steady',
      failed: false,
      instanceId: 'i-1',
      incidentId: null,
    })
    expect(f.same).toBe("The same version. It's the one answering.")
  })

  it('a newer version that failed: "didn\'t start, 4 minutes ago", from its incident, listed second or first', () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    const failed = instance('i-2', NEW.id, 'failed')
    const incidents = [incident('i-2', '2026-09-28T23:10:00.000Z')]
    const expected = {
      words: "Didn't start, 4 minutes ago. Nobody lost anything.",
      tone: 'attention',
      failed: true,
      instanceId: 'i-2',
      // Why it did not start, for [What went wrong] (F4 Task 10).
      incidentId: 'incident-i-2',
    }
    // "Seen most recently first" (M3): the serving one is seen all the time, so it leads.
    for (const list of [
      [serving, failed],
      [failed, serving],
    ])
      expect(
        attemptFact(env('sandbox', serving), list, incidents, RELEASES, NOW, TZ),
      ).toEqual(expected)
  })

  it('an EARLIER failure is not the last attempt: an older version, or the same one tried again', () => {
    const serving = instance('i-1', NEW.id, 'healthy', true)
    const older = instance('i-0', OLD.id, 'failed')
    const sameAgain = instance('i-9', NEW.id, 'failed')
    const incidents = [
      incident('i-9', '2026-09-28T23:05:00.000Z'),
      incident('i-0', '2026-09-28T22:30:00.000Z'),
    ]
    expect(
      attemptFact(
        env('sandbox', serving),
        [serving, sameAgain, older],
        incidents,
        RELEASES,
        NOW,
        TZ,
      ),
    ).toMatchObject({ words: f.same, failed: false })
  })

  it('an attempt on its way up is under way, wherever the list puts it', () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    for (const state of ['pending', 'building', 'provisioning', 'starting'] as const) {
      const rising = instance('i-2', NEW.id, state)
      for (const list of [
        [serving, rising],
        [rising, serving],
      ])
        expect(attemptFact(env('sandbox', serving), list, [], RELEASES, NOW, TZ)).toEqual(
          {
            words: f.underWay,
            tone: 'working',
            failed: false,
            instanceId: 'i-2',
            incidentId: null,
          },
        )
    }
    expect(f.underWay).toBe('Under way, started a moment ago.')
  })

  it('with nothing serving, a failure is the last attempt; with nothing tried, there is none', () => {
    const failed = instance('i-2', NEW.id, 'failed')
    expect(
      attemptFact(
        env('sandbox', null),
        [failed],
        [incident('i-2', '2026-09-28T23:10:00.000Z')],
        RELEASES,
        NOW,
        TZ,
      ),
    ).toMatchObject({ failed: true, instanceId: 'i-2' })
    expect(attemptFact(env('production', null), [], [], RELEASES, NOW, TZ)).toBeNull()
  })

  it('a failure with no incident to date it still says it did not start', () => {
    const failed = instance('i-2', NEW.id, 'failed')
    expect(
      attemptFact(env('sandbox', null), [failed], [], RELEASES, NOW, TZ),
    ).toMatchObject({
      words: "Didn't start. Nobody lost anything.",
      failed: true,
      incidentId: null,
    })
  })

  it('names the versions it must read: the one serving, and each that failed', () => {
    const serving = instance('i-1', OLD.id, 'healthy', true)
    const failed = instance('i-2', NEW.id, 'failed')
    const again = instance('i-3', NEW.id, 'failed')
    expect(
      releasesToRead(env('sandbox', serving), [serving, failed, again]).sort(),
    ).toEqual(['r-new', 'r-old'])
  })
})

describe('agoWords', () => {
  it.each([
    ['2026-09-28T23:13:30.000Z', 'a moment ago'],
    ['2026-09-28T23:12:30.000Z', 'a minute ago'],
    ['2026-09-28T23:10:00.000Z', '4 minutes ago'],
    ['2026-09-28T22:10:00.000Z', 'an hour ago'],
    ['2026-09-28T18:14:00.000Z', '5 hours ago'],
    ['2026-09-26T22:12:00.000Z', 'on 26 September, 3:12pm'],
    // A clock a little ahead is never "in 2 minutes".
    ['2026-09-28T23:16:00.000Z', 'a moment ago'],
  ])('%s is "%s"', (then, said) => {
    expect(agoWords(new Date(then), NOW, TZ)).toBe(said)
  })
})
