import { z } from 'zod/v4'
import type { CwlBrief } from '../agents/cwl.js'
import { ModelError } from '../model/client.js'
import type { Members } from '../platform/members.js'
import { CommitRefused, PlatformRefusal } from '../platform/refusal.js'
import type { Change, Source } from '../platform/source.js'
import { defineTool, type MoveResult, type ToolDef } from '../runtime/tool.js'
import type { Guards } from './guards.js'

/**
 * THE LEAD'S FIVE MOVES (F3 Decision 2), as runtime tools over the round's context, which the
 * model never sees. Every write is a commit, dry-run first by `source.commit`. Each move is
 * guarded before it runs (Task 6), and a refusal the lead can answer is its next reason.
 */
export interface RoundContext {
  token: string
  projectId: string
  personId: string
  source: Source
  members: Members
  guards: Guards
  /** The commit the next change is made on. */
  base: { get(): string; set(sha: string): void }
  /** The tree's paths, as the round last knew them: for the commit guard. */
  paths(): string[]
  /** `package.json` as the round last knew it: for the commit guard (FE-32). */
  packageJson(): unknown
  /** A commit landed: the round learns what it changed, so `paths()` and `packageJson()` follow. */
  wrote(changes: Change[]): void
  /** The files a read answered, kept for the lead's view, newest first (Decision 3). */
  keep(files: { path: string; content: string }[]): void
  /**
   * Records the question. A default answers at once; none, or a secret, pauses the run. A
   * secret is the name the app reads it by; its value goes to the sandbox alone.
   */
  question(
    ask: string,
    fallback: string | null,
    secret: string | null,
  ): { id: string; answeredWith: string | null }
  /** FE-32: what the plan asked for that needs a piece we cannot install, in the lead's words. */
  cannot(what: string): void
  /** The round's one sentence, from `done` (Rich): What changed. */
  account(sentence: string): void
  askCwl(brief: CwlBrief): Promise<{ changes: Change[]; summary: string }>
  /**
   * The specialist's proposal, kept for the lead's view until it is committed (Task 12's walk: a
   * lead that read a file after asking lost the proposal, and asked again, 15 times).
   */
  propose(proposal: { changes: Change[]; summary: string }): void
  /** A commit refused as leaving every file as it was: those files are already as proposed. */
  unchanged(changes: Change[]): void
  /** Their description, their messages, their answers: whose emails staff may be (Decision 13). */
  theirWords(): string[]
  /**
   * F4 Decision 9: whether the lead knows this file as it is now: read at the current tree,
   * written this round, or the specialist's proposal for it, committed exactly as proposed.
   */
  known(change: Change): boolean
}

/** One change of a commit: a whole file written, or one deleted. */
export const CHANGE = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('write'),
    path: z.string().min(1).max(1024),
    content: z.string(),
  }),
  z.object({ op: z.literal('delete'), path: z.string().min(1).max(1024) }),
])

/** A ceiling that should never bind: strict mode cuts a line at it, mid-word (Task 12's walk). */
const LINE = z.string().min(1).max(200)
const ACCOUNT = z.string().min(1).max(200)
/** A secret's name as the platform takes it (M1). Checked by the guard, never as a schema pattern. */
const SECRET_NAME = /^[A-Z][A-Z0-9_]{0,127}$/

const UNREADABLE = {
  'too-large': 'too large to read',
  'not-text': 'not text',
  'not-a-file': 'not a file',
  'not-found': 'there is no such file',
} as const

/** What the lead can put right itself, each in a few words; anything else is thrown. */
const ANSWERABLE: Record<string, string> = {
  SOURCE_SECRET_DETECTED: 'a value shaped like a secret is in a file or the message',
  SOURCE_PATH_CONFLICT:
    'a path is written twice, or where a directory or another file is',
  SOURCE_PATH_NOT_FOUND: 'a file it deletes is not there',
  SOURCE_PATH_ESCAPE: "a path leaves the app's files",
  SOURCE_NOTHING_TO_COMMIT: 'these changes leave every file as it was',
  REQUEST_INVALID: 'a path or a change is not allowed',
  REQUEST_BODY_TOO_LARGE: 'too much in one commit: split it',
}

