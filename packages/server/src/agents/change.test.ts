import { describe, expect, it } from 'vitest'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import { ModelError } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import {
  CHANGE_PROMPT,
  NOT_WRITTEN_DOWN,
  writeChange,
  type ChangeInput,
} from './change.js'
import { HONEST_WHO_GETS_IN, planMarkdown, ROWS, type Plan } from './plan.js'

/**
 * THE CHANGE PLANNER (F4 Decision 7; Rich: a change is agreed before it is built). Given the
 * agreement as it stands and what they asked, it answers F2's plan whole, with a title; the
 * parts it changed are ours to mark, word for word. Answered questions are settled (S1: M5).
 */
const CURRENT: Plan = {
  studentsSee:
    "One page listing the weeks. Click a week and you get a box to write in. Once you've posted, the same page fills up with everyone else's, and not before.",
  youSee:
    "Every response for a week on one page, sorted by name, printable. A count of who hasn't posted.",
  itKeeps:
    'The text students write, their name, and when they posted it. Nothing else. No email, no student number.',
  whoGetsIn:
    "Anyone with a CWL can sign in. We can't limit it to your class yet, so it only shows each student their own work until they post.",
  ai: "None. You didn't ask for it, and it needs a budget and a chosen model. Easy to add later.",
  assumed: ['Twelve weeks, matching a standard term'],
  onlyYouKnow: [
    { id: 'q1', ask: 'Is a late post still a post, or does it close at the deadline?' },
    { id: 'q2', ask: 'Should a TA see everything you see?' },
  ],
  changed: [],
}
const SETTLED = [
  {
    ask: 'Is a late post still a post, or does it close at the deadline?',
    answer: 'It closes at the deadline.',
  },
  { ask: 'Should a TA see everything you see?', answer: null },
]
const ASKED = ['Also show a word count on each response.']
const INPUT: ChangeInput = {
  current: CURRENT,
  currentText: planMarkdown('Reading responses', CURRENT, {
    q1: 'It closes at the deadline.',
  }),
  settled: SETTLED,
  asked: ASKED,
  knowledge: '## AGENTS.md\n\nHow it is built.',
}
/** M5's answer: two parts changed, three kept word for word, titled "Word count". */
const ANSWER = {
  studentsSee: `${CURRENT.studentsSee} Each response shows how many words it has.`,
  youSee: `${CURRENT.youSee} Each response shows its word count.`,
  itKeeps: CURRENT.itKeeps,
  whoGetsIn: CURRENT.whoGetsIn,
  ai: CURRENT.ai,
  assumed: CURRENT.assumed,
  onlyYouKnow: [],
  title: 'Word count',
}

async function refusedWith(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ModelError) return error.code
    throw error
  }
  throw new Error('not refused')
}

