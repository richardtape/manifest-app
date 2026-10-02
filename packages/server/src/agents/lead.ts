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
  /**
   * Everything the lead is sent, for the model it is sent to: CAPABLE_VIEW_CAP for the capable
   * model, VIEW_CAP for any other (Rich, sitting 6).
   */
  cap: number
  step: BuildStep
  tries: Record<'build' | 'draft' | 'conflict', number>
  last: { kind: string; report: string } | null
  /** Unread words of the person's, verbatim. */
  messages: string[]
  /** On Try a different way: the three that failed. */
  failures: string[]
  /** The sign-in specialist's proposal, until each of its paths is committed. */
  proposal: { changes: Change[]; summary: string } | null
  /** Every path of the specialist's last proposal is committed, or already so. */
  settled: boolean
  /** This round's questions, and what we went on with: null while it waits for their answer. */
  asked: { ask: string; wentWith: string | null }[]
  /** F4: the agreed change: their words, and the plan's parts that changed, as they now read. */
  change: { asked: string[]; parts: string[] } | null
  /**
   * F4: a fix of ours, when the app did not start on the trying-out address, or (F5 Decision 13)
   * on the live address: what the platform recorded there, or none, and why (a confidential app's
   * record is the person's alone).
   */
  fix: {
    environment: 'staging' | 'production'
    incident: {
      exitReason: string
      failedCheck: string
      logTail: string
      prompt: string
      diffSinceHealthy: string
    } | null
    unread: 'confidential' | 'missing' | null
    /**
     * F5 Task 7: a dry run on the live setup that signed nobody in, as the page read it: what the
     * app answered at its sign-in address (null when no sign-in completed), and the details asked
     * for and carried. No incident: it left none. Null for an incident's fix.
     */
    dryRun: {
      signInStatus: number | null
      attributesReleased: string[]
      attributesAsked: string[]
    } | null
    /**
     * F6 Decision 9: the live address stopped answering between these two moments, by our own
     * watch. No incident: the platform did not see it (FE-4). Null for any other fix.
     */
    outage: { from: string; to: string } | null
  } | null
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
  | { kind: 'done'; line: string; cannot: string | null; account: string }

/**
 * DECISION 3's CAP: everything the lead is sent, instructions included, on any model but the
 * capable one. F3 M1: the fallback's context was 16k tokens and cut a longer prompt without a word;
 * at 3.7 characters a token, 48,000 is about 13,000, with room to answer (Rich: carry on).
 */
export const VIEW_CAP = 48_000
/**
 * THE CAPABLE MODEL'S CAP (Rich, F5 sitting 6): the real walk's first round read in a loop to the
 * move limit, its app's files (~65,000 characters) never fitting beside the plan and the pack at
 * once. ~32,000 tokens: F3 M1 measured the capable model answering 108,000 in 16 s. Its fallback,
 * when the provider fails, gets a cut prompt and may stop the round (Rich accepted).
 */
export const CAPABLE_VIEW_CAP = 120_000
/** A move's report, cut: the specialist's proposal must reach the lead whole enough to commit. */
const LAST_CAP = 12_000
/** The specialist's proposal, whole: its four sign-in files come to about 22,000 at most (M6). */
const PROPOSAL_CAP = 24_000
/** A change's words and parts, and each thing a fix's record says: whole enough, never the view. */
const CHANGE_CAP = 4_000
const FIX_FIELD_CAP = 2_000

/**
 * F4 DECISION 9: WHAT A ROUND ON AN APP THAT ALREADY WORKS IS TOLD, beside the change or the fix.
 * M5 measured it on the capable model: the lead read the files it would change first, 5 of 5.
 */
export const CHANGE_PARAGRAPH = [
  'You are changing an app that already works, and people use it.',
  'Read each file before you rewrite it, and write it whole on what is there.',
  'Change only what the agreed change needs: keep everything else as it is.',
].join(' ')

