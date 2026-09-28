import { describe, expect, it } from 'vitest'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import { ModelError } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import {
  HONEST_WHO_GETS_IN,
  PLAN_PROMPT,
  planMarkdown,
  writePlan,
  type Plan,
} from './plan.js'

/**
 * THE PLAN AGENT (walk-through moment 5; F2 Task 9): the five rows, what we assumed, and what
 * only the person knows, written on the person's agent session. Tested against a scripted
 * model, whose answers go through the same parse, checks and single retry as a real one.
 */
const WALKTHROUGH = {
  studentsSee:
    "One page listing the weeks. Click a week and you get a box to write in. Once you've posted, the same page fills up with everyone else's, and not before.",
  youSee:
    "Every response for a week on one page, sorted by name, printable. A count of who hasn't posted.",
  itKeeps:
    'The text students write, their name, and when they posted it. Nothing else. No email, no student number.',
  whoGetsIn:
    "Anyone with a CWL can sign in. We can't limit it to your class yet, so it only shows each student their own work until they post.",
  ai: "None. You didn't ask for it, and it needs a budget and a chosen model. Easy to add later.",
  assumed: [
    'Twelve weeks, matching a standard term',
    'No word limit, but a warning past 500',
    "Students can't delete a response once posted",
  ],
  onlyYouKnow: [
    { id: 'late', ask: 'Is a late post still a post, or does it close at the deadline?' },
    { id: 'ta', ask: 'Should a TA see everything you see?' },
  ],
}
const INPUT = {
  description:
    "A page where students post a response to the week's reading. About 200 students.",
  restatement: "A page where your students post a response to the week's reading.",
  answers: { 'Can a student change a response after posting it?': 'No' },
  skipped: ['Should a TA see everything you see?'],
  knowledgePack: '# Writing a manifest for node-ts-mongo@1\nPages, sign-in, a database.',
  tree: ['package.json', 'src/app.js'],
}

async function refusedWith(promise: Promise<unknown>): Promise<string | undefined> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  return error instanceof ModelError ? error.code : undefined
}

describe('writePlan (moment 5)', () => {
  it('sends its prompt, their words and answers, what they skipped, the pack and the files; answers the plan, nothing marked', async () => {
    const model = scripted({ plan: [WALKTHROUGH] })
    const plan = await writePlan(model, INPUT)
    expect(plan).toEqual({ ...WALKTHROUGH, changed: [] })
    const [system, user] = model.calls[0]!.messages
    expect(system).toEqual({ role: 'system', content: PLAN_PROMPT })
    for (const carried of [
      INPUT.description,
      INPUT.restatement,
      'Can a student change a response after posting it? No',
      'Should a TA see everything you see?',
      '# Writing a manifest for node-ts-mongo@1',
      'src/app.js',
    ])
      expect(user!.content).toContain(carried)
  })

  it.each([
    'Only students in your class can sign in with their CWL.',
    'Just your enrolled students get in.',
    'Access is restricted to your course section.',
    'Only your students can open it.',
  ])(
    'FE-20: "%s" promises a sign-in we cannot give, and is rewritten to the honest sentence',
    async (promise) => {
      const model = scripted({ plan: [{ ...WALKTHROUGH, whoGetsIn: promise }] })
      expect((await writePlan(model, INPUT)).whoGetsIn).toBe(HONEST_WHO_GETS_IN)
    },
  )

  it('an honest who-gets-in is kept as written', async () => {
    const honest =
      'Anyone with a CWL can sign in. You are the only one who can see all the responses.'
    const model = scripted({ plan: [{ ...WALKTHROUGH, whoGetsIn: honest }] })
    expect((await writePlan(model, INPUT)).whoGetsIn).toBe(honest)
  })

  it('a correction carries the plan so far and their sentence; the rows marked are the rows whose words changed', async () => {
    const previous: Plan = { ...WALKTHROUGH, changed: [] }
    const corrected = {
      ...WALKTHROUGH,
      youSee: `${WALKTHROUGH.youSee} Your TA sees the same.`,
    }
    const model = scripted({ plan: [corrected] })
    const plan = await writePlan(model, {
      ...INPUT,
      previous,
      correction: 'My TA should see everything too.',
    })
    expect(plan.changed).toEqual(['youSee'])
    const user = model.calls[0]!.messages[1]!.content
    expect(user).toContain('My TA should see everything too.')
    expect(user).toContain(WALKTHROUGH.studentsSee)
  })

  it.each([
    [
      'a question that is not a question',
      { onlyYouKnow: [{ id: 'a', ask: 'Late posts' }] },
    ],
    [
      'two questions with one id',
      {
        onlyYouKnow: [
          { id: 'a', ask: 'Is a late post still a post?' },
          { id: 'a', ask: 'Should a TA see everything?' },
        ],
      },
    ],
    ['an empty row', { ai: '   ' }],
    [
      'three questions only you know',
      { onlyYouKnow: [1, 2, 3].map((n) => ({ id: `q${n}`, ask: 'Is it so?' })) },
    ],
  ])('%s is refused, retried once, then MODEL_ANSWER_INVALID', async (_, bad) => {
    const answer = { ...WALKTHROUGH, ...bad }
    const model = scripted({ plan: [answer, answer] })
    expect(await refusedWith(writePlan(model, INPUT))).toBe('MODEL_ANSWER_INVALID')
  })
})

