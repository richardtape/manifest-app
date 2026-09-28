import type { Schemas } from '@manifest/contract'
import { describe, expect, it } from 'vitest'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import { ModelError } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { BLUEPRINT_PROMPT, chooseBlueprint } from './blueprint.js'
import { NAMING_PROMPT, suggestNames } from './naming.js'
import { understand, UNDERSTANDING_PROMPT } from './understanding.js'

/**
 * THE THREE INTAKE AGENTS (agents.md): each one schema, one prompt, one function over a
 * Model. Against `scripted`, so every rule is a fixed answer away. The bad answers here are
 * the ones `qwen3.5:4b` really gave (F2 M3): each parsed, and each was wrong.
 */
const WORDS =
  "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar. About 200 students."

const UNDERSTOOD = {
  questions: [
    {
      id: 'q1',
      ask: 'Can a student change a response after posting it?',
      choices: ['Yes', 'No'],
    },
    { id: 'q2', ask: 'Should a TA see everything you see?', choices: null },
  ],
  restatement:
    "A page where your students post a response to the week's reading, and see everyone else's once they have posted.",
  audience: { scale: 'class', burst: 'synchronised', from: 'About 200 students' },
  cannot: [],
}

async function refusedWith(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ModelError)
  return (error as ModelError).code
}

describe('understand (moment 3)', () => {
  it('sends its prompt and the person’s words, and answers the understanding', async () => {
    const model = scripted({ understanding: [UNDERSTOOD] })
    expect(await understand(model, WORDS, {}, 1)).toEqual(UNDERSTOOD)
    const messages = model.calls[0]!.messages
    expect(messages[0]).toEqual({ role: 'system', content: UNDERSTANDING_PROMPT })
    expect(messages[1]!.role).toBe('user')
    expect(messages[1]!.content).toContain(WORDS)
  })

  it('round 2 reads each question with its answer', async () => {
    const model = scripted({ understanding: [{ ...UNDERSTOOD, questions: [] }] })
    await understand(
      model,
      WORDS,
      { 'Can a student change a response after posting it?': 'No' },
      2,
    )
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toContain('Can a student change a response after posting it?')
    expect(user).toMatch(/No/)
  })

  it('round 2 never asks more than three: four is refused, retried once, then MODEL_ANSWER_INVALID', async () => {
    const four = {
      ...UNDERSTOOD,
      questions: [1, 2, 3, 4].map((n) => ({
        id: `q${n}`,
        ask: `Is question ${n} a question?`,
        choices: null,
      })),
    }
    const model = scripted({ understanding: [four, four] })
    expect(await refusedWith(understand(model, WORDS, {}, 2))).toBe(
      'MODEL_ANSWER_INVALID',
    )
    expect(model.calls).toHaveLength(1)
  })

  it('there is no round 3: the round is 1 or 2, by type', () => {
    const model = scripted({})
    // @ts-expect-error a third round is not a thing the caller can ask for (moment 3)
    void understand(model, WORDS, {}, 3).catch(() => undefined)
  })

  it.each([
    [
      'a question that is not a question ("No", as the 4B model wrote)',
      { questions: [{ id: 'q1', ask: 'No', choices: null }] },
    ],
    [
      'a question of one word ("Integration?")',
      { questions: [{ id: 'q1', ask: 'Integration?', choices: null }] },
    ],
    [
      'two questions with one id',
      { questions: [UNDERSTOOD.questions[0], { ...UNDERSTOOD.questions[1], id: 'q1' }] },
    ],
    [
      'a choice of one',
      {
        questions: [
          { id: 'q1', ask: 'Can a student change it later?', choices: ['Yes'] },
        ],
      },
    ],
    [
      'the same choice twice',
      {
        questions: [
          { id: 'q1', ask: 'Can a student change it later?', choices: ['Yes', 'Yes'] },
        ],
      },
    ],
    [
      'a guess from nothing (an empty "from")',
      { audience: { scale: 'class', burst: 'steady', from: '' } },
    ],
    [
      'a guess from words the person never wrote',
      { audience: { scale: 'public', burst: 'steady', from: 'the whole university' } },
    ],
    ['no restatement', { restatement: '' }],
    [
      'five choices',
      {
        questions: [
          {
            id: 'q1',
            ask: 'Which day does it open on?',
            choices: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          },
        ],
      },
    ],
  ])('%s is refused, retried once, then MODEL_ANSWER_INVALID', async (_, patch) => {
    const bad = { ...UNDERSTOOD, ...patch }
    const model = scripted({ understanding: [bad, bad] })
    expect(await refusedWith(understand(model, WORDS, {}, 1))).toBe(
      'MODEL_ANSWER_INVALID',
    )
  })

  it.each([
    ['in quotes', '"night before the seminar"'],
    ['with its full stop', 'the seminar.'],
    ['in another case', 'about 200 students'],
    ['whole', 'About 200 students.'],
  ])('a guess from the person’s own words %s is theirs', async (_, from) => {
    const model = scripted({
      understanding: [{ ...UNDERSTOOD, audience: { ...UNDERSTOOD.audience, from } }],
    })
    expect((await understand(model, WORDS, {}, 1)).audience.from).toBe(from)
  })

  it('a bad first answer and a good second one is the good one', async () => {
    const model = scripted({
      understanding: [{ ...UNDERSTOOD, restatement: '' }, UNDERSTOOD],
    })
    expect((await understand(model, WORDS, {}, 1)).restatement).toBe(
      UNDERSTOOD.restatement,
    )
  })
})

