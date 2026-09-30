import type { Schemas } from '@manifest/contract'
import type { FactTone } from '@manifest-app/ui'
import { words } from '../../words.js'
import { studentsFact, versionWords } from '../your-apps/model.js'

/**
 * THE TWO FACTS FOR ONE ADDRESS (F4 Task 5, moment 7), derived here and nowhere else, and pure.
 * Words come from words.ts.
 */
export type Said = { words: string; tone: FactTone }
export type Attempt = Said & {
  failed: boolean
  instanceId: string
  /** Why a failed attempt did not start, when its incident is read (F4 Task 10's [What went wrong]). */
  incidentId: string | null
}

const f = words.preview.facts

/** The states an attempt passes through on its way up (§11). */
const UNDER_WAY = new Set<Schemas['Instance']['state']>([
  'pending',
  'building',
  'provisioning',
  'starting',
])

const TONE_OF = { steady: 'steady', working: 'working', attention: 'attention' } as const

/**
 * SERVING RIGHT NOW: the address's own `instance`, *"the instance the hostname reaches"*, never
 * `listInstances`' first entry (FE-27's rule, F1). A version is *"the version from <when>"*.
 */
export function servingFact(
  env: Schemas['Environment'],
  release: Schemas['Release'] | undefined,
  timeZone?: string,
): Said {
  const instance = env.instance
  if (instance === null)
    return { words: env.kind === 'sandbox' ? f.nothingDraft : f.nothing, tone: 'neutral' }
  if (instance.state === 'healthy') {
    const version = release === undefined ? '' : versionWords(release.createdAt, timeZone)
    return {
      words:
        version === ''
          ? words.facts.answering
          : version.charAt(0).toUpperCase() + version.slice(1),
      tone: 'steady',
    }
  }
  // Asleep, starting, never answered…: F1's words for what an address reaches.
  const fact = studentsFact(instance, release, timeZone)
  return {
    words: fact.words,
    tone: (TONE_OF as Record<string, FactTone>)[fact.state] ?? 'neutral',
  }
}

/**
 * Whether `failed` came after the one serving: by when each was made (FE-38, contract 1.5.0),
 * whatever their versions, so a version put back after a newer one failed reads as the last.
 */
function after(
  failed: Schemas['InstanceSummary'],
  serving: Schemas['Instance'] | null,
): boolean {
  if (serving === null || failed.id === serving.id) return true
  return Date.parse(failed.createdAt) > Date.parse(serving.createdAt)
}

/**
 * THE LAST ATTEMPT. **Never read from the list's order**: `listInstances` is "the one seen most
 * recently first" (F4 M3: a new instance was listed second while it started). Each instance
 * carries when the deploy made it (FE-38, contract 1.5.0). So:
 * - one on its way up is under way;
 * - else the newest failure made after the one serving (or with nothing serving) is the last
 *   attempt; its time is its incident's, once written;
 * - else the one serving was the last to go there.
 * Null when nothing was ever tried.
 */
export function attemptFact(
  env: Schemas['Environment'],
  instances: Schemas['InstanceSummary'][],
  incidents: Schemas['Incident'][],
  now: Date,
  timeZone?: string,
): Attempt | null {
  const rising = instances.find((i) => UNDER_WAY.has(i.state))
  if (rising !== undefined)
    return {
      words: f.underWay,
      tone: 'working',
      failed: false,
      instanceId: rising.id,
      incidentId: null,
    }
  const latest = instances
    .filter((i) => i.state === 'failed' && after(i, env.instance))
    .reduce<Schemas['InstanceSummary'] | undefined>(
      (newest, i) =>
        newest === undefined || Date.parse(i.createdAt) > Date.parse(newest.createdAt)
          ? i
          : newest,
      undefined,
    )
  if (latest !== undefined) {
    const incident = incidents.find((i) => i.instanceId === latest.id)
    const when =
      incident === undefined
        ? null
        : agoWords(new Date(incident.createdAt), now, timeZone)
    return {
      words: f.failed(when),
      tone: 'attention',
      failed: true,
      instanceId: latest.id,
      incidentId: incident?.id ?? null,
    }
  }
  if (env.instance === null) return null
  return {
    words: f.same,
    tone: 'steady',
    failed: false,
    instanceId: env.instance.id,
    incidentId: null,
  }
}

/** The version the facts must date: the one serving (a failure is dated by its instance, FE-38). */
export function releasesToRead(env: Schemas['Environment']): string[] {
  return env.instance === null ? [] : [env.instance.releaseId]
}

/** Whether an incident must be read to say when: a failure that is the last attempt. */
export function needsIncidents(
  env: Schemas['Environment'],
  instances: Schemas['InstanceSummary'][],
): boolean {
  return (
    !instances.some((i) => UNDER_WAY.has(i.state)) &&
    instances.some((i) => i.state === 'failed' && after(i, env.instance))
  )
}

/** "4 minutes ago"; past a day, "on 26 September, 3:12pm" in their own time zone. */
export function agoWords(then: Date, now: Date, timeZone?: string): string {
  const a = words.preview.ago
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return a.moment
  if (minutes < 2) return a.minute
  if (minutes < 60) return a.minutes(minutes)
  const hours = Math.floor(minutes / 60)
  if (hours < 2) return a.hour
  if (hours < 24) return a.hours(hours)
  // versionWords' date and time, without "the version from".
  return a.on(
    versionWords(then.toISOString(), timeZone).replace(`${words.facts.versionFrom} `, ''),
  )
}