describe('writeChange', () => {
  it('is given the agreement, the settled questions as settled, what they asked and how it is built; the rows whose words differ are marked', async () => {
    const model = scripted({ change: [ANSWER] })
    const change = await writeChange(model, INPUT)
    expect(change).toEqual({
      ...ANSWER,
      changed: ['studentsSee', 'youSee'],
    })
    const [system, user] = model.calls[0]!.messages
    expect(system?.content).toBe(CHANGE_PROMPT)
    expect(user?.content).toContain(CURRENT.itKeeps)
    expect(user?.content).toContain('Also show a word count on each response.')
    expect(user?.content).toContain('How it is built.')
    // Settled: asked before, each with its answer, never to be asked again.
    expect(user?.content).toMatch(
      /Settled[^\n]*\n- Is a late post still a post, or does it close at the deadline\? It closes at the deadline\.\n- Should a TA see everything you see\? Not answered, and not to be asked again\./,
    )
    // The questions are settled, never parts of the plan it is given.
    expect(user?.content).not.toContain('"onlyYouKnow"')
  })

  it('a row it wrote again, word for word but for spacing, is not marked', async () => {
    const model = scripted({
      change: [{ ...ANSWER, itKeeps: `  ${CURRENT.itKeeps.replace('. ', '.  ')} ` }],
    })
    expect((await writeChange(model, INPUT)).changed).toEqual(['studentsSee', 'youSee'])
  })

  it('a file that no longer reads back is given as it is written, and every part it writes is marked', async () => {
    const model = scripted({ change: [ANSWER] })
    const text = '# Our app\n\nSomeone wrote this by hand.'
    const change = await writeChange(model, {
      ...INPUT,
      current: null,
      currentText: text,
    })
    expect(change.changed).toEqual([...ROWS])
    expect(model.calls[0]!.messages[1]!.content).toContain('Someone wrote this by hand.')
  })

  it('minors m135: with no plan written down, it is told we cannot see the app, to write only what the change makes true and our words for the rest; a part left in them is never marked', async () => {
    // F5b sitting 1's M7: an app made through the API, asked only to stop asking UBC for "sn",
    // came back as grades and a staff dashboard, and the lead built part of it.
    const asked = ['Stop asking UBC for their last name: nothing in the app uses it.']
    const answer = {
      studentsSee: NOT_WRITTEN_DOWN,
      youSee: NOT_WRITTEN_DOWN,
      itKeeps: 'We no longer ask UBC for their last name.',
      whoGetsIn: NOT_WRITTEN_DOWN,
      ai: NOT_WRITTEN_DOWN,
      assumed: [],
      onlyYouKnow: [],
      title: 'Last name',
    }
    const model = scripted({ change: [answer] })
    const change = await writeChange(model, {
      ...INPUT,
      current: null,
      currentText: '',
      settled: [],
      asked,
    })
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toMatch(/we cannot see what it does/i)
    expect(user).toMatch(/only what this change makes true/i)
    expect(user).toContain(`write exactly this, and nothing else: ${NOT_WRITTEN_DOWN}`)
    expect(user).toMatch(/never guess/i)
    expect(user).not.toMatch(/write every part from what they asked for/i)
    // The review's I1: who gets in too, or the lead is told a sign-in it would build from.
    expect(user).toMatch(/who gets in only when this change is about who can sign in/i)
    expect(change.changed).toEqual(['itKeeps'])
    expect(machineryIn(NOT_WRITTEN_DOWN)).toEqual([])
  })

  it('minors m135: a part it left so with a straight apostrophe or other spacing is ours word for word, and never marked', async () => {
    const loose = `  ${NOT_WRITTEN_DOWN.replace('’', "'").replace(': ', ':  ')} `
    const model = scripted({
      change: [{ ...ANSWER, studentsSee: loose, onlyYouKnow: [], title: 'Last name' }],
    })
    const change = await writeChange(model, {
      ...INPUT,
      current: null,
      currentText: '',
      settled: [],
    })
    expect(change.studentsSee).toBe(NOT_WRITTEN_DOWN)
    expect(change.changed).not.toContain('studentsSee')
    expect(change.changed).toContain('youSee')
  })

  it('the review of m135 (M7): a plan already holding our words keeps them as ours, never guessed at, and never marks a copy of them', async () => {
    const current: Plan = {
      ...CURRENT,
      studentsSee: NOT_WRITTEN_DOWN,
      youSee: NOT_WRITTEN_DOWN,
      whoGetsIn: NOT_WRITTEN_DOWN,
      ai: NOT_WRITTEN_DOWN,
      assumed: [],
      onlyYouKnow: [],
    }
    const model = scripted({
      change: [
        {
          ...current,
          studentsSee: NOT_WRITTEN_DOWN.replace('’', "'"),
          itKeeps: `${current.itKeeps} And when each was last changed.`,
          title: 'When it changed',
        },
      ],
    })
    const change = await writeChange(model, {
      ...INPUT,
      current,
      currentText: planMarkdown('Reading responses', current, {}),
      settled: [],
    })
    expect(change.studentsSee).toBe(NOT_WRITTEN_DOWN)
    expect(change.changed).toEqual(['itKeeps'])
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toContain(`Parts that say "${NOT_WRITTEN_DOWN}" are parts we cannot see`)
    expect(user).toMatch(/never guess what the app does/i)
  })

  it('a plan with none of our words is not told about them', async () => {
    const model = scripted({ change: [ANSWER] })
    await writeChange(model, INPUT)
    expect(model.calls[0]!.messages[1]!.content).not.toContain(NOT_WRITTEN_DOWN)
  })

  it('a hand-written file is never read as nothing written down: every part is marked, even our words', async () => {
    const model = scripted({ change: [{ ...ANSWER, studentsSee: NOT_WRITTEN_DOWN }] })
    const change = await writeChange(model, {
      ...INPUT,
      current: null,
      currentText: '# Our app\n\nSomeone wrote this by hand.',
    })
    expect(change.changed).toEqual([...ROWS])
    expect(model.calls[0]!.messages[1]!.content).not.toContain(NOT_WRITTEN_DOWN)
  })

  it('a correction carries the change so far and their sentence; the marks are still against the agreement', async () => {
    const narrowed = { ...ANSWER, studentsSee: CURRENT.studentsSee }
    const model = scripted({ change: [narrowed] })
    const change = await writeChange(model, {
      ...INPUT,
      previous: { ...ANSWER, changed: ['studentsSee', 'youSee'] },
      correction: 'Only on my view.',
    })
    expect(change.changed).toEqual(['youSee'])
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toContain('Only on my view.')
    expect(user).toContain(ANSWER.youSee)
    expect(user).not.toContain('"changed"')
  })

  it('never promises a class-only sign-in: the honest sentence replaces it', async () => {
    const model = scripted({
      change: [
        { ...ANSWER, whoGetsIn: 'Only students enrolled in your class can sign in.' },
      ],
    })
    const change = await writeChange(model, INPUT)
    expect(change.whoGetsIn).toBe(HONEST_WHO_GETS_IN)
    expect(change.changed).toContain('whoGetsIn')
  })

  it.each([
    ['a title naming machinery', { title: 'Word count on staging' }],
    ['a title naming code', { title: 'Word count in npm' }],
    ['a title naming a file', { title: 'Word count in server.js' }],
    ['a title that says it works', { title: 'It works with word counts' }],
    ['a title that reads like an address', { title: 'word-count' }],
    ['a title of two lines', { title: 'Word\ncount' }],
    [
      'a question holding its answer (M5)',
      { onlyYouKnow: [{ id: 'a', ask: 'Who is my class?\nIt closes at the deadline.' }] },
    ],
    [
      'a settled question asked again',
      {
        onlyYouKnow: [
          {
            id: 'a',
            ask: 'is a late post still a post, or does it close at the deadline',
          },
        ],
      },
    ],
    [
      'a question it was told is settled though never answered',
      { onlyYouKnow: [{ id: 'a', ask: 'Should a TA see everything you see?' }] },
    ],
    [
      'a question that is not a question',
      { onlyYouKnow: [{ id: 'a', ask: 'Tell us more.' }] },
    ],
  ])('%s is refused, asked once more, then MODEL_ANSWER_INVALID', async (_, bad) => {
    const answer = { ...ANSWER, ...bad }
    const model = scripted({ change: [answer, answer] })
    expect(await refusedWith(writeChange(model, INPUT))).toBe('MODEL_ANSWER_INVALID')
    expect(model.calls).toHaveLength(1)
  })

  /** m123's own, from the walk on 7100 (the laptop's plan model wrote it into a plan). */
  const MACHINERY_ASSUMED = {
    ...ANSWER,
    assumed: [
      ...CURRENT.assumed,
      'The count is permitted by the environment variables provided by the platform',
    ],
  }

  it('machinery in what we assumed (m123, Rich: "Re-ask once"): asked once more, the same words, and its answer kept', async () => {
    const model = scripted({ change: [MACHINERY_ASSUMED, ANSWER] })
    const change = await writeChange(model, INPUT)
    expect(change.assumed).toEqual(CURRENT.assumed)
    expect(machineryIn(change.assumed.join(' '))).toEqual([])
    expect(model.calls).toHaveLength(2)
    expect(model.calls[1]!.messages).toEqual(model.calls[0]!.messages)
  })

  it('machinery again after asking once more: kept as it wrote it, never a third ask', async () => {
    const again = {
      ...MACHINERY_ASSUMED,
      assumed: ['A word count fits within the container we run it in'],
    }
    const model = scripted({ change: [MACHINERY_ASSUMED, again] })
    expect((await writeChange(model, INPUT)).assumed).toEqual(again.assumed)
    expect(model.calls).toHaveLength(2)
  })

  it('asking once more refused: the first answer is kept, never lost to it', async () => {
    const invalid = { ...ANSWER, title: 'Word count on staging' }
    const model = scripted({ change: [MACHINERY_ASSUMED, invalid, invalid] })
    expect((await writeChange(model, INPUT)).assumed).toEqual(MACHINERY_ASSUMED.assumed)
    expect(model.calls).toHaveLength(2)
  })

  it('no machinery in what we assumed: asked once', async () => {
    const model = scripted({ change: [ANSWER] })
    await writeChange(model, INPUT)
    expect(model.calls).toHaveLength(1)
  })

  it('a question about the change itself is asked', async () => {
    const asks = [
      { id: 'where', ask: 'Should students see their own count while they write?' },
    ]
    const model = scripted({ change: [{ ...ANSWER, onlyYouKnow: asks }] })
    expect((await writeChange(model, INPUT)).onlyYouKnow).toEqual(asks)
  })
})

describe('the change prompt (walk-through D5, C3)', () => {
  it('speaks as "we", keeps every other part word for word, never asks a settled question, and names no machinery', () => {
    expect(CHANGE_PROMPT).toContain('"we"')
    expect(CHANGE_PROMPT).toMatch(/keep every other part word for word/i)
    expect(CHANGE_PROMPT).toMatch(/settled/i)
    expect(CHANGE_PROMPT).toMatch(/never .*technical/i)
    expect(CHANGE_PROMPT).toContain('CWL')
    expect(machineryIn(CHANGE_PROMPT)).toEqual([])
  })

  it('asks for a title of this change alone, and gives it none to copy (F4 Step 2: "Show when each response was posted" came back titled "Word count", the prompt\'s own example)', () => {
    const titled = CHANGE_PROMPT.split('\n').filter((line) => /title/i.test(line))
    expect(titled).toHaveLength(1)
    expect(titled[0]).toMatch(/of its own/i)
    expect(titled[0]).toMatch(/what they asked for now/i)
    expect(titled[0]).toMatch(/never the title of a change made before/i)
    expect(titled[0]).not.toMatch(/"[^"]+"/)
  })
})
