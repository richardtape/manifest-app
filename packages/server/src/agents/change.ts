import { z } from 'zod/v4'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import { guards } from '../build/guards.js'
import { ModelError, type Check, type Message, type Model } from '../model/client.js'
import {
  changedRows,
  checked,
  honestWhoGetsIn,
  PlanAnswer,
  planMarkdown,
  ROWS,
  type Plan,
  type PlanChange,
  type readPlanMarkdown,
  type Row,
} from './plan.js'

/**
 * THE CHANGE PLANNER (F4 Decision 7; Rich, 2026-09-28: a change is agreed before it is built).
 * It is given the agreement as it stands (`docs/plan.md` from the app's tree), what was asked,
 * and a correction if there is one, and answers F2's plan whole, with a title of its own. The
 * parts it changed are ours to mark, word for word. It runs on the conversation's own agent
 * session, which the person pays for, as F2's plan does.
 */
export const ChangeAnswer = PlanAnswer.extend({ title: z.string().min(1).max(60) })

export const CHANGE_PROMPT = [
  'You write what we would change in a small web app a university instructor already has. You are one of a team, and you always speak as "we".',
  'You are given the plan we agreed with them, in five parts: what their students see; what they, the instructor, see; what it keeps; who gets in; and AI. You are also given what they asked for now.',
  'Answer the whole plan as it would read after the change. Change only the parts the change needs, and keep every other part word for word.',
  'Describe the finished thing, not how to build it. Who gets in: anyone with a CWL can sign in. We cannot limit it to one class, course or section yet, so never promise that.',
  'In "assumed", keep what we assumed before, and add at most what the change makes us assume; three at most.',
  'In "onlyYouKnow", ask at most two questions only the instructor can answer about this change, each one short sentence ending in a question mark. The questions we asked before are settled: never ask one of them again, and never write an answer into a question.',
  'Give this change a short title of its own: a few words they would use for what they asked for now, never the title of a change made before.',
  'You are also given the guide to how apps like this are built. It is for you to know what we build on: never name a file, a tool or any code.',
  'When they correct the change, change only what their correction asks for, and keep every other part word for word.',
  'Never use technical words: say what people see and do.',
].join('\n')

export interface ChangeInput {
  /** The agreement as it stands, read back from docs/plan.md; null when it no longer reads back. */
  current: Plan | null
  /** The file itself: what the planner reads when it no longer reads back as ours. */
  currentText: string
  /** Every question asked before, with its answer: settled, never asked again (S1: M5). */
  settled: { ask: string; answer: string | null }[]
  /** Their words for this change, in order. */
  asked: string[]
  /** How apps like this are built: the blueprint's knowledge pack, as text. */
  knowledge: string
  /** The change so far, and their correction of it. */
  previous?: Plan & { title: string }
  correction?: string
}

