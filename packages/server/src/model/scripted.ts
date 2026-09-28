import { answered, type Message, type Model } from './client.js'

/**
 * FIXED ANSWERS, BY AGENT AND CALL (F2 Decision 6): for tests, and for mock mode, where the
 * mock has no model. Each answer goes through the same parse, check and single retry as a
 * real one: an object is a parsed answer, a string is the model's raw text. Every call's
 * messages are recorded, so a test can read the prompt it sent.
 */
export function scripted(
  answers: Record<string, unknown[]>,
): Model & { calls: { agent: string; messages: Message[] }[] } {
  const next = new Map<string, number>()
  const calls: { agent: string; messages: Message[] }[] = []
  return {
    calls,
    complete(agent, schema, messages, check) {
      calls.push({ agent, messages })
      return answered(
        async () => {
          const index = next.get(agent) ?? 0
          next.set(agent, index + 1)
          const list = answers[agent] ?? []
          // A test that scripted too few answers: its own mistake, said plainly.
          if (index >= list.length)
            throw new Error(`scripted: no answer ${index + 1} for ${agent}`)
          return list[index]
        },
        schema,
        check,
      )
    },
  }
}
