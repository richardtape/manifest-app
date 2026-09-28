import { answered, type Message, type Model } from './client.js'

/**
 * MOCK MODE'S MODEL (F2 Decision 7): the mock has none, so every intake agent is answered
 * from the walk-through's example, through the same parse, checks and single retry as a real
 * answer. It reads only what a prompt must carry: whether answers came back (round 2), which
 * addresses are taken, and which blueprints were offered. A mock, and simpler than it looks:
 * every description gets the walk-through's questions and names.
 */
const QUESTIONS = [
  {
    id: 'q1',
    ask: 'Can a student change a response after posting it?',
    choices: ['Yes', 'No'],
  },
  { id: 'q2', ask: 'Should a TA see everything you see?', choices: ['Yes', 'No'] },
  {
    id: 'q3',
    ask: 'Does each week open on a set date, or all at once?',
    choices: ['On a set date', 'All at once'],
  },
]
const NAMES = [
  { name: 'Reading responses', slug: 'reading-responses' },
  { name: 'Weekly responses', slug: 'weekly-responses' },
  { name: 'Seminar reading log', slug: 'seminar-reading-log' },
]
const MORE_NAMES = [
  { name: 'Response board', slug: 'response-board' },
  { name: 'Reading circle', slug: 'reading-circle' },
  { name: 'Week by week', slug: 'week-by-week' },
]
const WALKTHROUGH_RESTATEMENT =
  "A page where your students post a response to the week's reading and see everyone else's once they have posted, and you can skim them all at once."

function understanding(user: string): unknown {
  const words = user.replace(/^What they wrote:\n/, '').split('\n\n')[0] ?? ''
  const about = /about \d+ students/i.exec(words)?.[0]
  const firstWords = words.split(/\s+/).slice(0, 4).join(' ')
  return {
    questions: user.includes('Their answers to our questions') ? [] : QUESTIONS,
    restatement:
      about === undefined
        ? `An app for what you described: ${words.split(/(?<=[.!?])\s/)[0] ?? words}`.slice(
            0,
            400,
          )
        : WALKTHROUGH_RESTATEMENT,
    audience: { scale: 'class', burst: 'synchronised', from: about ?? firstWords },
    cannot: [],
  }
}

function naming(user: string): unknown {
  const taken =
    /taken, so suggest none of them: (.*)$/m.exec(user)?.[1]?.split(', ') ?? []
  return { names: NAMES.some((n) => taken.includes(n.slug)) ? MORE_NAMES : NAMES }
}

function blueprint(user: string): unknown {
  return {
    blueprint: /"ref": "([^"]+)"/.exec(user)?.[1] ?? 'node-ts-mongo@1',
    starter: null,
    why: 'Your students write and read, and you read them all: this is made for that.',
  }
}

export function walkthroughModel(): Model {
  const answers: Record<string, (user: string) => unknown> = {
    understanding,
    naming,
    blueprint,
  }
  return {
    complete(agent, schema, messages: Message[], check) {
      const user = messages.find((m) => m.role === 'user')?.content ?? ''
      return answered(async () => answers[agent]?.(user), schema, check)
    },
  }
}
