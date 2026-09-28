import type { Schemas } from '@manifest/contract'
import type { State } from '@manifest-app/ui'
import { words } from '../../words.js'

/**
 * EVERY VALUE A CARD ON *YOUR APPS* SHOWS, derived here and nowhere else, and pure.
 */
export type Fact = { state: State; words: string }

const f = words.facts
const FACTS: Record<string, Fact> = {
  pending: { state: 'working', words: f.waitingItsTurn },
  building: { state: 'working', words: f.makingRoom },
  provisioning: { state: 'working', words: f.makingRoom },
  starting: { state: 'working', words: f.startingUp },
  waking: { state: 'working', words: f.wakingUp },
  failed: { state: 'attention', words: f.neverAnswered },
  hibernated: { state: 'notyet', words: f.asleep },
  destroying: { state: 'notyet', words: f.switchedOff },
  gone: { state: 'notyet', words: f.switchedOff },
}

/**
 * What a person reaches at an address. `instance` is the environment's own: *"the instance
 * the hostname reaches (§6 Route). Null before any deploy"* (FE-27: never `listInstances`,
 * whose value is the last attempt, and which the mock answers from the document's example).
 * The same reading serves all three addresses; for production, it is the students' fact,
 * which leads the card (moment 16).
 */
export function studentsFact(
  instance: Schemas['Instance'] | null | undefined,
  release: Schemas['Release'] | undefined,
  timeZone?: string,
): Fact {
  if (instance === null || instance === undefined)
    return { state: 'notyet', words: f.notLive }
  if (instance.state === 'healthy') {
    const version = release === undefined ? '' : versionWords(release.createdAt, timeZone)
    return {
      state: 'steady',
      words: version === '' ? f.answering : `${f.answering} · ${version}`,
    }
  }
  // A state from a newer contract is not yet, honestly (Review Focus 4).
  return FACTS[instance.state] ?? { state: 'notyet', words: f.cantTell }
}

/** "the version from 18 September, 9:00am": a date, never a digest (10-language.md). */
export function versionWords(createdAt: string, timeZone?: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    ...(timeZone === undefined ? {} : { timeZone }),
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${f.versionFrom} ${part('day')} ${part('month')}, ${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

/** "one class, all arriving at once": §24's two answers in words. A value we do not know is left out. */
export function audienceWords(audience: Schemas['Project']['audience']): string {
  if (audience === null || audience === undefined) return ''
  const scale = (words.audience.scale as Record<string, string>)[audience.scale]
  const burst = (words.audience.burst as Record<string, string>)[audience.burst]
  return [scale, burst].filter((w) => w !== undefined).join(', ')
}

/**
 * An administrator's `listProjects` answers every project on the platform, so *Your apps*
 * keeps the ones they own (Review Focus 3). It cannot see the ones they were added to
 * without one `listMembers` per project (FE-10). A member's list is already theirs.
 */
export function mine(
  projects: Schemas['ProjectList'],
  me: Schemas['Me'],
): Schemas['ProjectList'] {
  return me.role === 'admin' ? projects.filter((p) => p.owner.id === me.id) : projects
}

/** One address on a card: its hostname (mono; hostnames are not words) and its fact. */
export type Address = { hostname: string | undefined; fact: Fact }
export type AppCard = {
  id: string
  slug: string
  name: string
  audience: string
  /** Production: the students' fact, which leads the card. */
  students: Fact
  draft: Address
  tryingOut: Address
}

/**
 * Moment 16's card, without its needs-you band and history (F6). `project` is as
 * `getProject?expand=environments` answers it; `releases` holds the release each answering
 * address reaches.
 */
export function appCard(
  project: Schemas['Project'],
  releases: ReadonlyMap<string, Schemas['Release']>,
  timeZone?: string,
): AppCard {
  const address = (kind: Schemas['Environment']['kind']): Address => {
    const environment = project.environments?.find((e) => e.kind === kind)
    const instance = environment?.instance
    const release =
      instance === null || instance === undefined
        ? undefined
        : releases.get(instance.releaseId)
    return {
      hostname: environment?.hostname,
      fact: studentsFact(instance, release, timeZone),
    }
  }
  return {
    id: project.id,
    slug: project.slug,
    // `Project.name` (sitting 5), or the slug before it has one.
    name: project.name ?? project.slug,
    audience: audienceWords(project.audience),
    students: address('production').fact,
    draft: address('sandbox'),
    tryingOut: address('staging'),
  }
}

/** The releases worth a read: the ones an answering address reaches, each once. */
export function releasesToRead(projects: Schemas['Project'][]): string[] {
  const ids = projects.flatMap((p) =>
    (p.environments ?? []).flatMap((e) =>
      e.instance?.state === 'healthy' ? [e.instance.releaseId] : [],
    ),
  )
  return [...new Set(ids)]
}