/** A question's words, for telling one asked again: case, spacing and punctuation aside. */
const gist = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** An address, not a title: words joined by hyphens with no space (Task 4's rule). */
const ADDRESS_LIKE = /^\S+-\S+$/

function checkedAgainst(settled: string[]): Check<z.infer<typeof ChangeAnswer>> {
  const words = guards().words
  const asked = new Set(settled.map(gist))
  return (answer) => {
    const form = checked(answer)
    if (form !== null) return form
    const title = answer.title.trim()
    if (/[\r\n]/.test(answer.title) || title === '') return 'a title that is not one line'
    if (ADDRESS_LIKE.test(title)) return 'a title that reads like an address'
    const said = words(title)
    if (said !== null) return `the title: ${said}`
    for (const { ask } of answer.onlyYouKnow) {
      if (/[\r\n]/.test(ask)) return 'a question with an answer written into it'
      if (asked.has(gist(ask))) return `a question already settled: ${ask}`
    }
    return null
  }
}

/** The parts of a plan, as the planner reads them: never its questions, never our marks. */
const partsOf = (plan: Plan) =>
  JSON.stringify(
    Object.fromEntries([
      ...ROWS.map((key: Row) => [key, plan[key]]),
      ['assumed', plan.assumed],
    ]),
    null,
    2,
  )

export async function writeChange(
  model: Model,
  input: ChangeInput,
): Promise<Plan & { title: string }> {
  const parts = [
    input.current === null
      ? input.currentText.trim() === ''
        ? 'There is no plan written down yet: write every part from what they asked for.'
        : `The plan we agreed, as it is written now (it no longer reads as our plan, so write every part from it):\n${input.currentText}`
      : `The plan we agreed:\n${partsOf(input.current)}`,
    input.settled.length === 0
      ? ''
      : `Settled, never to be asked again:\n${input.settled
          .map(
            ({ ask, answer }) =>
              `- ${ask} ${answer ?? 'Not answered, and not to be asked again.'}`,
          )
          .join('\n')}`,
    `What they asked for now:\n${input.asked.map((words) => `- ${words}`).join('\n')}`,
    `How apps like this are built:\n${input.knowledge}`,
  ]
  if (input.previous !== undefined && input.correction !== undefined)
    parts.push(
      `The change so far, titled "${input.previous.title}":\n${partsOf(input.previous)}`,
      `Their correction: ${input.correction}`,
    )
  const messages: Message[] = [
    { role: 'system', content: CHANGE_PROMPT },
    { role: 'user', content: parts.filter((part) => part !== '').join('\n\n') },
  ]
  const ask = () =>
    model.complete(
      'change',
      ChangeAnswer,
      messages,
      checkedAgainst(input.settled.map((s) => s.ask)),
    )
  const answer = await askAgainForMachinery(await ask(), ask)
  const plan = {
    ...answer,
    title: answer.title.trim(),
    whoGetsIn: honestWhoGetsIn(answer.whoGetsIn),
  }
  // Ours to mark, against the agreement: a file that no longer reads back has every part new.
  const changed = input.current === null ? [...ROWS] : changedRows(plan, input.current)
  return { ...plan, changed }
}

type Read = ReturnType<typeof readPlanMarkdown>

/** The questions asked before, each with its answer: settled (S1: M5). None when it did not read back. */
export function settledOf(read: Read): { ask: string; answer: string | null }[] {
  return (read?.plan.onlyYouKnow ?? []).map((q) => ({
    ask: q.ask,
    answer: read?.answers[q.id] ?? null,
  }))
}

/**
 * THE AGREEMENT AS IT NOW STANDS (F4 Decision 7), as docs/plan.md: the change's parts, the
 * questions asked before with their answers, unchanged, then the change's own, and every change
 * since the plan was first agreed, this one last.
 */
export function changedPlanMarkdown(
  title: string,
  read: Read,
  plan: Plan,
  answers: Record<string, string>,
  change: PlanChange,
): string {
  const before = read?.plan.onlyYouKnow ?? []
  // Ids are the file's own business: each question keyed apart, so no answer lands on another.
  const questions = [
    ...before.map((q, n) => ({ id: `settled-${n + 1}`, ask: q.ask })),
    ...plan.onlyYouKnow.map((q) => ({ id: `asked-${q.id}`, ask: q.ask })),
  ]
  const answered: Record<string, string> = {}
  before.forEach((q, n) => {
    const answer = read?.answers[q.id]
    if (answer !== undefined) answered[`settled-${n + 1}`] = answer
  })
  for (const [id, answer] of Object.entries(answers)) answered[`asked-${id}`] = answer
  return planMarkdown(title, { ...plan, onlyYouKnow: questions, changed: [] }, answered, [
    ...(read?.changes ?? []),
    change,
  ])
}

/** The day a change is dated by, as UBC's clock reads it: "29 September 2026". */
export function dayOf(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Vancouver',
  }).format(at)
}

/**
 * MINORS m123 (Rich, 2026-10-03: *"Re-ask once"*): machinery in what we assumed (C3; on 7100 the
 * plan model wrote *"…the environment variables provided by the platform"*) is asked once more, the
 * same words, as a refused answer is re-asked. That answer is kept as it wrote it, never asked a
 * third time; one the model refuses keeps the first, never lost to it.
 */
async function askAgainForMachinery(
  first: z.infer<typeof ChangeAnswer>,
  ask: () => Promise<z.infer<typeof ChangeAnswer>>,
): Promise<z.infer<typeof ChangeAnswer>> {
  if (machineryIn(first.assumed.join('\n')).length === 0) return first
  try {
    return await ask()
  } catch (error) {
    if (error instanceof ModelError) return first
    throw error
  }
}