/** The files the CWL specialist is shown: the blueprint's sign-in, and where the app mounts it (M6). */
const SIGN_IN_FILES = [
  'auth/ubcshib.js',
  'auth/attributes.js',
  'server.js',
  'manifest.yaml',
]

/** Every staff email a change writes into config/staff.json, for the staff guard. */
function staffEmails(changes: Change[]): string[] {
  const staff = changes.find((c) => c.op === 'write' && c.path === 'config/staff.json')
  if (staff === undefined || staff.op !== 'write') return []
  try {
    const emails = (JSON.parse(staff.content) as { emails?: unknown }).emails
    return Array.isArray(emails) ? emails.map(String) : ['(not a list)']
  } catch {
    return ['(not JSON)']
  }
}

const read = defineTool({
  kind: 'read',
  describe:
    "read { paths }: read up to 20 of the app's files, by their path in the tree. Never guess a path.",
  input: z.object({ paths: z.array(z.string().min(1).max(1024)).min(1).max(20) }),
  async run({ paths }, context: RoundContext) {
    const base = context.base.get()
    const readable: { path: string; content: string }[] = []
    const lines: string[] = []
    for (const path of paths) {
      const file = await context.source.file(context.token, context.projectId, path, base)
      if ('content' in file) readable.push({ path, content: file.content })
      else lines.push(`${path}: ${UNREADABLE[file.unreadable]}`)
    }
    context.keep(readable)
    const heading = `Read ${readable.map((f) => f.path).join(', ') || 'nothing'}.`
    const body = readable.map((f) => `--- ${f.path}\n${f.content}`)
    return { report: [heading, ...lines, ...body].join('\n') }
  },
})

const commit = defineTool({
  kind: 'commit',
  describe:
    'commit { message, changes, line, account }: write or delete files as one commit, on the files as they are now.',
  input: z.object({
    message: z.string().min(1).max(200),
    changes: z.array(CHANGE).min(1).max(40),
    line: LINE,
    account: ACCOUNT,
  }),
  guard: ({ changes, line, account }, context: RoundContext) =>
    context.guards.commit(changes, { paths: context.paths() }, context.packageJson()) ??
    context.guards.unread(changes, { paths: context.paths() }, (change) =>
      context.known(change),
    ) ??
    context.guards.words(line) ??
    context.guards.words(account) ??
    context.guards.staff(staffEmails(changes), context.theirWords()),
  async run({ message, changes }, context: RoundContext): Promise<MoveResult> {
    try {
      const made = await context.source.commit(context.token, context.projectId, {
        baseCommit: context.base.get(),
        message,
        changes,
      })
      context.base.set(made.commitSha)
      context.wrote(changes)
      const changed = made.changed.map((c) => `${c.status} ${c.path}`).join(', ')
      const notes = made.warnings.map(
        (w) => `${w.code} (${w.path})${w.hint ? `: ${w.hint}` : ''}`,
      )
      return {
        report: [
          `Committed ${made.commitSha.slice(0, 7)}: ${changed}.`,
          ...(notes.length > 0
            ? ['The platform notes, which stop nothing:', ...notes]
            : []),
        ].join('\n'),
      }
    } catch (error) {
      if (error instanceof CommitRefused)
        return {
          report: [
            `The platform refused this commit, and nothing was written (${error.code}):`,
            ...error.details.map(
              (d) => `- ${d.path}: ${d.code}${d.hint ? `. ${d.hint}` : ''}`,
            ),
          ].join('\n'),
          refused: error.code,
        }
      if (error instanceof PlatformRefusal && error.code === 'SOURCE_NOTHING_TO_COMMIT')
        context.unchanged(changes)
      if (error instanceof PlatformRefusal && ANSWERABLE[error.code] !== undefined)
        return {
          report: `The platform refused this commit, and nothing was written (${error.code}): ${ANSWERABLE[error.code]}.`,
          refused: error.code,
        }
      // SOURCE_CONFLICT is the round's to count (Decision 7), and anything else its to say.
      throw error
    }
  },
})