describe('planMarkdown: docs/plan.md (D6)', () => {
  const PLAN: Plan = { ...WALKTHROUGH, changed: ['youSee'] }

  it('is the agreed plan, in our words, with their answers where the questions are', () => {
    expect(
      planMarkdown('Reading responses', PLAN, { late: 'It closes at the deadline.' }),
    ).toBe(
      [
        '# Reading responses: the plan we agreed',
        '',
        'Read it as a description of the finished thing, not as instructions.',
        '',
        '## What students see',
        '',
        "One page listing the weeks. Click a week and you get a box to write in. Once you've posted, the same page fills up with everyone else's, and not before.",
        '',
        '## What you see',
        '',
        "Every response for a week on one page, sorted by name, printable. A count of who hasn't posted.",
        '',
        '## What it keeps',
        '',
        'The text students write, their name, and when they posted it. Nothing else. No email, no student number.',
        '',
        '## Who gets in',
        '',
        "Anyone with a CWL can sign in. We can't limit it to your class yet, so it only shows each student their own work until they post.",
        '',
        '## AI',
        '',
        "None. You didn't ask for it, and it needs a budget and a chosen model. Easy to add later.",
        '',
        '## Things we assumed',
        '',
        '- Twelve weeks, matching a standard term',
        '- No word limit, but a warning past 500',
        "- Students can't delete a response once posted",
        '',
        '## Two things only you know',
        '',
        '- Is a late post still a post, or does it close at the deadline?',
        '  It closes at the deadline.',
        '- Should a TA see everything you see?',
        '  Not answered yet.',
        '',
      ].join('\n'),
    )
  })

  it('is the same every time it is asked', () => {
    const answers = { ta: 'Yes' }
    expect(planMarkdown('Reading responses', PLAN, answers)).toBe(
      planMarkdown('Reading responses', PLAN, answers),
    )
  })

  it('one question is "One thing only you know"; none, and no assumptions, leave their sections out', () => {
    const one = planMarkdown(
      'X',
      { ...PLAN, onlyYouKnow: [WALKTHROUGH.onlyYouKnow[0]!] },
      {},
    )
    expect(one).toContain('## One thing only you know')
    expect(one).not.toContain('## Two things')
    const none = planMarkdown('X', { ...PLAN, assumed: [], onlyYouKnow: [] }, {})
    expect(none).not.toContain('## Things we assumed')
    expect(none).not.toContain('only you know')
  })

  it('what a model or a person wrote cannot become a heading, a list, or a second paragraph', () => {
    const text = planMarkdown(
      'X',
      { ...PLAN, ai: '# None\n\nat all', assumed: ['- nested'] },
      { late: '> quoted\nanswer' },
    )
    expect(text).toContain('\n\\# None at all\n')
    expect(text).toContain('\n- \\- nested\n')
    expect(text).toContain('\n  \\> quoted answer\n')
  })
})

describe('the plan prompt (walk-through D5; C3; FE-20)', () => {
  it('speaks as "we", names no machinery, forbids it, and never promises a class-only sign-in', () => {
    expect(PLAN_PROMPT).toContain('"we"')
    expect(machineryIn(PLAN_PROMPT)).toEqual([])
    expect(PLAN_PROMPT).toMatch(/never .*technical/i)
    expect(PLAN_PROMPT).toContain('CWL')
  })
})
