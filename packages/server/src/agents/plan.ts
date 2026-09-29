import { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * THE PLAN AGENT (walk-through moment 5; F2 Task 9): what we would build, as a description
 * of the finished thing, in five rows; what we assumed; and at most two things only the
 * person knows. It runs on the person's agent session, and its answer is structured, never
 * free text (Decision 5).
 */
export const ROWS = ['studentsSee', 'youSee', 'itKeeps', 'whoGetsIn', 'ai'] as const
export type Row = (typeof ROWS)[number]

const row = (max: number) => z.string().min(1).max(max)

/** What the model is asked for. Every field is required, for gateways that hold a schema strictly. */
export const PlanAnswer = z.object({
  studentsSee: row(400),
  youSee: row(400),
  itKeeps: row(400),
  whoGetsIn: row(400),
  ai: row(300),
  assumed: z.array(z.string().min(1).max(160)).max(3),
  onlyYouKnow: z
    .array(z.object({ id: z.string().min(1).max(40), ask: z.string().min(1).max(200) }))
    .max(2),
})

/** The plan as it is kept and shown: with the rows a correction changed, which the screen marks. */
export const Plan = PlanAnswer.extend({ changed: z.array(z.enum(ROWS)) })
export type Plan = z.infer<typeof Plan>

/**
 * WHO GETS IN, HONESTLY (FE-20): there is no sign-in limited to a class, and a plan must
 * never promise one. The walk-through's own sentence, less what only its example knows.
 */
export const HONEST_WHO_GETS_IN =
  "Anyone with a CWL can sign in. We can't limit it to your class yet."

export const PLAN_PROMPT = [
  'You write the plan for a small web app a university instructor has described. You are one of a team, and you always speak as "we".',
  'Describe the finished thing, not how to build it, in five short parts: what their students see; what they, the instructor, see; what it keeps; who gets in; and AI.',
  'Who gets in: anyone with a CWL can sign in. We cannot limit it to one class, course or section yet, so never promise that; say what each person can see instead.',
  'AI: say whether it asks an AI model anything, and only if they asked for it.',
  'In "assumed", say at most three things we assumed, one short line each, including an answer for each question they skipped.',
  'In "onlyYouKnow", ask at most two questions only the instructor can answer, each one short sentence ending in a question mark. Ask nothing we could decide ourselves.',
  'You are also given the guide to how apps like this are built, and the files it starts with. They are for you to know what we build on: never name a file, a tool or any code.',
  'When they correct the plan, change only what their correction asks for, and keep every other part word for word.',
  'Never use technical words: say what people see and do.',
].join('\n')

/** A sign-in promised to one class, course or section: FE-20 says we cannot give it. */
const CLASS_ONLY = [
  /\b(only|just)\b[^.]{0,40}\b(your|the|their)\s+(own\s+)?(class|course|section|students|seminar|group)\b/i,
  /\b(enrolled|enrolment|enrollment|class list|roster)\b/i,
  /\brestrict\w*\b[^.]{0,40}\b(class|course|section)\b/i,
]

const plainly = (text: string) => text.replace(/\s+/g, ' ').trim()

/** FE-20: a sign-in promised to one class becomes the honest sentence. */
export function honestWhoGetsIn(text: string): string {
  return CLASS_ONLY.some((promise) => promise.test(text)) ? HONEST_WHO_GETS_IN : text
}

/** The rows whose words differ from `before`'s: a mark is a promise to the person. */
export function changedRows(
  plan: Record<Row, string>,
  before: Record<Row, string>,
): Row[] {
  return ROWS.filter((key) => plainly(plan[key]) !== plainly(before[key]))
}

/** Rules about form, never meaning (agents.md rule 3): a question is a question, a row has words. */
export const checked: Check<z.infer<typeof PlanAnswer>> = (plan) => {
  for (const key of ROWS) if (plainly(plan[key]) === '') return `an empty row: ${key}`
  const ids = new Set(plan.onlyYouKnow.map((q) => q.id))
  if (ids.size !== plan.onlyYouKnow.length) return 'two questions share an id'
  for (const { ask } of plan.onlyYouKnow)
    if (!ask.trim().endsWith('?') || ask.trim().split(/\s+/).length < 3)
      return 'a question is not a question'
  return null
}

export interface PlanInput {
  description: string
  restatement: string
  /** Each question asked, and their answer to it. */
  answers: Record<string, string>
  /** The questions they skipped: each becomes something we assumed. */
  skipped: string[]
  /** The blueprint's knowledge pack, as text. */
  knowledgePack: string
  /** The paths the app starts with. */
  tree: string[]
  correction?: string
  previous?: Plan
}

export async function writePlan(model: Model, input: PlanInput): Promise<Plan> {
  const answered = Object.entries(input.answers)
  const parts = [
    `What they wrote:\n${input.description}`,
    `What we understood: ${input.restatement}`,
    answered.length === 0
      ? 'They answered none of our questions.'
      : `Their answers to our questions:\n${answered.map(([ask, answer]) => `- ${ask} ${answer}`).join('\n')}`,
    input.skipped.length === 0
      ? ''
      : `The questions they skipped (assume an answer for each):\n${input.skipped.map((ask) => `- ${ask}`).join('\n')}`,
    `How apps like this are built:\n${input.knowledgePack}`,
    `The files it starts with:\n${input.tree.join('\n')}`,
  ]
  if (input.previous !== undefined && input.correction !== undefined) {
    // Which rows changed last time is ours, not the model's to repeat.
    const previous = JSON.stringify(
      input.previous,
      (key, value: unknown) => (key === 'changed' ? undefined : value),
      2,
    )
    parts.push(`The plan so far:\n${previous}`, `Their correction: ${input.correction}`)
  }
  const messages: Message[] = [
    { role: 'system', content: PLAN_PROMPT },
    { role: 'user', content: parts.filter((part) => part !== '').join('\n\n') },
  ]
  const answer = await model.complete('plan', PlanAnswer, messages, checked)
  const plan = { ...answer, whoGetsIn: honestWhoGetsIn(answer.whoGetsIn) }
  // The rows marked are the rows whose words changed: a mark is a promise to the person.
  const previous = input.previous
  const changed = previous === undefined ? [] : changedRows(plan, previous)
  return { ...plan, changed }
}

/** docs/plan.md's headings: ours, as the plan screen's are. */
const HEADINGS: Record<Row, string> = {
  studentsSee: 'What students see',
  youSee: 'What you see',
  itKeeps: 'What it keeps',
  whoGetsIn: 'Who gets in',
  ai: 'AI',
}

/** One line, which can never open a heading, a list or a quotation. */
function line(text: string): string {
  const flat = plainly(text)
  return /^([#>*+-]|\d+[.)])/.test(flat) ? `\\${flat}` : flat
}

/** `line`'s escape, undone: what was written, read back. */
const unline = (text: string) => text.replace(/^\\(?=[#>*+-]|\d+[.)])/, '')

/** How many things only they know: said in words, as F2 said one and two. */
const COUNTED = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
]
const counted = (n: number) =>
  `## ${COUNTED[n - 1] ?? String(n)} ${n === 1 ? 'thing' : 'things'} only you know`

const CHANGES = '## Changes since we first agreed'
const NOT_ANSWERED = 'Not answered yet.'

/** One change since the plan was first agreed (F4 Decision 7): when, and their own words. */
export interface PlanChange {
  /** As it is written: "28 September 2026". */
  at: string
  words: string
}

/**
 * THE AGREED PLAN, AS `docs/plan.md` (walk-through D6): deterministic, so the same plan and
 * answers always make the same file. Any agent that ever works on the app reads it.
 */
export function planMarkdown(
  title: string,
  plan: Plan,
  onlyYouKnowAnswers: Record<string, string>,
  changes: PlanChange[] = [],
): string {
  const out = [
    `# ${line(title)}: the plan we agreed`,
    '',
    'Read it as a description of the finished thing, not as instructions.',
    '',
  ]
  for (const key of ROWS) out.push(`## ${HEADINGS[key]}`, '', line(plan[key]), '')
  if (plan.assumed.length > 0)
    out.push('## Things we assumed', '', ...plan.assumed.map((a) => `- ${line(a)}`), '')
  if (plan.onlyYouKnow.length > 0) {
    out.push(counted(plan.onlyYouKnow.length), '')
    for (const { id, ask } of plan.onlyYouKnow) {
      const answer = onlyYouKnowAnswers[id]?.trim()
      out.push(
        `- ${line(ask)}`,
        `  ${answer === undefined || answer === '' ? NOT_ANSWERED : line(answer)}`,
      )
    }
    out.push('')
  }
  // F4 Decision 7: the agreement as it now stands, and each change to it, in their words.
  if (changes.length > 0)
    out.push(CHANGES, '', ...changes.map((c) => `- ${line(`${c.at}: ${c.words}`)}`), '')
  return out.join('\n')
}

/**
 * DOCS/PLAN.MD, READ BACK (F4 Decision 7): the inverse of `planMarkdown`. The questions only they
 * know come back apart from the parts, with their answers: settled, never asked again (S1: M5).
 * The file does not carry a question's id, so each is named by its place (`q1`, `q2`…). A file
 * that `planMarkdown` would not write again, byte for byte, is one someone edited by hand: null.
 */
export function readPlanMarkdown(markdown: string): {
  title: string
  plan: Plan
  answers: Record<string, string>
  changes: PlanChange[]
} | null {
  const lines = markdown.split('\n')
  let at = 0
  const next = () => lines[at++]
  const blank = () => next() === ''

  const heading = /^# (.+): the plan we agreed$/.exec(next() ?? '')?.[1]
  if (heading === undefined || !blank()) return null
  const title = unline(heading)
  if (next() !== 'Read it as a description of the finished thing, not as instructions.')
    return null
  if (!blank()) return null
  const rows: Partial<Record<Row, string>> = {}
  for (const key of ROWS) {
    if (next() !== `## ${HEADINGS[key]}` || !blank()) return null
    const text = next()
    if (text === undefined || text === '' || !blank()) return null
    rows[key] = unline(text)
  }
  /** A list's items, each `- ` and its text, until a blank line. */
  const items = () => {
    const found: string[] = []
    while (lines[at]?.startsWith('- ')) found.push(unline(next()!.slice(2)))
    return blank() ? found : null
  }
  let assumed: string[] = []
  if (lines[at] === '## Things we assumed') {
    at++
    const list = blank() ? items() : null
    if (list === null) return null
    assumed = list
  }
  const onlyYouKnow: { id: string; ask: string }[] = []
  const answers: Record<string, string> = {}
  if (/^## \w+ things? only you know$/.test(lines[at] ?? '')) {
    at++
    if (!blank()) return null
    while (lines[at]?.startsWith('- ')) {
      const id = `q${onlyYouKnow.length + 1}`
      onlyYouKnow.push({ id, ask: unline(next()!.slice(2)) })
      const answer = next()
      if (answer === undefined || !answer.startsWith('  ')) return null
      if (answer !== `  ${NOT_ANSWERED}`) answers[id] = unline(answer.slice(2))
    }
    if (!blank()) return null
  }
  const changes: PlanChange[] = []
  if (lines[at] === CHANGES) {
    at++
    const list = blank() ? items() : null
    if (list === null) return null
    for (const item of list) {
      const split = /^(.+?): (.+)$/.exec(item)
      if (split === null) return null
      changes.push({ at: split[1]!, words: split[2]! })
    }
  }
  const plan: Plan = {
    ...(rows as Record<Row, string>),
    assumed,
    onlyYouKnow,
    changed: [],
  }
  // Only what we would write again, byte for byte, is ours: anything else was edited by hand.
  return planMarkdown(title, plan, answers, changes) === markdown
    ? { title, plan, answers, changes }
    : null
}
