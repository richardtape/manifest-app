import { z } from 'zod/v4'
import { guards } from '../build/guards.js'
import { defineAgent } from '../runtime/agent.js'

/**
 * THE EXPLAINING AGENT (F3 Decision 8; FE-8): a failed build or draft, in one plain sentence,
 * from the platform's own words, which it is given and never repeats. Its `note` is the step's
 * note; its `sentence` is the one line in the conversation. The words themselves go behind
 * "The exact words, for whoever you ask for help".
 */
export interface Failure {
  what: 'build' | 'draft'
  /** The platform's own words, as Decision 8 gathers them. */
  words: string[]
}

export const Explained = z.object({
  note: z.string().min(1).max(60),
  sentence: z.string().min(1).max(160),
})

export const EXPLAINING_PROMPT = [
  'You explain to a university instructor, in plain words, why a step of building their app did not work. We are a team, and we always speak as "we".',
  "You are given the platform's own words. Never repeat them: no file names, no paths, no names of packages or modules, no codes, and no technical words.",
  '"note" is a few words for the step, at most 60 characters, such as "A piece it depends on was missing". "sentence" is one sentence, at most 160 characters, saying what happened in their words, without blame. Never say "it works".',
].join('\n')

const STEP = { build: 'Building it', draft: 'Putting it on your draft address' } as const

/** The names the platform's words give: a missing package, a module, a file. */
function namesIn(words: string[]): string[] {
  const text = words.join('\n')
  const names = new Set<string>()
  for (const [, name] of text.matchAll(/Missing: (@?[\w.-]+(?:\/[\w.-]+)?)@/g))
    names.add(name!)
  for (const [, name] of text.matchAll(/Cannot find (?:module|package) '([^']+)'/g)) {
    names.add(name!)
    names.add(name!.slice(name!.lastIndexOf('/') + 1))
  }
  return [...names].filter((name) => name.length > 1)
}

/** C3 for a failure: plain words, no code, and none of the names the platform's words give. */
const plain = (failure: Failure) => {
  const names = namesIn(failure.words).map((n) => n.toLowerCase())
  return ({ note, sentence }: z.infer<typeof Explained>): string | null => {
    const both = `${note} ${sentence}`
    const words = guards()
    const machine = words.words(note) ?? words.words(sentence)
    if (machine !== null) return machine
    if (/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/.test(both)) return 'a code'
    const lower = both.toLowerCase()
    if (names.some((name) => lower.includes(name)))
      return "a name from the platform's words"
    return null
  }
}

export const explaining = defineAgent({
  name: 'explaining',
  instructions: EXPLAINING_PROMPT,
  brief: (failure: Failure) => [
    {
      role: 'user' as const,
      content: [
        `The step that did not work: ${STEP[failure.what]}.`,
        "The platform's own words:",
        ...failure.words,
      ].join('\n'),
    },
  ],
  answer: Explained,
  check: plain,
})