describe('suggestNames (moment 4)', () => {
  const NAMES = {
    names: [
      { name: 'Reading responses', slug: 'reading-responses' },
      { name: 'Weekly responses', slug: 'weekly-responses' },
      { name: 'Seminar reading log', slug: 'seminar-reading-log' },
    ],
  }

  it('answers three to five names, and its prompt names every address already taken (Review Focus 3)', async () => {
    const model = scripted({ naming: [NAMES] })
    expect(
      await suggestNames(model, UNDERSTOOD.restatement, ['mock-app', 'reading-log']),
    ).toEqual(NAMES)
    const [system, user] = model.calls[0]!.messages
    expect(system).toEqual({ role: 'system', content: NAMING_PROMPT })
    expect(user!.content).toContain(UNDERSTOOD.restatement)
    expect(user!.content).toContain('mock-app')
    expect(user!.content).toContain('reading-log')
  })

  it.each([
    [
      'an address already taken',
      {
        names: [...NAMES.names.slice(0, 2), { name: 'Reading log', slug: 'reading-log' }],
      },
    ],
    [
      'one address twice',
      {
        names: [
          ...NAMES.names.slice(0, 2),
          { name: 'Readings', slug: 'reading-responses' },
        ],
      },
    ],
    [
      'one name twice',
      {
        names: [
          ...NAMES.names.slice(0, 2),
          { name: 'Reading responses', slug: 'reading-responses-2' },
        ],
      },
    ],
    [
      'an address that is not one',
      { names: [...NAMES.names.slice(0, 2), { name: 'Readings', slug: 'Readings!' }] },
    ],
    ['only two', { names: NAMES.names.slice(0, 2) }],
    [
      'a name on two lines',
      {
        names: [
          ...NAMES.names.slice(0, 2),
          { name: 'Reading\nresponses', slug: 'reading-lines' },
        ],
      },
    ],
  ])('%s is refused, retried once, then MODEL_ANSWER_INVALID', async (_, bad) => {
    const model = scripted({ naming: [bad, bad] })
    expect(
      await refusedWith(suggestNames(model, UNDERSTOOD.restatement, ['reading-log'])),
    ).toBe('MODEL_ANSWER_INVALID')
  })
})

describe('chooseBlueprint (moment 4, D3)', () => {
  const BLUEPRINTS: Schemas['BlueprintList'] = [
    {
      ref: 'node-ts-mongo@1',
      name: 'node-ts-mongo',
      majorVersion: 1,
      language: 'javascript',
      defaultPort: 3000,
      healthPath: '/healthz',
      schemaVersions: [1],
      provides: { services: ['mongodb'], authProviders: ['cwl', 'none'], ai: true },
      starters: [
        {
          name: 'proof-app',
          summary: 'A note-taking app with CWL sign-in and an AI answer.',
        },
      ],
    },
  ]

  it('answers one of the blueprints it was given, and a starter of that blueprint or none', async () => {
    const choice = {
      blueprint: 'node-ts-mongo@1',
      starter: null,
      why: 'Students write and read posts.',
    }
    const model = scripted({ blueprint: [choice] })
    expect(await chooseBlueprint(model, UNDERSTOOD.restatement, BLUEPRINTS)).toEqual(
      choice,
    )
    const [system, user] = model.calls[0]!.messages
    expect(system).toEqual({ role: 'system', content: BLUEPRINT_PROMPT })
    expect(user!.content).toContain('node-ts-mongo@1')
    expect(user!.content).toContain('proof-app')
  })

  it('its prompt carries what each blueprint offers, and no machinery (no port, no health path)', async () => {
    const model = scripted({
      blueprint: [{ blueprint: 'node-ts-mongo@1', starter: 'proof-app', why: 'x' }],
    })
    await chooseBlueprint(model, UNDERSTOOD.restatement, BLUEPRINTS)
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toContain('mongodb')
    expect(user).not.toMatch(/3000|healthz/)
  })

  it.each([
    [
      'a blueprint it was not given (a model cannot invent one)',
      { blueprint: 'python-flask@1', starter: null, why: 'x' },
    ],
    [
      'a starter that blueprint does not have',
      { blueprint: 'node-ts-mongo@1', starter: 'bulletin-board', why: 'x' },
    ],
  ])('%s is refused, retried once, then MODEL_ANSWER_INVALID', async (_, bad) => {
    const model = scripted({ blueprint: [bad, bad] })
    expect(
      await refusedWith(chooseBlueprint(model, UNDERSTOOD.restatement, BLUEPRINTS)),
    ).toBe('MODEL_ANSWER_INVALID')
  })
})

describe('the prompts (walk-through D5; C3)', () => {
  it.each([
    ['understanding', UNDERSTANDING_PROMPT],
    ['naming', NAMING_PROMPT],
    ['blueprint', BLUEPRINT_PROMPT],
  ])(
    '%s: a constant, speaking as "we", naming no machinery, and forbidding it',
    (_, prompt) => {
      expect(prompt).toContain('"we"')
      expect(machineryIn(prompt)).toEqual([])
      expect(prompt).toMatch(/never .*technical/i)
    },
  )
})
