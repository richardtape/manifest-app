import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { agoWords, attemptFact, releasesToRead, servingFact } from './facts.js'

/**
 * THE TWO FACTS, FOR ONE ADDRESS (F4 Task 5, walk-through moment 7). *Serving right now* is the
 * environment's own `instance`, "the instance the hostname reaches", never `listInstances`' first
 * entry. *The last attempt* cannot be read from the list's order: it is "the one seen most
 * recently first" (F4 sitting 1, M3: a new instance was listed SECOND while it started). Since
 * contract 1.5.0 an instance carries when the deploy made it (FE-38), so a failed attempt is the
 * last one when it was made after the one serving, whatever its version.
 */
const TZ = 'America/Vancouver'
const f = words.preview.facts
const ENV_ID = '33333333-3333-4333-8333-333333333331'

const release = (id: string, createdAt: string): Schemas['Release'] =>
  ({ id, createdAt }) as Schemas['Release']
const OLD = release('r-old', '2026-09-28T22:12:00.000Z') // 3:12pm in Vancouver
const NEW = release('r-new', '2026-09-28T23:00:00.000Z')

/** A time on 28 September, UTC. */
const at = (hhmm: string) => `2026-09-28T${hhmm}:00.000Z`

const instance = (
  id: string,
  releaseId: string,
  state: Schemas['Instance']['state'],
  /** When the deploy made it (FE-38). */
  made: string,
  serving = false,
): Schemas['InstanceSummary'] => ({
  id,
  environmentId: ENV_ID,
  releaseId,
  kind: 'web',
  state,
  lastSeenAt: state === 'healthy' ? '2026-09-28T23:10:00.000Z' : null,
  createdAt: made,
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
          createdAt: serving.createdAt,
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
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
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
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    expect(servingFact(env('sandbox', serving), undefined, TZ)).toEqual({
      words: words.facts.answering,
      tone: 'steady',
    })
  })

  it('an address reaching one that is not answering says so in our words', () => {
    const asleep = instance('i-1', OLD.id, 'hibernated', at('22:15'), true)
    expect(servingFact(env('sandbox', asleep), OLD, TZ).words).toBe(words.facts.asleep)
  })
})

describe('the last attempt', () => {
  it('is the same version when the one serving was the last to go there', () => {
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    expect(attemptFact(env('sandbox', serving), [serving], [], NOW, TZ)).toEqual({
      words: f.same,
      tone: 'steady',
      failed: false,
      instanceId: 'i-1',
      incidentId: null,
    })
    expect(f.same).toBe("The same version. It's the one answering.")
  })

  it('a newer version that failed: "didn\'t start, 4 minutes ago", from its incident, listed second or first', () => {
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    const failed = instance('i-2', NEW.id, 'failed', at('23:05'))
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
      expect(attemptFact(env('sandbox', serving), list, incidents, NOW, TZ)).toEqual(
        expected,
      )
  })

  it('a failure made BEFORE the one serving is not the last attempt, whatever its version', () => {
    const serving = instance('i-1', NEW.id, 'healthy', at('23:08'), true)
    const older = instance('i-0', OLD.id, 'failed', at('22:25'))
    const sameAgain = instance('i-9', NEW.id, 'failed', at('23:02'))
    const incidents = [
      incident('i-9', '2026-09-28T23:05:00.000Z'),
      incident('i-0', '2026-09-28T22:30:00.000Z'),
    ]
    expect(
      attemptFact(
        env('sandbox', serving),
        [serving, sameAgain, older],
        incidents,
        NOW,
        TZ,
      ),
    ).toMatchObject({ words: f.same, failed: false })
  })

  it('an attempt on its way up is under way, wherever the list puts it', () => {
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    for (const state of ['pending', 'building', 'provisioning', 'starting'] as const) {
      const rising = instance('i-2', NEW.id, state, at('23:13'))
      for (const list of [
        [serving, rising],
        [rising, serving],
      ])
        expect(attemptFact(env('sandbox', serving), list, [], NOW, TZ)).toEqual({
          words: f.underWay,
          tone: 'working',
          failed: false,
          instanceId: 'i-2',
          incidentId: null,
        })
    }
    expect(f.underWay).toBe('Under way, started a moment ago.')
  })

  it('with nothing serving, a failure is the last attempt; with nothing tried, there is none', () => {
    const failed = instance('i-2', NEW.id, 'failed', at('23:05'))
    expect(
      attemptFact(
        env('sandbox', null),
        [failed],
        [incident('i-2', '2026-09-28T23:10:00.000Z')],
        NOW,
        TZ,
      ),
    ).toMatchObject({ failed: true, instanceId: 'i-2' })
    expect(attemptFact(env('production', null), [], [], NOW, TZ)).toBeNull()
  })

  it('a newer version that failed before an older one was put back is not the last attempt (FE-38: a rollback)', () => {
    const failed = instance('i-2', NEW.id, 'failed', at('23:05'))
    const putBack = instance('i-3', OLD.id, 'healthy', at('23:10'), true)
    expect(
      attemptFact(
        env('sandbox', putBack),
        [putBack, failed],
        [incident('i-2', at('23:06'))],
        NOW,
        TZ,
      ),
    ).toMatchObject({ words: f.same, failed: false, instanceId: 'i-3' })
  })

  it('the same version failing AFTER the one serving is the last attempt', () => {
    const serving = instance('i-1', NEW.id, 'healthy', at('23:01'), true)
    const again = instance('i-9', NEW.id, 'failed', at('23:10'))
    expect(
      attemptFact(
        env('sandbox', serving),
        [serving, again],
        [incident('i-9', at('23:11'))],
        NOW,
        TZ,
      ),
    ).toMatchObject({ failed: true, instanceId: 'i-9', incidentId: 'incident-i-9' })
  })

  it('of several failures after the one serving, the last is the newest made, even before its incident is written', () => {
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    const first = instance('i-2', NEW.id, 'failed', at('23:05'))
    const second = instance('i-4', NEW.id, 'failed', at('23:09'))
    for (const list of [
      [serving, first, second],
      [serving, second, first],
    ])
      expect(
        attemptFact(
          env('sandbox', serving),
          list,
          [incident('i-2', at('23:06'))],
          NOW,
          TZ,
        ),
      ).toMatchObject({
        words: "Didn't start. Nobody lost anything.",
        failed: true,
        instanceId: 'i-4',
        incidentId: null,
      })
  })

  it('a failure with no incident to date it still says it did not start', () => {
    const failed = instance('i-2', NEW.id, 'failed', at('23:05'))
    expect(attemptFact(env('sandbox', null), [failed], [], NOW, TZ)).toMatchObject({
      words: "Didn't start. Nobody lost anything.",
      failed: true,
      incidentId: null,
    })
  })

  it('names the one version it must read, the one serving: a failure is dated by its own instance (FE-38)', () => {
    const serving = instance('i-1', OLD.id, 'healthy', at('22:15'), true)
    expect(releasesToRead(env('sandbox', serving))).toEqual(['r-old'])
    expect(releasesToRead(env('sandbox', null))).toEqual([])
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
