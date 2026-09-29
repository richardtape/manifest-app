import type { BuildStep } from '../api/progress.js'
import { leadMoves } from '../build/moves.js'
import type { Change } from '../platform/source.js'
import { defineAgent } from '../runtime/agent.js'
import { movesOf } from '../runtime/tool.js'

/**
 * THE LEAD (F3): builds the app from the agreed plan, one move a turn (Decisions 1–3), on the
 * blueprint's fixed stack. What it sees is rebuilt before every move and kept to VIEW_CAP: never
 * the conversation's history, and never a token or a key.
 */
export interface LeadView {
  /** docs/plan.md, as committed. */
  plan: string
  /** The blueprint's knowledge pack, whole. */
  pack: string
  paths: string[]
  /** The files it last read, NEWEST FIRST: they fill what is left of the cap. */
  files: { path: string; content: string }[]
  step: BuildStep
  tries: Record<'build' | 'draft' | 'conflict', number>
  last: { kind: string; report: string } | null
  /** Unread words of the person's, verbatim. */
  messages: string[]
  /** On Try a different way: the three that failed. */
  failures: string[]
  /** The sign-in specialist's proposal, until each of its paths is committed. */
  proposal: { changes: Change[]; summary: string } | null
}

export type LeadMove =
  | { kind: 'read'; paths: string[] }
  | { kind: 'commit'; message: string; changes: Change[]; line: string; account: string }
  | {
      kind: 'ask_cwl'
      brief: {
        whoGetsIn: string
        youSee: string
        studentsSee: string
        namedEmails: string[]
      }
    }
  | { kind: 'ask_person'; ask: string; default: string | null; secret: string | null }
  | { kind: 'done'; line: string; cannot: string | null }

/**
 * DECISION 3's CAP: everything the lead is sent, instructions included, whatever model is
 * listed. F3 M1: the fallback's context is 16k tokens and cuts a longer prompt without a word;
 * at 3.7 characters a token, 48,000 is about 13,000, with room to answer (Rich: carry on).
 */
export const VIEW_CAP = 48_000
/** A move's report, cut: the specialist's proposal must reach the lead whole enough to commit. */
const LAST_CAP = 12_000
/** The specialist's proposal, whole: its four sign-in files come to about 22,000 at most (M6). */
const PROPOSAL_CAP = 24_000

export const LEAD_PROMPT = [
  'You are the lead builder of a small web app a university instructor described. We build it together with them, and you always speak as "we".',
  "You write the app from the plan we agreed, on its blueprint. The stack is fixed: never add a package or a dependency, and never change package.json's dependencies or package-lock.json. If what they asked for needs a package the app does not have, say so plainly in your line, and build the rest.",
  'Never write a Dockerfile or an .npmrc, and never a build block in manifest.yaml: the blueprint owns how the app is built.',
  "The app is JavaScript, as ES modules, and server.js is its entry. A relative import names its file exactly, with its extension: './routes/posts.js'. Never put a secret in a file or a message.",
  'Each turn you answer with exactly one move:',
  ...leadMoves.map((move) => `- ${move.describe}`),
  "Write whole files: each write is the file's complete new content, on the files as they are now. Commit small steps that hold together.",
  'In "line" and "account", describe what the person will see, in their words, never code: no file names, no paths, no technical words. "line" is what we are doing now ("Writing the page students post on."); "account" is what changed ("Two pages, and the rule about who sees what"). Never say "it works".',
  'Ask the person only what only they can answer, and give a default whenever there is a sensible one, so the work goes on while they decide.',
  'For who may sign in and who is staff, ask the sign-in specialist (ask_cwl), then commit what it proposes. Its proposal stays in your view until you commit it: never ask it again for the same thing.',
  'When the pages are written, answer done.',
].join('\n')

const STEPS: Record<BuildStep, string> = {
  pages: 'Writing the pages',
  holds: 'Checking it holds together',
  build: 'Building it',
  draft: 'Putting it on the draft address',
  answers: 'Checking it answers',
}

/** A read's report opens with one line; its files are below, in the view's own section. */
function lastMove(last: LeadView['last']): string {
  if (last === null) return 'Your last move: none yet.'
  const report =
    last.kind === 'read'
      ? `${last.report.split('\n')[0]} The files are below.`
      : last.report.length > LAST_CAP
        ? `${last.report.slice(0, LAST_CAP)}\n…(cut)`
        : last.report
  return `Your last move (${last.kind}): ${report}`
}

/**
 * THE SPECIALIST'S PROPOSAL, WHOLE, IN ITS OWN SECTION: before the files, so they give way first;
 * one line when it cannot fit beside the plan and the pack.
 */
function proposalOf(proposal: LeadView['proposal']): string[] {
  if (proposal === null) return []
  const whole = [
    '',
    "The sign-in specialist's proposal, not yet committed (it stays here until you commit it):",
    proposal.summary,
    ...proposal.changes.map((c) =>
      c.op === 'write' ? `--- ${c.path}\n${c.content}` : `--- delete ${c.path}`,
    ),
  ]
  return whole.join('\n').length <= PROPOSAL_CAP
    ? whole
    : [
        '',
        "The sign-in specialist's proposal is too large to show beside the rest: ask it for fewer changes.",
      ]
}

function brief(view: LeadView): { role: 'user'; content: string }[] {
  const head = [
    'The plan we agreed (docs/plan.md, committed):',
    view.plan,
    '',
    'How an app on this blueprint is written (its knowledge pack):',
    view.pack,
    '',
    "The app's files:",
    view.paths.join('\n'),
    '',
    `The step: ${STEPS[view.step]}. Tries so far: building ${view.tries.build}, the draft address ${view.tries.draft}, someone else's changes ${view.tries.conflict}.`,
    ...(view.failures.length > 0
      ? [
          'We are trying a different way. What failed before:',
          ...view.failures.map((f) => `- ${f}`),
        ]
      : []),
    ...(view.messages.length > 0
      ? [
          'Messages from the person you have not read yet:',
          ...view.messages.map((m) => `- "${m}"`),
        ]
      : []),
    lastMove(view.last),
    ...proposalOf(view.proposal),
    '',
    'Files you have read, newest first:',
  ].join('\n')
  let left = VIEW_CAP - LEAD_PROMPT.length - head.length - 1
  const shown: string[] = []
  for (const file of view.files) {
    const whole = `--- ${file.path}\n${file.content}`
    const cut = `${file.path}: too large to show beside the rest: read it alone`
    const chosen = whole.length + 1 <= left ? whole : cut.length + 1 <= left ? cut : null
    if (chosen === null) break
    shown.push(chosen)
    left -= chosen.length + 1
  }
  return [{ role: 'user', content: `${head}\n${shown.join('\n')}` }]
}

export const lead = defineAgent({
  name: 'lead',
  instructions: LEAD_PROMPT,
  brief,
  answer: movesOf(leadMoves),
})