const askCwl = defineTool({
  kind: 'ask_cwl',
  describe:
    'ask_cwl { brief }: ask the sign-in specialist to set up who gets in and who is staff; it proposes changes for you to commit.',
  input: z.object({
    brief: z.object({
      whoGetsIn: z.string().min(1).max(500),
      youSee: z.string().min(1).max(500),
      studentsSee: z.string().min(1).max(500),
      namedEmails: z.array(z.string().max(254)).max(20),
    }),
  }),
  guard: ({ brief }, context: RoundContext) =>
    context.guards.staff(brief.namedEmails, context.theirWords()),
  async run({ brief }, context: RoundContext): Promise<MoveResult> {
    const instructor = await context.members.instructor(
      context.token,
      context.projectId,
      context.personId,
    )
    if (instructor === undefined)
      return {
        report:
          "We could not find the instructor among the app's people, so the specialist was not asked.",
        refused: 'INSTRUCTOR_NOT_FOUND',
      }
    const base = context.base.get()
    const files: { path: string; content: string }[] = []
    for (const path of SIGN_IN_FILES) {
      const file = await context.source.file(context.token, context.projectId, path, base)
      if ('content' in file) files.push({ path, content: file.content })
    }
    let proposed: { changes: Change[]; summary: string }
    try {
      proposed = await context.askCwl({
        plan: {
          whoGetsIn: brief.whoGetsIn,
          youSee: brief.youSee,
          studentsSee: brief.studentsSee,
        },
        staff: { instructorPuid: instructor.puid, emails: brief.namedEmails },
        files,
      })
    } catch (error) {
      if (error instanceof ModelError && error.code === 'MODEL_ANSWER_INVALID')
        return {
          report:
            'The sign-in specialist could not propose a change that held. Ask it again, or write it yourself.',
          refused: 'CWL_ANSWER_INVALID',
        }
      if (error instanceof ModelError)
        return {
          report: 'The model could not be asked.',
          stop: { kind: 'refused', error },
        }
      throw error
    }
    context.propose(proposed)
    return {
      report: `The sign-in specialist proposes changes to ${proposed.changes.map((c) => c.path).join(', ')}. They are NOT committed: the proposal is in its own section below, and stays there until you commit it, if it is right.`,
    }
  },
})

const askPerson = defineTool({
  kind: 'ask_person',
  describe:
    'ask_person { ask, default, secret }: ask the person something only they can answer, with a default when there is a sensible one. For a value that must never be shown (a key), secret is the name the app reads it by, in capitals (SIS_KEY), and the default is null; otherwise secret is null.',
  input: z.object({
    ask: z.string().min(1).max(300),
    default: z.string().max(300).nullable(),
    secret: z.string().max(128).nullable(),
  }),
  guard: ({ ask, default: fallback, secret }, context: RoundContext) =>
    context.guards.words(ask) ??
    (fallback === null ? null : context.guards.words(fallback)) ??
    (secret === null || SECRET_NAME.test(secret)
      ? null
      : "a secret's name is capitals, digits and underscores, starting with a capital: SIS_KEY"),
  async run(
    { ask, default: fallback, secret },
    context: RoundContext,
  ): Promise<MoveResult> {
    const question = context.question(ask, fallback, secret)
    if (question.answeredWith === null)
      return {
        report: `We asked: "${ask}", and wait for their answer.`,
        stop: { kind: 'paused', questionId: question.id },
      }
    return {
      report: `We asked: "${ask}", and went on with: "${question.answeredWith}". They can change it.`,
    }
  },
})

const done = defineTool({
  kind: 'done',
  describe:
    'done { line, cannot, account }: the pages are written. account is what changed this round, as one sentence the person reads ("Word counts appear as students write, and beside each response."). cannot is what they asked for that needs a piece we cannot install, in their words ("the formatted text box"), or null.',
  input: z.object({
    line: LINE,
    cannot: z.string().min(1).max(120).nullable(),
    account: ACCOUNT,
  }),
  guard: ({ line, cannot, account }, context: RoundContext) =>
    context.guards.words(line) ??
    context.guards.words(account) ??
    (cannot === null ? null : context.guards.words(cannot)),
  async run({ line, cannot, account }, context: RoundContext): Promise<MoveResult> {
    if (cannot !== null) context.cannot(cannot)
    context.account(account.trim())
    return { report: 'Done.', stop: { kind: 'done', line } }
  },
})

export const leadMoves = [read, commit, askCwl, askPerson, done] as unknown as ToolDef<
  RoundContext,
  never
>[]
