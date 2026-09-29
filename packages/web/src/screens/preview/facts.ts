import type { Schemas } from '@manifest/contract'
import type { FactTone } from '@manifest-app/ui'
import { words } from '../../words.js'
import { studentsFact, versionWords } from '../your-apps/model.js'

/**
 * THE TWO FACTS FOR ONE ADDRESS (F4 Task 5, moment 7), derived here and nowhere else, and pure.
 * Words come from words.ts.
 */
export type Said = { words: string; tone: FactTone }
export type Attempt = Said & { failed: boolean; instanceId: string }

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

/** Whether `failed` came after the version serving: by the versions' own dates (FE-38). */
function after(
  failed: Schemas['InstanceSummary'],
  serving: Schemas['Instance'] | null,
  releases: ReadonlyMap<string, Schemas['Release']>,
): boolean {
  if (serving === null || failed.id === serving.id) return true
  // The same version failing is an earlier try: a failed instance never serves, so the one
  // serving went there after it (and trying-out never puts the version already there, Task 10).
  if (failed.releaseId === serving.releaseId) return false
  const tried = releases.get(failed.releaseId)?.createdAt
  const serves = releases.get(serving.releaseId)?.createdAt
  if (tried === undefined || serves === undefined) return false
  return Date.parse(tried) > Date.parse(serves)
}

/**
 * THE LAST ATTEMPT. **Never read from the list's order**: `listInstances` is "the one seen most
 * recently first" (F4 M3: a new instance was listed second while it started), and an instance
 * carries no time of its own (FE-38). So:
 * - one on its way up is under way;
 * - else a failure is the last attempt when nothing serves, or its version is newer than the
 *   one serving; its time is its incident's;
 * - else the one serving was the last to go there.
 * Null when nothing was ever tried.
 */
export function attemptFact(
  env: Schemas['Environment'],
  instances: Schemas['InstanceSummary'][],
  incidents: Schemas['Incident'][],
  releases: ReadonlyMap<string, Schemas['Release']>,
  now: Date,
  timeZone?: string,
): Attempt | null {
  const rising = instances.find((i) => UNDER_WAY.has(i.state))
  if (rising !== undefined)
    return { words: f.underWay, tone: 'working', failed: false, instanceId: rising.id }
  const failures = instances.filter(
    (i) => i.state === 'failed' && after(i, env.instance, releases),
  )
  // The latest failure is the one whose incident is newest; incidents are newest first.
  const latest =
    incidents
      .map((incident) => failures.find((i) => i.id === incident.instanceId))
      .find((i) => i !== undefined) ?? failures[0]
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
    }
  }
  if (env.instance === null) return null
  return { words: f.same, tone: 'steady', failed: false, instanceId: env.instance.id }
}

/** The versions the facts must date: the one serving, and each that failed. */
export function releasesToRead(
  env: Schemas['Environment'],
  instances: Schemas['InstanceSummary'][],
): string[] {
  return [
    ...new Set([
      ...(env.instance === null ? [] : [env.instance.releaseId]),
      ...instances.filter((i) => i.state === 'failed').map((i) => i.releaseId),
    ]),
  ]
}

/** Whether an incident must be read to say when: a failure that is the last attempt. */
export function needsIncidents(
  env: Schemas['Environment'],
  instances: Schemas['InstanceSummary'][],
  releases: ReadonlyMap<string, Schemas['Release']>,
): boolean {
  return (
    !instances.some((i) => UNDER_WAY.has(i.state)) &&
    instances.some((i) => i.state === 'failed' && after(i, env.instance, releases))
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
