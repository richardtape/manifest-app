import { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * THE UNDERSTANDING AGENT (agents.md; walk-through moment 3): the follow-up questions, then
 * a one-sentence restatement, a guess at who it is for with the words it guessed from, and
 * anything no blueprint can do. Every field is required (`choices` is null when there are
 * none), so a gateway that holds a schema strictly takes this one as it is.
 */
export const Understanding = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        ask: z.string().min(1).max(200),
        choices: z.array(z.string().min(1).max(80)).max(4).nullable(),
      }),
    )
    .max(3),
  restatement: z.string().min(1).max(400),
  audience: z.object({
    scale: z.enum(['solo', 'class', 'large_course', 'public']),
    burst: z.enum(['steady', 'synchronised']),
    from: z.string().max(80),
  }),
  cannot: z.array(z.string().min(1).max(160)).max(3),
})
export type Understood = z.infer<typeof Understanding>

export const UNDERSTANDING_PROMPT = [
  'You help a university instructor describe a small web app they need. You are one of a team, and you always speak as "we".',
  'Read what they wrote. Ask at most three follow-up questions, and only ones whose answers would change what we build. Each question is one short sentence ending in a question mark. Offer two to four choices when the answers are few, and none otherwise. Ask nothing if nothing would change.',
  'Say back what you understood in one sentence, to them: "A page where your students…". Say only what they asked for, and add nothing they did not say.',
  'Guess who it is for, by how many people and these rough ceilings. scale: solo (just them, or them and a few colleagues: up to about 25), class (one course section: up to about 400), large_course (a large course, or several sections: up to about 5,000), public (anyone with the link, people outside UBC included). burst: synchronised when everyone arrives at once, as for a deadline or a class; steady otherwise. In "from", copy the few words of theirs you guessed from, exactly as they wrote them.',
  'In "cannot", list anything they asked for that we cannot do, such as sending marks to Canvas, emailing students, or reaching any other university system. Leave it empty when there is nothing.',
  'Never use technical words: say what people see and do.',
].join('\n')

/** Lower case, one kind of apostrophe, single spaces. */
const plain = (text: string) =>
  text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
/** Without the quotes around it or the punctuation after it. */
const bare = (text: string) =>
  plain(text)
    .replace(/^["'“”]+/, '')
    .replace(/["'“”.,;:!?]+$/, '')
    .trim()

/**
 * WHAT THE SCHEMA CANNOT SAY (F2 M3: every one of the 4B model's ten answers parsed, and
 * several were wrong). Each is a rule about form, never about meaning: reading intent out of
 * the model's text is what `agents.md` rule 3 forbids. So a restatement that invents a word
 * passes here; a question that is not a question, or a guess from words nobody wrote, does not.
 */
function checkedAgainst(description: string): Check<Understood> {
  return (understood) => {
    const ids = new Set(understood.questions.map((q) => q.id))
    if (ids.size !== understood.questions.length) return 'two questions share an id'
    for (const { ask, choices } of understood.questions) {
      if (!ask.trim().endsWith('?') || ask.trim().split(/\s+/).length < 3)
        return 'a question is not a question'
      if (
        choices !== null &&
        (choices.length < 2 || new Set(choices.map(plain)).size !== choices.length)
      )
        return 'a choice is not a choice'
    }
    if (understood.restatement.trim() === '') return 'no restatement'
    const from = bare(understood.audience.from)
    if (from === '' || !plain(description).includes(from))
      return 'the guess is not from their words'
    return null
  }
}

/**
 * Round 1 reads their words; round 2 reads them with their answers, keyed by the question
 * asked. There is no round 3 (moment 3): the plan is where anything left is corrected.
 */
export function understand(
  model: Model,
  description: string,
  answers: Record<string, string>,
  round: 1 | 2,
): Promise<Understood> {
  const asked = Object.entries(answers)
  const user =
    round === 1 || asked.length === 0
      ? `What they wrote:\n${description}`
      : [
          `What they wrote:\n${description}`,
          `Their answers to our questions:\n${asked.map(([ask, answer]) => `- ${ask} ${answer}`).join('\n')}`,
          'Ask again only if an answer opens a new question.',
        ].join('\n\n')
  const messages: Message[] = [
    { role: 'system', content: UNDERSTANDING_PROMPT },
    { role: 'user', content: user },
  ]
  // Their words are what they wrote and, in round 2, what they answered: a guess may come
  // from either (the final review).
  const theirs = [description, ...asked.map(([, answer]) => answer)].join('\n')
  return model.complete('understanding', Understanding, messages, checkedAgainst(theirs))
}
