import type { Conversation, Happening } from '../api/progress.js'
import type { EmailKind, KeptApp, KeptMember, Outgoing } from '../store/keeping.js'
import { actorOf, type WaitingQuestion } from './happenings.js'
import { mailWords as w } from './words.js'

/**
 * F6 TASK 5: WHO IS EMAILED WHAT (D3), pure. One email per happening and recipient, never a
 * digest: its key is `<projectId>:<what>`, so a replay, a reconnect or a restart names the same
 * email (`deliver` claims it once). Every owner, by the kept members, but never the person who did
 * it (Decision 13), nor the member it is about; and only an app that went live is told a change
 * didn't go live (Decision 15).
 */
type Context = {
  app: KeptApp
  members: KeptMember[]
  origin: string
  at: string
  id: string
}

/** An email's words, before it has a recipient: what it says, and the one page it links to. */
type Said = { kind: EmailKind; what: string; subject: string; body: string; page: string }

const nameOf = (members: KeptMember[], userId: string | null) =>
  userId === null
    ? null
    : (members.find((member) => member.userId === userId)?.displayName ?? null)

function said(happening: Happening, { app, members, at, id }: Context): Said | null {
  const name = app.name
  const overview = ''
  const goingLive = '/going-live'
  switch (happening.kind) {
    case 'change-failed':
      if (app.launchedAt === null) return null
      return {
        kind: 'trouble',
        what: id,
        subject: w.changeFailed.subject(name),
        body: w.changeFailed.body(name, at),
        page: overview,
      }
    case 'unreachable':
      return {
        kind: 'trouble',
        what: `outage:${happening.from}`,
        subject: w.unreachable.subject(name),
        body: w.unreachable.body(name, happening.from),
        page: overview,
      }
    case 'answering-again':
      return {
        kind: 'trouble',
        what: `answering:${happening.from}`,
        subject: w.answering.subject(name),
        body: w.answering.body(name, happening.from, happening.to),
        page: overview,
      }
    case 'signed-off':
      return { kind: 'over', what: id, ...words(w.signedOff, name), page: goingLive }
    case 'turned-down':
      return { kind: 'over', what: id, ...words(w.turnedDown, name), page: goingLive }
    case 'dry-run':
      return {
        kind: 'over',
        what: id,
        ...words(happening.passed ? w.dryRun.worked : w.dryRun.failed, name),
        page: goingLive,
      }
    case 'answered': {
      const office = happening.by === 'identity' ? w.identity : w.privacy
      return {
        kind: 'over',
        what: id,
        subject: office.subject(name),
        body: office.body(name, happening.state),
        page: goingLive,
      }
    }
    case 'member-added': {
      const who = nameOf(members, happening.by)
      const whom = nameOf(members, happening.userId)
      const { role, previousRole } = happening
      return {
        kind: 'people',
        what: id,
        ...(previousRole === null
          ? {
              subject: w.added.subject(name, whom),
              body: w.added.body(name, who, whom, role),
            }
          : {
              subject: w.roleChanged.subject(name, whom, role),
              body: w.roleChanged.body(name, who, whom, role, previousRole),
            }),
        page: overview,
      }
    }
    case 'member-removed': {
      const who = nameOf(members, happening.by)
      const whom = nameOf(members, happening.userId)
      return {
        kind: 'people',
        what: id,
        subject: w.removed.subject(name, whom),
        body: w.removed.body(name, who, whom),
        page: overview,
      }
    }
    default:
      return null
  }
}

const words = (
  one: { subject: (app: string) => string; body: (app: string) => string },
  app: string,
) => ({
  subject: one.subject(app),
  body: one.body(app),
})

/** Who is not told: the person who did it, and the member it is about. */
function untold(happening: Happening): Set<string> {
  const them = new Set<string>()
  const actor = actorOf(happening)
  if (actor !== null) them.add(actor)
  if (happening.kind === 'member-added' || happening.kind === 'member-removed')
    them.add(happening.userId)
  return them
}

const appPage = (origin: string, app: KeptApp, page: string) =>
  `${origin}/apps/${encodeURIComponent(app.slug)}${page}`

const textOf = (body: string, link: string, lastLine: string) =>
  `${body}\n\n${link}\n\n${lastLine}`

/** Who is emailed what for one happening (D3; Decisions 13 and 15). */
export function emailsFor(happening: Happening, context: Context): Outgoing[] {
  const one = said(happening, context)
  if (one === null) return []
  const { app, members, origin } = context
  const skip = untold(happening)
  const text = textOf(
    one.body,
    appPage(origin, app, one.page),
    w.lastLine.owner(app.name),
  )
  return members
    .filter(
      (member) =>
        member.role === 'owner' && member.email !== '' && !skip.has(member.userId),
    )
    .map((member) => ({
      key: {
        kind: one.kind,
        happening: `${app.projectId}:${one.what}`,
        recipient: member.email,
      },
      subject: one.subject,
      text,
    }))
}

/**
 * F6b TASK 12 (Decision 14): THEIR AGENT'S QUESTION, once to each owner (who may answer it: FE-50),
 * as work waiting (D3's four kinds stand), keyed by the question. Never to a helper, and not to its
 * maker as such (the platform's `Token.mintedBy` names them, FE-49, but the watch token cannot read
 * `listTokens`). Its name is ours when our page made it.
 */
export function questionEmails(
  question: WaitingQuestion,
  context: {
    app: KeptApp
    members: KeptMember[]
    origin: string
    tokenName: string | null
  },
): Outgoing[] {
  const { app, members, origin, tokenName } = context
  const subject = w.agentAsks.subject(app.name)
  const text = textOf(
    w.agentAsks.body(app.name, tokenName, question.action, question.expiresAt),
    appPage(origin, app, '/agents'),
    w.lastLine.owner(app.name),
  )
  return members
    .filter((member) => member.role === 'owner' && member.email !== '')
    .map((member) => ({
      key: {
        kind: 'waiting',
        happening: `${app.projectId}:agent-asks:${question.pendingActionId}`,
        recipient: member.email,
      },
      subject,
      text,
    }))
}

/** Decision 14: the person whose work it is, keyed as the keeper asks (by run, or by wait). */
export function waitingEmail(
  why: 'finished' | 'needs-you' | 'a-day',
  context: {
    app: KeptApp
    conversation: Conversation
    to: string
    origin: string
    key: string
  },
): Outgoing {
  const { app, conversation, to, origin, key } = context
  const name = app.name
  const [subject, body] =
    why === 'finished'
      ? [w.finished.subject(name), w.finished.body(name, conversation.title)]
      : why === 'needs-you'
        ? [w.needsYou.subject(name), w.needsYou.body(name, conversation.title)]
        : [
            w.aDay.subject(name),
            w.aDay.body(name, conversation.title, conversation.updatedAt),
          ]
  const link = appPage(
    origin,
    app,
    `/conversations/${encodeURIComponent(conversation.id)}`,
  )
  return {
    key: { kind: 'waiting', happening: key, recipient: to },
    subject,
    text: textOf(body, link, w.lastLine.asked(name)),
  }
}