export const LEAD_PROMPT = [
  'You are the lead builder of a small web app a university instructor described. We build it together with them, and you always speak as "we".',
  "You write the app from the plan we agreed, on its blueprint. The stack is fixed: never add a package or a dependency, and never change package.json's dependencies or package-lock.json. If what they asked for needs a package the app does not have, say so plainly in your line, and build the rest.",
  'Never write a Dockerfile or an .npmrc, and never a build block in manifest.yaml: the blueprint owns how the app is built.',
  "The app is JavaScript, as ES modules, and server.js is its entry. A relative import names its file exactly, with its extension: './routes/posts.js'. Never put a secret in a file or a message.",
  'Read a file before you rewrite it: a write to a file already in the app that you have not read as it is now is sent back.',
  'An app whose data is confidential asks only default-chat-onprem when it uses AI itself (ai.models in manifest.yaml): the platform refuses any other model for it.',
  'Each turn you answer with exactly one move:',
  ...leadMoves.map((move) => `- ${move.describe}`),
  "Write whole files: each write is the file's complete new content, on the files as they are now. Commit small steps that hold together.",
  'In "line" and "account", describe what the person will see, in their words, never code: no file names, no paths, no technical words. "line" is what we are doing now, one short sentence, under 100 characters ("Writing the page students post on."); "account" is what changed ("Two pages, and the rule about who sees what"). Never say "it works".',
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

const cut = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max)}\n…(cut)`

/** F4: the agreed change, or the fix, and the paragraph for an app that already works. */
function pieceOf(view: LeadView): string[] {
  if (view.change !== null)
    return [
      '',
      'The change we agreed with them, in their words:',
      ...view.change.asked.map((words) => `- "${cut(words, CHANGE_CAP)}"`),
      'The parts of the plan it changed, as they now read:',
      ...view.change.parts.map((part) => `- ${cut(part, CHANGE_CAP)}`),
      CHANGE_PARAGRAPH,
    ]
  if (view.fix?.dryRun != null) {
    const d = view.fix.dryRun
    const listed = (details: string[]) =>
      details.length === 0 ? 'none' : details.map((a) => cut(a, FIX_FIELD_CAP)).join(', ')
    const missing = d.attributesAsked.filter((a) => !d.attributesReleased.includes(a))
    return [
      '',
      'The dry run on the live setup did not sign anyone in, and we are fixing that. It put the app up on its live address with nobody watching, tried one CWL sign-in, and took it down again.',
      d.signInStatus === null
        ? 'No sign-in was completed: no signed-in person reached the app at its sign-in address. It may not have started, or its sign-in may have failed.'
        : `What the app answered at its sign-in address: ${d.signInStatus}`,
      `The details its registration asks for: ${listed(d.attributesAsked)}`,
      `The details the sign-in carried: ${listed(d.attributesReleased)}`,
      ...(missing.length === 0
        ? []
        : [`Asked for and never carried: ${listed(missing)}`]),
      // The review's I-A: with no sign-in at all, never assume the sign-in is at fault.
      d.signInStatus === null
        ? 'Look for what would stop it starting or signing someone in, and change only that.'
        : "Look for what in the app's sign-in would cause that, and change only that.",
      CHANGE_PARAGRAPH,
    ]
  }
  if (view.fix?.outage != null) {
    const { from, to } = view.fix.outage
    return [
      '',
      `The app stopped answering on its live address between ${from} and ${to} (UTC), and we are looking for why. It started answering again by itself, or when it was started again.`,
      'Manifest did not notice it stop, so there is no record of why, and nothing it wrote while it ran can be read.',
      'Look in the code for what could stop it answering or hang it: an error nothing catches, a request that never ends, memory or connections that grow without limit. Change only what explains it. If nothing in the code does, change nothing, and say so plainly in your account.',
      CHANGE_PARAGRAPH,
    ]
  }
  if (view.fix !== null) {
    const incident = view.fix.incident
    const where = view.fix.environment === 'production' ? 'live' : 'trying-out'
    return [
      '',
      `The app did not start on the ${where} address, and we are fixing that.`,
      ...(incident !== null
        ? [
            `How it ended: ${cut(incident.exitReason, FIX_FIELD_CAP)}`,
            `The check it failed: ${cut(incident.failedCheck, FIX_FIELD_CAP)}`,
            `Its last lines:\n${cut(incident.logTail, FIX_FIELD_CAP)}`,
            `What the platform wrote for an agent to work from: ${cut(incident.prompt, FIX_FIELD_CAP)}`,
            `What changed since it last started there: ${cut(incident.diffSinceHealthy, FIX_FIELD_CAP)}`,
          ]
        : view.fix.unread === 'confidential'
          ? [
              "We cannot read why there: the platform keeps a confidential app's record of it to the person. Look for what would stop it starting, and change only that.",
            ]
          : [
              'We cannot read why there: its record was not found. Look for what would stop it starting, and change only that.',
            ]),
      CHANGE_PARAGRAPH,
    ]
  }
  return []
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
    ...pieceOf(view),
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
    ...(view.settled && view.proposal === null
      ? [
          '',
          "The sign-in specialist's proposal is committed. Ask it again only if who gets in or who is staff must change.",
        ]
      : []),
    ...(view.asked.length > 0
      ? [
          '',
          'What you have asked this round, and what we went on with (never ask these again: an answer arrives as their message):',
          ...view.asked.map((q) =>
            q.wentWith === null
              ? `- ${q.ask} (waiting for their answer)`
              : `- ${q.ask} We went on with: ${q.wentWith}`,
          ),
        ]
      : []),
    '',
    'Files you have read, newest first:',
  ].join('\n')
  // Room for the line that names each file left out (sitting 6: never dropped without a word, and
  // never "read it alone", which sent the lead round its files in a loop).
  const leftOutRoom = 200 + view.files.reduce((n, file) => n + file.path.length + 2, 0)
  let left = view.cap - LEAD_PROMPT.length - head.length - 1 - leftOutRoom
  const shown: string[] = []
  const notShown: string[] = []
  for (const file of view.files) {
    const whole = `--- ${file.path}\n${file.content}`
    if (whole.length + 1 <= left) {
      shown.push(whole)
      left -= whole.length + 1
    } else notShown.push(file.path)
  }
  const leftOut =
    notShown.length === 0
      ? []
      : [
          `Read, and not shown for want of room: ${notShown.join(', ')}. The files above are the newest you read; one you read again comes to the front, and the oldest give way.`,
        ]
  return [{ role: 'user', content: [head, ...shown, ...leftOut].join('\n') }]
}

export const lead = defineAgent({
  name: 'lead',
  instructions: LEAD_PROMPT,
  brief,
  answer: movesOf(leadMoves),
})
