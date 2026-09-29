import type { Schemas } from '@manifest/contract'
import type { Station } from '@manifest-app/ui'
import { words } from '../../words.js'
import { versionWords } from '../your-apps/model.js'

/**
 * THE FOUR STATIONS OF A DEPLOY (walk-through moment 9; F4 Decision 11), pure. Each ticks on
 * the new instance's own state, read from `listInstances` every second, never on a timer
 * (Timeline/README.md); the end is `deploy`'s own answer (F4 S1: M2), given here as a state.
 */
export type StationKey = 'turn' | 'room' | 'starting' | 'answering'
export const STATIONS: StationKey[] = ['turn', 'room', 'starting', 'answering']

/** How far along each state is: the index of the station at work, 4 when it answered. */
const REACHED: Record<Schemas['Instance']['state'], number | 'halted'> = {
  pending: 0,
  building: 1,
  provisioning: 1,
  starting: 2,
  waking: 2,
  healthy: 4,
  hibernated: 4,
  failed: 'halted',
  destroying: 'halted',
  gone: 'halted',
}

/**
 * The stations for the new instance, or none listed yet (waiting its turn). A run that ended
 * badly stops at the last station, which carries it: *It never answered* (the prototype's).
 */
export function stationsOf(
  instance: Pick<Schemas['Instance'], 'state'> | null,
): { key: StationKey; state: NonNullable<Station['state']> }[] {
  const reached = instance === null ? 0 : REACHED[instance.state]
  return STATIONS.map((key, i) => {
    if (reached === 'halted')
      return { key, state: i === STATIONS.length - 1 ? 'halted' : 'done' }
    return { key, state: i < reached ? 'done' : i === reached ? 'now' : 'next' }
  })
}

/**
 * THE NEW INSTANCE: the one whose id was not listed at the press (F4 S1: M3). `listInstances` is
 * "the one seen most recently first", so a new instance is listed second while it starts:
 * never a position. Null until it is listed.
 */
export function newestAttempt(
  instances: Schemas['InstanceSummary'][],
  listedAtPress: ReadonlySet<string>,
): Schemas['InstanceSummary'] | null {
  return instances.find((i) => !listedAtPress.has(i.id)) ?? null
}

/** The day a moment falls on, in their own time zone. */
function dayOf(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    ...(timeZone === undefined ? {} : { timeZone }),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * THE VERSION THE QUESTION NAMES (walk-through moment 9): *"the version from today, 3:12pm"*, or
 * its date as every version is named; *"this version"* when its date cannot be read.
 */
export function versionAsked(createdAt: string, now: Date, timeZone?: string): string {
  const version = versionWords(createdAt, timeZone)
  if (version === '') return words.tryingOut.thisVersion
  const made = new Date(createdAt)
  if (dayOf(made, timeZone) !== dayOf(now, timeZone)) return version
  // "the version from 28 September, 3:12pm" → "the version from today, 3:12pm"
  const time = version.slice(version.lastIndexOf(', ') + 2)
  return `${words.facts.versionFrom} ${words.tryingOut.today}, ${time}`
}
