import { answered, type Message, type Model } from './client.js'

/**
 * MOCK MODE'S MODEL (F2 Decision 7): the mock has none, so every agent is answered
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

/** The prototype's worked example (moment 5), in our voice, and honest about who gets in (FE-20). */
const PLAN = {
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

/** The plan; corrected, "What you see" changes, whatever the correction said. A mock. */
function plan(user: string): unknown {
  return user.includes('Their correction:')
    ? { ...PLAN, youSee: `${PLAN.youSee} We changed this as you asked.` }
    : PLAN
}

/**
 * F3's LEAD, as mock mode plays it (F3 Task 7): it reads the entry, writes one page, and is done.
 * It follows its own last move, which the view says ("Your last move (read): …"); in any step
 * but the pages, it is done at once.
 */
const WEEKS_PAGE = [
  '<!doctype html>',
  '<meta charset="utf-8" />',
  '<title>Reading responses</title>',
  '<h1>This week’s reading</h1>',
  '<p>Post your response, then read everyone else’s.</p>',
  '',
].join('\n')

function lead(user: string): unknown {
  const last = /Your last move \((\w+)\)/.exec(user)?.[1]
  if (!/The step: Writing the pages/.test(user) || last === 'commit' || last === 'done')
    return {
      move: {
        kind: 'done',
        line: 'The pages are written.',
        cannot: null,
        account: 'Students have a page listing the weeks, where they post.',
      },
    }
  if (last === 'read')
    return {
      move: {
        kind: 'commit',
        message: 'The page students post on',
        changes: [{ op: 'write', path: 'public/weeks.html', content: WEEKS_PAGE }],
        line: 'Writing the page students post on.',
        account: 'One page listing the weeks',
      },
    }
  return { move: { kind: 'read', paths: ['server.js'] } }
}

/** F3's CWL specialist in mock mode: staff exactly as briefed, and the check in front of the instructor's pages. */
function cwl(user: string): unknown {
  const staff = JSON.parse(/^Staff: (\{.*\})$/m.exec(user)?.[1] ?? '{}') as {
    instructorPuid?: string
    emails?: string[]
  }
  return {
    changes: [
      {
        op: 'write',
        path: 'config/staff.json',
        content: `${JSON.stringify({ puids: [staff.instructorPuid], emails: staff.emails ?? [] }, null, 2)}\n`,
      },
      {
        op: 'write',
        path: 'auth/staff.js',
        content: [
          "import { readFileSync } from 'node:fs'",
          '',
          "const staff = JSON.parse(readFileSync(new URL('../config/staff.json', import.meta.url), 'utf8'))",
          '',
          'export function staffOnly(req, res, next) {',
          '  const user = req.user?.user',
          '  const isStaff =',
          '    staff.puids.includes(user?.ubcEduCwlPuid) ||',
          "    staff.emails.includes(String(user?.mail ?? '').toLowerCase())",
          "  return isStaff ? next() : res.status(403).send('Only the instructor can see this page.')",
          '}',
          '',
        ].join('\n'),
      },
    ],
    summary:
      "Staff are the instructor and the people they named, kept in config/staff.json; auth/staff.js lets only them reach the instructor's pages.",
  }
}

/** F3's explaining agent in mock mode: one plain sentence, whatever failed. */
function explaining(): unknown {
  return {
    note: 'A piece it depends on was missing',
    sentence:
      'We asked for a piece the app does not have yet, so it could not be put together.',
  }
}

export function walkthroughModel(): Model {
  const answers: Record<string, (user: string) => unknown> = {
    understanding,
    naming,
    blueprint,
    plan,
    lead,
    cwl,
    explaining,
  }
  return {
    complete(agent, schema, messages: Message[], check) {
      const user = messages.find((m) => m.role === 'user')?.content ?? ''
      return answered(async () => answers[agent]?.(user), schema, check)
    },
  }
}
