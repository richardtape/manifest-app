import type { Schemas } from '@manifest/contract'
import { z } from 'zod/v4'
import type { Check, Message, Model } from '../model/client.js'

/**
 * THE BLUEPRINT AGENT (walk-through D3: an agent chooses the blueprint and any starter),
 * from the list the browser read with `listBlueprints`. Its answer must be one it was given:
 * a model cannot invent a blueprint, or a starter a blueprint does not have.
 */
export const BlueprintChoice = z.object({
  blueprint: z.string().min(1),
  starter: z.string().min(1).nullable(),
  why: z.string().min(1).max(200),
})
export type Chosen = z.infer<typeof BlueprintChoice>

export const BLUEPRINT_PROMPT = [
  'You choose how a small web app a university instructor has described will be built. You are one of a team, and you always speak as "we".',
  'You are given the ways we can build it, each with what it offers and the starting points it has. Choose exactly one, by its ref. Choose a starting point only if it fits what they asked for closely; otherwise choose none.',
  'In "why", say in one sentence, to the instructor, why this fits.',
  'Never use technical words: say what people see and do.',
].join('\n')

function checkedAgainst(blueprints: Schemas['BlueprintList']): Check<Chosen> {
  return ({ blueprint, starter }) => {
    const chosen = blueprints.find((b) => b.ref === blueprint)
    if (chosen === undefined) return 'a blueprint it was not given'
    // Students sign in with CWL: the product's premise, and what Making it says. When any
    // blueprint provides it, one that does not (the platform's test fixture) is refused.
    const cwl = (b: Schemas['Blueprint']) => b.provides.authProviders.includes('cwl')
    if (!cwl(chosen) && blueprints.some(cwl)) return 'a blueprint without CWL sign-in'
    if (starter !== null && !chosen.starters.some((s) => s.name === starter))
      return 'a starter its blueprint does not have'
    return null
  }
}

export function chooseBlueprint(
  model: Model,
  restatement: string,
  blueprints: Schemas['BlueprintList'],
): Promise<Chosen> {
  // What each offers and where it can start: never its port or its health path (C3).
  const ways = blueprints.map((b) => ({
    ref: b.ref,
    language: b.language,
    offers: b.provides,
    starters: b.starters,
  }))
  const messages: Message[] = [
    { role: 'system', content: BLUEPRINT_PROMPT },
    {
      role: 'user',
      content: `The app: ${restatement}\n\nThe ways we can build it:\n${JSON.stringify(ways, null, 2)}`,
    },
  ]
  return model.complete(
    'blueprint',
    BlueprintChoice,
    messages,
    checkedAgainst(blueprints),
  )
}
