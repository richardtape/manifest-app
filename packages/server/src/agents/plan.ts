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

/** Rules about form, never meaning (agents.md rule 3): a question is a question, a row has words. */
const checked: Check<z.infer<typeof PlanAnswer>> = (plan) => {
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
  const whoGetsIn = CLASS_ONLY.some((promise) => promise.test(answer.whoGetsIn))
    ? HONEST_WHO_GETS_IN
    : answer.whoGetsIn
  const plan = { ...answer, whoGetsIn }
  // The rows marked are the rows whose words changed: a mark is a promise to the person.
  const previous = input.previous
  const changed =
    previous === undefined
      ? []
      : ROWS.filter((key) => plainly(plan[key]) !== plainly(previous[key]))
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

/**
 * THE AGREED PLAN, AS `docs/plan.md` (walk-through D6): deterministic, so the same plan and
 * answers always make the same file. Any agent that ever works on the app reads it.
 */
export function planMarkdown(
  title: string,
  plan: Plan,
  onlyYouKnowAnswers: Record<string, string>,
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
    out.push(
      plan.onlyYouKnow.length === 1
        ? '## One thing only you know'
        : '## Two things only you know',
      '',
    )
    for (const { id, ask } of plan.onlyYouKnow) {
      const answer = onlyYouKnowAnswers[id]?.trim()
      out.push(
        `- ${line(ask)}`,
        `  ${answer === undefined || answer === '' ? 'Not answered yet.' : line(answer)}`,
      )
    }
    out.push('')
  }
  return out.join('\n')
}
