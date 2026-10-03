import type { AppRef, Line, Need } from '@manifest-app/server/progress'
import { words } from '../../words.js'

/**
 * F6 TASK 9: WHAT HAPPENED, IN WORDS (Decision 1: our server keeps each event as the platform sent
 * it; the page words it here, from `words.ts`), and WHAT NEEDS THEM, each with its button. Pure.
 * Times are the person's own (F5's dates); an email's are Vancouver's, our server's to say.
 */
const l = words.keeping.lines
const b = words.keeping.band

const zoned = (timeZone?: string) => (timeZone === undefined ? {} : { timeZone })

/** "10:03am" (en-US's parts, as `versionWords` builds its time). */
export function clockWords(at: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...zoned(timeZone),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(at))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

/** "1 October": a long month, never en-GB's short *"Sept"* (§7). */
export function dayWords(at: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    ...zoned(timeZone),
    day: 'numeric',
    month: 'long',
  }).format(new Date(at))
}

const counted = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

/** "4 minutes", "2 hours and 2 minutes": never under a minute. */
export function howLongWords(from: string, to: string): string {
  const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return counted(minutes, 'minute')
  return rest === 0
    ? counted(hours, 'hour')
    : `${counted(hours, 'hour')} and ${counted(rest, 'minute')}`
}

/**
 * One line of what happened, in our words; who did it where our server could name them. A platform
 * administrator who is not a member (the adoption note's question 10) is named in their place, and
 * the reason they gave follows the line.
 */
export function lineWords(line: Line, timeZone?: string): string {
  const { administrator } = line
  // `== null`: a server older than the question 10 sends no field at all.
  if (administrator == null) return sentenceOf(line, line.who, timeZone)
  const sentence = sentenceOf(line, l.administrator(administrator.name), timeZone)
  return sentence === '' ? '' : l.said(sentence, administrator.reason)
}

function sentenceOf(line: Line, who: string | null, timeZone?: string): string {
  const { happening: h } = line
  const whom = line.whom ?? l.someone
  switch (h.kind) {
    case 'went-live':
      return l.wentLive
    case 'reached-students':
      return l.reachedStudents
    case 'change-failed':
      return l.changeFailed
    case 'signed-off':
      return l.signedOff
    case 'turned-down':
      return l.turnedDown
    case 'dry-run':
      return h.passed ? l.dryRunPassed : l.dryRunFailed
    case 'sent':
      return h.to === 'identity' ? l.sentIdentity : l.sentPrivacy
    case 'answered':
      if (h.by === 'identity')
        return h.state === 'active'
          ? l.identityRegistered
          : h.state === 'change_requested'
            ? l.identityChange
            : l.identityAnswered
      return h.state === 'approved' ? l.privacyApproved : l.privacyAnswered
    case 'member-added':
      if (h.previousRole !== null)
        return who === null ? l.nowRole(whom, h.role) : l.madeRole(who, whom, h.role)
      return who === null ? l.added(whom) : l.addedBy(who, whom)
    case 'member-removed':
      return who === null ? l.removed(whom) : l.removedBy(who, whom)
    case 'switched-off':
      return who === null ? l.switchedOff : l.switchedOffBy(who)
    case 'switched-on':
      return who === null ? l.switchedOn : l.switchedOnBy(who)
    case 'renamed':
      return who === null ? l.renamed(h.from) : l.renamedBy(who, h.from)
    case 'unreachable':
      return l.unreachable
    case 'answering-again':
      return l.answering(howLongWords(h.from, h.to))
    // Our server sends it with its administrator alone.
    case 'worked-on':
      return who === null ? '' : l.workedOn(who)
  }
  // A happening from a newer server: said as nothing rather than wrongly.
  void timeZone
  return ''
}

/** The history, by the person's own day, newest first (the order our server answers). */
export function linesByDay(
  lines: Line[],
  timeZone?: string,
): { day: string; lines: Line[] }[] {
  const days: { day: string; lines: Line[] }[] = []
  for (const one of lines) {
    const day = dayWords(one.at, timeZone)
    const last = days.at(-1)
    if (last?.day === day) last.lines.push(one)
    else days.push({ day, lines: [one] })
  }
  return days
}

/** What the page itself knows needs them: a *Going live* row theirs to do (design §2, source 4). */
export type PageNeed = Need | { kind: 'going-live'; app: AppRef }

/**
 * WHAT STILL NEEDS THEM, BY THE PLATFORM'S STATE (the whole-branch review's I1): an app switched
 * off has nothing live, so its needs are its questions alone. Our server cannot see a switch-off
 * (the watch's stream closes `4401` before `project.archived` reaches it: S1, M4), so it goes on
 * saying the fall, the recovery or the change it last knew; the page, which reads the project in
 * the person's session, keeps only what is still true.
 */
export function needsStillTrue(
  needs: PageNeed[],
  switchedOff: (projectId: string) => boolean,
): PageNeed[] {
  return needs.filter(
    (need) => need.kind === 'question' || !switchedOff(need.app.projectId),
  )
}

const appPath = (app: AppRef, page = '') => `/apps/${encodeURIComponent(app.slug)}${page}`

/**
 * One need, as the band says it, with its button. *Start it again* and *What happened?* open the
 * app's Overview, where their presses are (Task 10); a helper is told who can, and has no button
 * (Review Focus 5). *Give this to your agent* opens the students' address, where F5's *What went
 * wrong* is.
 */
export function needWords(
  need: PageNeed,
  timeZone?: string,
): { says: string; button: { label: string; href?: string } | null } {
  const name = need.app.name
  switch (need.kind) {
    case 'question':
      return {
        says: b.question(name),
        button: {
          label: b.open,
          href: appPath(
            need.app,
            `/conversations/${encodeURIComponent(need.conversationId)}`,
          ),
        },
      }
    case 'down': {
      const said = b.down(name, clockWords(need.from, timeZone))
      return need.owner
        ? {
            says: `${said} ${b.downOwner}`,
            button: { label: b.startAgain, href: appPath(need.app) },
          }
        : { says: `${said} ${b.downHelper}`, button: null }
    }
    case 'answering-again':
      return {
        says: b.answering(
          name,
          clockWords(need.to, timeZone),
          howLongWords(need.from, need.to),
        ),
        button: { label: b.whatHappened, href: appPath(need.app) },
      }
    case 'change-failed':
      return {
        says: b.changeFailed(name),
        button: { label: b.giveIt, href: appPath(need.app, '/preview?tab=students') },
      }
    case 'going-live':
      return {
        says: b.goingLive(name),
        button: { label: b.goingLiveButton, href: appPath(need.app, '/going-live') },
      }
    // F6b Task 12: to everyone on it. An owner answers it on *Agents*; a helper is told who can,
    // with no button (m109, Rich's words), as `down` tells them.
    case 'agent-asks':
      return need.owner
        ? {
            says: b.agent(name, need.whose),
            button: { label: b.agents, href: appPath(need.app, '/agents') },
          }
        : { says: b.agentHelper(name), button: null }
  }
}
