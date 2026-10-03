/**
 * EVERY SENTENCE OF EVERY EMAIL (F6 D3), in one file, as `packages/web/src/words.ts` holds the
 * page's. Plain text, two to four sentences, *we* everywhere, and no machinery (C3: the emails'
 * test reads the page's own list). The subjects are the ones Rich was shown with the plan.
 *
 * Times are Vancouver's, as the platform counts its waits: an email is read away from the page,
 * and the person's own time zone is the page's to know.
 */

const VANCOUVER = 'America/Vancouver'

/** "10:03am", Vancouver's clock. */
export function clockOf(at: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VANCOUVER,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(at))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('hour')}:${part('minute')}${part('dayPeriod').toLowerCase()}`
}

/** "30 September", Vancouver's day. */
export function dayOf(at: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VANCOUVER,
    day: 'numeric',
    month: 'long',
  }).format(new Date(at))
}

const counted = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

/** "4 minutes", "1 hour and 1 minute": how long, from one moment to another, never under a minute. */
export function howLong(from: string, to: string): string {
  const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return counted(minutes, 'minute')
  return rest === 0
    ? counted(hours, 'hour')
    : `${counted(hours, 'hour')} and ${counted(rest, 'minute')}`
}

const roleWords = { owner: 'an owner', collaborator: 'a helper' } as const

/** The four a token is refused and asks a person about (D24), with the app in each; ours. */
const ACTIONS: Record<string, (app: string) => string> = {
  'members:manage': (app) => `change who's on ${app}`,
  'release:promote': (app) => `let your students have a new version of ${app}`,
  'secret:read': (app) => `read one of the secrets ${app} keeps`,
  'quota:set': (app) => `change how much ${app} may use`,
}

/** An action in words; one the platform adds later, generically (never its name: C3). */
export function actionWords(action: string, app: string): string {
  return Object.hasOwn(ACTIONS, action)
    ? ACTIONS[action]!(app)
    : `do something on ${app} that an owner must allow`
}

export const mailWords = {
  lastLine: {
    owner: (app: string) => `You're getting this because you own ${app} on Manifest.`,
    asked: (app: string) => `You're getting this because you asked us to work on ${app}.`,
  },
  someone: 'Someone',
  changeFailed: {
    subject: (app: string) => `${app}: a change didn't go live`,
    body: (app: string, at: string) =>
      `A change to ${app} didn't go live, at ${clockOf(at)} on ${dayOf(at)}. Nobody has lost anything: your students still have the version from before. You can give it to your agent from its page:`,
  },
  unreachable: {
    subject: (app: string) => `${app}: your students can't reach it`,
    body: (app: string, from: string) =>
      `Your students can't reach ${app}, since ${clockOf(from)} on ${dayOf(from)}. We can see that, not why. Starting it again usually fixes it, and you can do that from its page:`,
  },
  answering: {
    subject: (app: string) => `${app} is answering again`,
    body: (app: string, from: string, to: string) =>
      `${app} is answering again, since ${clockOf(to)} on ${dayOf(to)}. It was down for ${howLong(from, to)}. What happened is on its page:`,
  },
  signedOff: {
    subject: (app: string) => `${app}: signed off`,
    body: (app: string) =>
      `A Manifest administrator signed ${app} off. What comes next is on Going live:`,
  },
  turnedDown: {
    subject: (app: string) => `${app}: not signed off`,
    body: (app: string) =>
      `A Manifest administrator didn't sign ${app} off. Going live says why, and what you can do next:`,
  },
  dryRun: {
    worked: {
      subject: (app: string) => `${app}: the dry run worked`,
      body: (app: string) =>
        `The dry run of ${app} signed someone in, as your students will be. What comes next is on Going live:`,
    },
    failed: {
      subject: (app: string) => `${app}: the dry run didn't sign anyone in`,
      body: (app: string) =>
        `The dry run of ${app} didn't sign anyone in. Going live says what we saw, and what to fix:`,
    },
  },
  identity: {
    subject: (app: string) => `${app}: UBC's identity team answered`,
    body: (app: string, state: string) =>
      `${
        state === 'active'
          ? `UBC's identity team registered ${app}.`
          : state === 'change_requested'
            ? `UBC's identity team asked for a change to the request for ${app}.`
            : `UBC's identity team answered about ${app}.`
      } Going live has the rest:`,
  },
  privacy: {
    subject: (app: string) => `${app}: UBC's Privacy Office answered`,
    body: (app: string, state: string) =>
      `${
        state === 'approved'
          ? `UBC's Privacy Office approved the privacy assessment for ${app}.`
          : `UBC's Privacy Office answered about the privacy assessment for ${app}.`
      } Going live has the rest:`,
  },
  added: {
    subject: (app: string, whom: string | null) =>
      `${app}: ${whom ?? 'someone'} was added`,
    body: (
      app: string,
      who: string | null,
      whom: string | null,
      role: 'owner' | 'collaborator',
    ) =>
      // Neither named (Rich, C): what happened, never "Someone added someone".
      `${
        who === null && whom === null
          ? `Someone was added to ${app}`
          : `${who ?? 'Someone'} added ${whom ?? 'someone'} to ${app}`
      }, as ${roleWords[role]}. Who's on it is on its page:`,
  },
  roleChanged: {
    subject: (app: string, whom: string | null, role: 'owner' | 'collaborator') =>
      `${app}: ${whom ?? 'someone'} is now ${roleWords[role]}`,
    body: (
      app: string,
      who: string | null,
      whom: string | null,
      role: 'owner' | 'collaborator',
      before: 'owner' | 'collaborator',
    ) =>
      `${
        who === null && whom === null
          ? `Someone is now ${roleWords[role]} of ${app}.`
          : `${who ?? 'Someone'} made ${whom ?? 'someone'} ${roleWords[role]} of ${app}.`
      } They were ${roleWords[before]}. Who's on it is on its page:`,
  },
  removed: {
    subject: (app: string, whom: string | null) =>
      `${app}: ${whom ?? 'someone'} was taken off it`,
    body: (app: string, who: string | null, whom: string | null) =>
      `${
        who === null && whom === null
          ? `Someone was taken off ${app}.`
          : `${who ?? 'Someone'} took ${whom ?? 'someone'} off ${app}.`
      } Who's on it is on its page:`,
  },
  finished: {
    subject: (app: string) => `${app}: we've finished`,
    body: (app: string, title: string) =>
      `We've finished "${title}" on ${app}. You can try it on your draft address, from the conversation:`,
  },
  needsYou: {
    subject: (app: string) => `${app}: we need you`,
    body: (app: string, title: string) =>
      `We stopped working on "${title}" for ${app}, because we need you. What we're asking is in the conversation:`,
  },
  /**
   * F6b TASK 12 (Decision 14; the plan's *Words proposed*): their agent's question, to each owner.
   * The action is said with the app in it (never "<app>'s"), so the body does not name it twice.
   */
  agentAsks: {
    subject: (app: string) => `${app}: your agent is asking something`,
    body: (app: string, tokenName: string | null, action: string, expiresAt: string) =>
      `${tokenName === null ? 'An agent' : `Your agent '${tokenName}'`} asked to ${actionWords(action, app)}. It stops waiting at ${clockOf(expiresAt)} on ${dayOf(expiresAt)}. Answer it on its page:`,
  },
  aDay: {
    subject: (app: string) => `${app}: still waiting for you`,
    body: (app: string, title: string, since: string) =>
      `We've been waiting for you on "${title}" for ${app} since ${dayOf(since)}. We carry on as soon as you answer, in the conversation:`,
  },
}
