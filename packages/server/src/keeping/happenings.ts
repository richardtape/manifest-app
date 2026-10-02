import type { Happening, Line } from '../api/progress.js'
import type { HistoryEntry, KeptMember } from '../store/keeping.js'

/**
 * F6 TASK 4: WHAT HAPPENED, AS A PERSON READS IT (Decisions 1 and 2), pure. `history` keeps each
 * event as the platform sent it; here an entry becomes a typed happening, and the lines are chosen
 * when read. Every field is read as `unknown`: a detail missing what a happening needs, or a type
 * from a newer contract, is no happening, never a crash.
 */

type Detail = Record<string, unknown>

const detailOf = (entry: HistoryEntry): Detail =>
  typeof entry.detail === 'object' &&
  entry.detail !== null &&
  !Array.isArray(entry.detail)
    ? (entry.detail as Detail)
    : {}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

type Role = 'owner' | 'collaborator'
const role = (value: unknown): Role | undefined =>
  value === 'owner' || value === 'collaborator' ? value : undefined

/** Decision 13: who acted, where the event carries one. */
const byOf = (detail: Detail): string | null => text(detail.userId) ?? null

/** A registration or assessment the platform recorded: sent (an administrator saying so), or UBC's answer. */
function recorded(detail: Detail, by: 'identity' | 'privacy'): Happening | null {
  const state = text(detail.state)
  if (state === undefined) return null
  return state === 'submitted'
    ? { kind: 'sent', to: by }
    : { kind: 'answered', by, state }
}

export function happeningOf(entry: HistoryEntry): Happening | null {
  const detail = detailOf(entry)
  switch (entry.type) {
    case 'project.launched': {
      const instanceId = text(detail.instanceId)
      return instanceId === undefined ? null : { kind: 'went-live', instanceId }
    }
    case 'instance.healthy': {
      const instanceId = text(detail.instanceId)
      const releaseId = text(detail.releaseId)
      if (detail.environment !== 'production' || !instanceId || !releaseId) return null
      return { kind: 'reached-students', instanceId, releaseId }
    }
    case 'incident.opened': {
      const incidentId = text(detail.incidentId)
      const releaseId = text(detail.releaseId)
      if (detail.environment !== 'production' || !incidentId || !releaseId) return null
      return { kind: 'change-failed', incidentId, releaseId }
    }
    case 'release.approved':
    case 'release.approval_rejected': {
      const releaseId = text(detail.releaseId)
      if (releaseId === undefined) return null
      return entry.type === 'release.approved'
        ? { kind: 'signed-off', releaseId }
        : { kind: 'turned-down', releaseId }
    }
    case 'rehearsal.completed':
      return typeof detail.passed === 'boolean'
        ? { kind: 'dry-run', passed: detail.passed }
        : null
    case 'iam_registration.submitted':
      return { kind: 'sent', to: 'identity' }
    case 'privacy_assessment.submitted':
      return { kind: 'sent', to: 'privacy' }
    case 'iam_registration.recorded':
      return recorded(detail, 'identity')
    case 'privacy_assessment.recorded':
      return recorded(detail, 'privacy')
    case 'member.added': {
      const userId = text(detail.memberId)
      const now = role(detail.role)
      const before = detail.previousRole == null ? null : role(detail.previousRole)
      if (!userId || !now || before === undefined) return null
      return {
        kind: 'member-added',
        userId,
        role: now,
        previousRole: before,
        by: byOf(detail),
      }
    }
    case 'member.removed': {
      const userId = text(detail.memberId)
      return userId === undefined
        ? null
        : { kind: 'member-removed', userId, by: byOf(detail) }
    }
    case 'project.archived':
      return { kind: 'switched-off', by: byOf(detail) }
    case 'project.restored':
      return { kind: 'switched-on', by: byOf(detail) }
    case 'project.renamed': {
      const from = text(detail.from)
      const to = text(detail.to)
      return from && to ? { kind: 'renamed', from, to, by: byOf(detail) } : null
    }
    case 'keeping.unreachable': {
      const from = text(detail.from)
      return from === undefined ? null : { kind: 'unreachable', from }
    }
    case 'keeping.answering': {
      const from = text(detail.from)
      const to = text(detail.to)
      return from && to ? { kind: 'answering-again', from, to } : null
    }
    default:
      return null
  }
}

/** A member's name, by the kept members; an id we do not keep is nobody named. */
function nameOf(members: KeptMember[], userId: string | null): string | null {
  if (userId === null) return null
  return members.find((member) => member.userId === userId)?.displayName ?? null
}

/** Decision 13: who acted, for the happenings a person does (an answer's `by` is UBC's office). */
export function actorOf(happening: Happening): string | null {
  switch (happening.kind) {
    case 'member-added':
    case 'member-removed':
    case 'switched-off':
    case 'switched-on':
    case 'renamed':
      return happening.by
    default:
      return null
  }
}

const whomOf = (happening: Happening): string | null =>
  happening.kind === 'member-added' || happening.kind === 'member-removed'
    ? happening.userId
    : null

/**
 * Decision 2: oldest first in, newest first out. The live address's own happenings count only once
 * the app went live (the held `project.launched`, else the kept app's `launchedAt`: a watch begun
 * after the replay of 50 stopped reaching the launch): before it, a production instance is the dry
 * run's (S1: M2), and a production incident is a first launch's try, which F5's page shows. A
 * production healthy is a new version only when its release differs from the one served before it
 * (the launch's, or the last healthy's): so the launch's own healthy is the launch's line, and a
 * restart, or a healthy with nothing held before it, is no line.
 */
export function linesOf(
  entries: HistoryEntry[],
  members: KeptMember[],
  launchedAt: string | null,
): Line[] {
  const launch = entries.find(
    (entry) => entry.type === 'project.launched' && happeningOf(entry) !== null,
  )
  const wentLive = launch?.at ?? launchedAt
  const isLive = (at: string) =>
    wentLive !== null && Date.parse(at) >= Date.parse(wentLive)

  const lines: Line[] = []
  let serving: string | null = null
  for (const entry of entries) {
    const happening = happeningOf(entry)
    if (happening === null) continue
    if (happening.kind === 'went-live') {
      serving = text(detailOf(entry).releaseId) ?? serving
    } else if (happening.kind === 'reached-students') {
      const before = serving
      serving = happening.releaseId
      if (!isLive(entry.at) || before === null || before === happening.releaseId) continue
    } else if (happening.kind === 'change-failed' && !isLive(entry.at)) {
      continue
    }
    lines.push({
      id: entry.id,
      at: entry.at,
      happening,
      who: nameOf(members, actorOf(happening)),
      whom: nameOf(members, whomOf(happening)),
    })
  }
  return lines.reverse()
}

/** Each gap the keeper recorded (`keeping.gap`, its detail `{ from, to }`), oldest first. */
export function gapsOf(entries: HistoryEntry[]): { from: string; to: string }[] {
  return entries.flatMap((entry) => {
    if (entry.type !== 'keeping.gap') return []
    const detail = detailOf(entry)
    const from = text(detail.from)
    const to = text(detail.to)
    return from && to ? [{ from, to }] : []
  })
}

/** The first event held that is the platform's, not ours: the history's *"From …"*. */
export function fromOf(entries: HistoryEntry[]): string | null {
  return entries.find((entry) => !entry.type.startsWith('keeping.'))?.at ?? null
}
