import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import { guards } from '../build/guards.js'
import { leadMoves, type RoundContext } from '../build/moves.js'
import { ModelError } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { walkthroughModel } from '../model/walkthrough.js'
import { CommitRefused, PlatformRefusal } from '../platform/refusal.js'
import type { Change, Source } from '../platform/source.js'
import { askAgent } from '../runtime/agent.js'
import { run, type RunState } from '../runtime/run.js'
import { movesOf } from '../runtime/tool.js'
import { storeTrace } from '../runtime/trace.js'
import { openStore } from '../store/db.js'
import { cwl, type CwlBrief } from './cwl.js'
import { explaining } from './explaining.js'
import { LEAD_PROMPT, VIEW_CAP, lead, type LeadView } from './lead.js'

/**
 * F3 TASK 7: THE LEAD, THE CWL SPECIALIST AND THE EXPLAINING AGENT, and the lead's five moves
 * as runtime tools over the round's context. Scripted answers; a fake context that records
 * what each move did.
 */
const SHA = '169f00cf5aeb43689077cc56ec7c3e5f524ed95a'
const NEXT = '23ed148f924ee0d410ad552938cd902d3c037a98'
const PACKAGE = {
  name: 'app',
  type: 'module',
  dependencies: { express: '4.22.2', passport: '0.7.0', 'passport-ubcshib': '0.1.6' },
}
const FILES: Record<string, string> = {
  'server.js': "import express from 'express'\nconst app = express()\n",
  'auth/ubcshib.js': 'export function configureCwl() {}\n',
  'auth/attributes.js': 'export function bridge(profile) { return profile }\n',
  'manifest.yaml':
    'manifest: 1\nauth:\n  provider: cwl\n  attributes: [ubcEduCwlPuid, mail]\n',
}

function roundContext(over: Partial<RoundContext> = {}) {
  let base = SHA
  const did: string[] = []
  const kept: { path: string; content: string }[] = []
  const written: Change[][] = []
  const questions: { ask: string; fallback: string | null; secret: string | null }[] = []
  const cannot: string[] = []
  const proposals: { changes: Change[]; summary: string }[] = []
  const briefs: CwlBrief[] = []
  const commits: { baseCommit: string; message: string; changes: Change[] }[] = []
  const source: Source = {
    tree: () => Promise.reject(new Error('the moves never read the tree')),
    file: async (_token, _project, path, ref) => {
      did.push(`file ${path}@${ref.slice(0, 7)}`)
      if (path === 'big.bin') return { unreadable: 'too-large' }
      const content = FILES[path]
      return content === undefined ? { unreadable: 'not-found' } : { content }
    },
    commit: async (_token, _project, body) => {
      commits.push(body)
      return {
        commitSha: NEXT,
        changed: body.changes.map((c) => ({
          path: c.path,
          status: c.op === 'delete' ? ('deleted' as const) : ('added' as const),
        })),
        warnings: [
          {
            code: 'SPEC_FIELD_NOT_ENFORCED',
            path: 'ai.budget.per_user_monthly_usd',
            hint: 'Nothing to fix.',
          },
        ],
      }
    },
  }
  const context: RoundContext = {
    token: 'mft_test_x',
    projectId: 'p-1',
    personId: 'person-1',
    source,
    members: {
      instructor: async (_t, _p, personId) =>
        personId === 'person-1'
          ? { puid: 'ins000001', email: 'instructor@ubc.ca' }
          : undefined,
    },
    guards: guards(),
    base: { get: () => base, set: (sha) => (base = sha) },
    paths: () => [...Object.keys(FILES), 'package.json', 'package-lock.json'],
    packageJson: () => PACKAGE,
    wrote: (changes) => written.push(changes),
    keep: (files) => kept.push(...files),
    question: (ask, fallback, secret) => {
      questions.push({ ask, fallback, secret })
      return {
        id: `q-${questions.length}`,
        answeredWith: secret === null ? fallback : null,
      }
    },
    cannot: (what) => void cannot.push(what),
    propose: (proposal) => void proposals.push(proposal),
    unchanged: () => undefined,
    askCwl: async (brief) => {
      briefs.push(brief)
      return {
        changes: [
          {
            op: 'write',
            path: 'config/staff.json',
            content: '{"puids":["ins000001"],"emails":[]}',
          },
        ],
        summary: 'Only you can see every response.',
      }
    },
    theirWords: () => [
      'A page where students post. My TA, sam.lee@ubc.ca, sees everything.',
    ],
    ...over,
  }
  return {
    context,
    proposals,
    did,
    kept,
    written,
    questions,
    cannot,
    briefs,
    commits,
    base: () => base,
  }
}

const tool = (kind: string) => leadMoves.find((t) => t.kind === kind)!
const guardOf = (kind: string, input: unknown, context: RoundContext) =>
  tool(kind).guard?.(input as never, context as never) ?? null
const runOf = (kind: string, input: unknown, context: RoundContext) =>
  tool(kind).run(input as never, context as never)

const commitMove = (over: object = {}) => ({
  message: 'Two pages',
  changes: [
    { op: 'write', path: 'routes/posts.js', content: 'export const posts = []\n' },
  ],
  line: 'Writing the page students post on.',
  account: 'Two pages, and the rule about who sees what',
  ...over,
})

describe("the lead's prompt", () => {
  it('says we; the stack is fixed; no dependency; no Dockerfile; plain words in line and account; ask only what only they know, with a default', () => {
    expect(LEAD_PROMPT).toMatch(/\bwe\b/i)
    expect(LEAD_PROMPT).toMatch(/stack is fixed/i)
    expect(LEAD_PROMPT).toMatch(/never add a (package|dependency)/i)
    expect(LEAD_PROMPT).toMatch(/Dockerfile/)
    expect(LEAD_PROMPT).toMatch(/\.npmrc/)
    expect(LEAD_PROMPT).toMatch(/line.*account|account.*line/is)
    expect(LEAD_PROMPT).toMatch(/what (the person|they) will see/i)
    expect(LEAD_PROMPT).toMatch(/only (the person|they) can answer/i)
    expect(LEAD_PROMPT).toMatch(/default/i)
    for (const move of leadMoves) expect(LEAD_PROMPT).toContain(move.describe)
  })
})

describe('the moves the lead may answer (Decision 2)', () => {
  const moves = movesOf(leadMoves)
  it('accepts each of the five, wrapped', () => {
    for (const move of [
      { kind: 'read', paths: ['server.js'] },
      { kind: 'commit', ...commitMove() },
      {
        kind: 'ask_cwl',
        brief: { whoGetsIn: 'a', youSee: 'b', studentsSee: 'c', namedEmails: [] },
      },
      { kind: 'ask_person', ask: 'Late posts?', default: 'They count.', secret: null },
      { kind: 'ask_person', ask: 'Your SIS key?', default: null, secret: 'SIS_KEY' },
      { kind: 'done', line: 'The pages are written.', cannot: null },
      { kind: 'done', line: 'The rest is built.', cannot: 'the formatted text box' },
    ])
      expect(moves.safeParse({ move }).success).toBe(true)
  })

  it('refuses a sixth kind, a read of 21 paths, and a line over 120 characters', () => {
    expect(moves.safeParse({ move: { kind: 'deploy' } }).success).toBe(false)
    const paths = Array.from({ length: 21 }, (_, i) => `f${i}.js`)
    expect(moves.safeParse({ move: { kind: 'read', paths } }).success).toBe(false)
    expect(
      moves.safeParse({ move: { kind: 'done', line: 'x'.repeat(121), cannot: null } })
        .success,
    ).toBe(false)
    // Strict mode asks for every field (M1): a done that leaves out `cannot` is not a move.
    expect(moves.safeParse({ move: { kind: 'done', line: 'Built.' } }).success).toBe(
      false,
    )
  })

  it("is the lead's own answer, and its root is an object (M1)", () => {
    expect(lead.answer).toBe(lead.answer)
    expect((z.toJSONSchema(lead.answer) as { type?: string }).type).toBe('object')
  })
})

describe('read', () => {
  it("answers the files' contents at the base, keeps them for the view, and a file it cannot read is one line", async () => {
    const r = roundContext()
    const result = await runOf(
      'read',
      { paths: ['server.js', 'big.bin', 'nowhere.js'] },
      r.context,
    )
    expect(result.report).toContain("import express from 'express'")
    expect(result.report).toMatch(/big\.bin: too large to read/)
    expect(result.report).toMatch(/nowhere\.js: there is no such file/)
    expect(r.did).toEqual([
      'file server.js@169f00c',
      'file big.bin@169f00c',
      'file nowhere.js@169f00c',
    ])
    expect(r.kept).toEqual([{ path: 'server.js', content: FILES['server.js'] }])
    expect(result.stop).toBeUndefined()
  })
})

describe('commit', () => {
  it('commits on the base, moves the base, tells the round what changed, and reports the paths and warnings', async () => {
    const r = roundContext()
    const result = await runOf('commit', commitMove(), r.context)
    expect(r.commits).toEqual([
      {
        baseCommit: SHA,
        message: 'Two pages',
        changes: [
          { op: 'write', path: 'routes/posts.js', content: 'export const posts = []\n' },
        ],
      },
    ])
    expect(r.base()).toBe(NEXT)
    expect(r.written).toEqual([commitMove().changes])
    expect(result.report).toContain('routes/posts.js')
    expect(result.report).toContain('SPEC_FIELD_NOT_ENFORCED')
    expect(result.refused).toBeUndefined()
  })

  it("refused SPEC_INVALID: each detail's path, code and hint reach the lead; the base stays; not a try, but counted", async () => {
    const r = roundContext({
      source: {
        ...roundContext().context.source,
        commit: () =>
          Promise.reject(
            new CommitRefused('SPEC_INVALID', 422, [
              {
                path: 'runtime.build',
                code: 'SPEC_BUILD_BLOCK_FORBIDDEN',
                hint: 'Remove the build block.',
              },
            ]),
          ),
      },
    })
    const result = await runOf('commit', commitMove(), r.context)
    expect(result.report).toContain('runtime.build')
    expect(result.report).toContain('SPEC_BUILD_BLOCK_FORBIDDEN')
    expect(result.report).toContain('Remove the build block.')
    expect(result.refused).toBe('SPEC_INVALID')
    expect(result.stop).toBeUndefined()
    expect(r.base()).toBe(SHA)
    expect(r.written).toEqual([])
  })

  it('a refusal the lead can answer is reported and counted; SOURCE_CONFLICT is thrown for the round to count', async () => {
    const refusing = (code: string) =>
      roundContext({
        source: {
          ...roundContext().context.source,
          commit: () => Promise.reject(new PlatformRefusal(code, 409)),
        },
      }).context
    const secret = await runOf('commit', commitMove(), refusing('SOURCE_SECRET_DETECTED'))
    expect(secret.refused).toBe('SOURCE_SECRET_DETECTED')
    await expect(
      runOf('commit', commitMove(), refusing('SOURCE_CONFLICT')),
    ).rejects.toMatchObject({
      code: 'SOURCE_CONFLICT',
    })
  })

  it('is guarded: a Dockerfile, a line of machinery, an account with a path, and a staff email nobody wrote', () => {
    const { context } = roundContext()
    expect(guardOf('commit', commitMove(), context)).toBeNull()
    expect(
      guardOf(
        'commit',
        commitMove({ changes: [{ op: 'write', path: 'Dockerfile', content: 'FROM x' }] }),
        context,
      ),
    ).not.toBeNull()
    expect(
      guardOf('commit', commitMove({ line: 'Running npm ci' }), context),
    ).not.toBeNull()
    expect(
      guardOf('commit', commitMove({ account: 'Edited routes/posts.js' }), context),
    ).not.toBeNull()
    const staff = (emails: string[]) =>
      commitMove({
        changes: [
          {
            op: 'write',
            path: 'config/staff.json',
            content: JSON.stringify({ puids: ['ins000001'], emails }),
          },
        ],
      })
    expect(guardOf('commit', staff(['sam.lee@ubc.ca']), context)).toBeNull()
    expect(guardOf('commit', staff(['attacker@example.com']), context)).toMatch(
      /attacker@example\.com/,
    )
  })
})

describe('ask_cwl: the specialist proposes, the lead commits (agents.md rule 2)', () => {
  it("asks with the brief, the instructor's PUID, and the app's sign-in files; reports the proposal, commits nothing", async () => {
    const r = roundContext()
    const brief = {
      whoGetsIn: 'Anyone with a CWL.',
      youSee: 'Every response.',
      studentsSee: 'Their own, then everyone’s.',
      namedEmails: ['sam.lee@ubc.ca'],
    }
    const result = await runOf('ask_cwl', { brief }, r.context)
    expect(r.briefs).toEqual([
      {
        plan: {
          whoGetsIn: brief.whoGetsIn,
          youSee: brief.youSee,
          studentsSee: brief.studentsSee,
        },
        staff: { instructorPuid: 'ins000001', emails: ['sam.lee@ubc.ca'] },
        files: [
          'auth/ubcshib.js',
          'auth/attributes.js',
          'server.js',
          'manifest.yaml',
        ].map((path) => ({
          path,
          content: FILES[path],
        })),
      },
    ])
    expect(result.report).toContain('config/staff.json')
    expect(result.report).toMatch(/not committed/i)
    expect(r.commits).toEqual([])
    // The proposal is kept for the lead's view, where it stays across its other moves (the real
    // platform: a lead that read a file after asking lost the proposal, and asked again, 15 times).
    expect(r.proposals).toEqual([
      {
        changes: [
          {
            op: 'write',
            path: 'config/staff.json',
            content: '{"puids":["ins000001"],"emails":[]}',
          },
        ],
        summary: 'Only you can see every response.',
      },
    ])
    expect(result.report).not.toContain('"puids"')
  })

  it('is guarded: an email the person never wrote is sent back before the specialist is asked', () => {
    const { context } = roundContext()
    const brief = (namedEmails: string[]) => ({
      brief: { whoGetsIn: 'a', youSee: 'b', studentsSee: 'c', namedEmails },
    })
    expect(guardOf('ask_cwl', brief(['sam.lee@ubc.ca']), context)).toBeNull()
    expect(guardOf('ask_cwl', brief(['someone@else.ca']), context)).toMatch(
      /someone@else\.ca/,
    )
  })
})

describe('ask_person', () => {
  it('with a default: answers at once with it, and the question is recorded', async () => {
    const r = roundContext()
    const result = await runOf(
      'ask_person',
      {
        ask: 'Should a TA see everything you see?',
        default: "We've built it so only you can.",
        secret: null,
      },
      r.context,
    )
    expect(r.questions).toEqual([
      {
        ask: 'Should a TA see everything you see?',
        fallback: "We've built it so only you can.",
        secret: null,
      },
    ])
    expect(result.report).toContain("We've built it so only you can.")
    expect(result.stop).toBeUndefined()
  })

  it('without a default, or a secret: the run pauses on the question', async () => {
    const r = roundContext()
    expect(
      (
        await runOf(
          'ask_person',
          { ask: 'Is a late post still a post?', default: null, secret: null },
          r.context,
        )
      ).stop,
    ).toEqual({
      kind: 'paused',
      questionId: 'q-1',
    })
    expect(
      (
        await runOf(
          'ask_person',
          { ask: 'What is the SIS key?', default: null, secret: 'SIS_KEY' },
          r.context,
        )
      ).stop,
    ).toEqual({
      kind: 'paused',
      questionId: 'q-2',
    })
    // The name the app reads it by is recorded with the question; the value never is.
    expect(r.questions[1]).toEqual({
      ask: 'What is the SIS key?',
      fallback: null,
      secret: 'SIS_KEY',
    })
  })

  it("a secret's name is one the platform takes (upper case, digits and underscores), or the move is sent back", () => {
    const { context } = roundContext()
    for (const secret of ['sis key', 'SIS-KEY', '9LIVES', 'x'.repeat(129).toUpperCase()])
      expect(
        guardOf(
          'ask_person',
          { ask: 'What is the SIS key?', default: null, secret },
          context,
        ),
      ).not.toBeNull()
    expect(
      guardOf(
        'ask_person',
        { ask: 'What is the SIS key?', default: null, secret: 'SIS_KEY' },
        context,
      ),
    ).toBeNull()
  })

  it('is guarded: the question and its default are words the person reads', () => {
    const { context } = roundContext()
    expect(
      guardOf(
        'ask_person',
        { ask: 'Should we deploy to the sandbox?', default: null, secret: null },
        context,
      ),
    ).not.toBeNull()
  })
})

describe('done', () => {
  it('ends the run with its line, guarded for plain words', async () => {
    const r = roundContext()
    expect(
      await runOf('done', { line: 'The pages are written.', cannot: null }, r.context),
    ).toMatchObject({
      stop: { kind: 'done', line: 'The pages are written.' },
    })
    expect(r.cannot).toEqual([])
    expect(guardOf('done', { line: 'It works', cannot: null }, r.context)).not.toBeNull()
  })

  it('FE-32: what cannot be added is handed to the round in its plain words, guarded like the line', async () => {
    const r = roundContext()
    expect(
      await runOf(
        'done',
        { line: 'The rest is built.', cannot: 'the formatted text box' },
        r.context,
      ),
    ).toMatchObject({ stop: { kind: 'done', line: 'The rest is built.' } })
    expect(r.cannot).toEqual(['the formatted text box'])
    expect(
      guardOf(
        'done',
        { line: 'The rest is built.', cannot: 'the npm package marked' },
        r.context,
      ),
    ).not.toBeNull()
  })
})

describe("the lead's view (Decision 3)", () => {
  const view = (files: { path: string; content: string }[]): LeadView => ({
    plan: '# Reading responses\n\n## Who gets in\nAnyone with a CWL.\n',
    pack: `# node-ts-mongo@1 — knowledge pack\n${'The stack is fixed. '.repeat(575)}`,
    paths: ['server.js', 'routes/a.js', 'routes/b.js', 'routes/c.js'],
    files,
    step: 'pages',
    tries: { build: 0, draft: 0, conflict: 0 },
    last: { kind: 'commit', report: 'Committed 23ed148: added routes/posts.js.' },
    messages: ['Can a late post still count?'],
    failures: [],
    proposal: null,
    settled: false,
    asked: [],
  })

  it('what it asked and what we went on with, and a settled proposal, are said; neither when there is none', () => {
    const user = lead
      .brief({
        ...view([]),
        settled: true,
        asked: [
          { ask: 'When do posts close?', wentWith: 'No deadline until you give one.' },
          { ask: 'The key for the library catalogue', wentWith: null },
        ],
      })
      .map((m) => m.content)
      .join('\n')
    expect(user).toMatch(/What you have asked this round/)
    expect(user).toContain(
      'When do posts close? We went on with: No deadline until you give one.',
    )
    expect(user).toContain('The key for the library catalogue (waiting for their answer)')
    expect(user).toMatch(/specialist's proposal is committed/i)
    const none = lead
      .brief(view([]))
      .map((m) => m.content)
      .join('\n')
    expect(none).not.toMatch(/What you have asked this round|proposal is committed/)
  })

  it("the specialist's proposal has its own section, whole, beside a read; the files give way first; none, no section", () => {
    const proposal = {
      summary: 'Only you and your TA see every response.',
      changes: [
        {
          op: 'write' as const,
          path: 'config/staff.json',
          content: '{"puids":["ins000001"],"emails":["sam.lee@ubc.ca"]}',
        },
        {
          op: 'write' as const,
          path: 'server.js',
          content: `// server.js\n${'s'.repeat(9_000)}\n`,
        },
      ],
    }
    const files = ['routes/c.js', 'routes/b.js'].map((path, i) => ({
      path,
      content: `// ${path}\n${String(i).repeat(15_000)}\n`,
    }))
    const input: LeadView = {
      ...view(files),
      last: { kind: 'read', report: 'Read routes/c.js, routes/b.js.' },
      proposal,
    }
    const messages = [
      { role: 'system', content: lead.instructions },
      ...lead.brief(input),
    ]
    expect(messages.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(
      VIEW_CAP,
    )
    const user = lead
      .brief(input)
      .map((m) => m.content)
      .join('\n')
    expect(user).toMatch(/proposal, not yet committed/i)
    expect(user).toContain(proposal.summary)
    for (const change of proposal.changes) expect(user).toContain(change.content)
    expect(user).toMatch(
      /routes\/b\.js: too large to show beside the rest: read it alone/,
    )
    const none = lead
      .brief(view(files))
      .map((m) => m.content)
      .join('\n')
    expect(none).not.toMatch(/not yet committed/i)
  })

  it('keeps everything the lead is sent to VIEW_CAP; the plan and the pack whole; the file left out is one line', () => {
    const files = ['routes/c.js', 'routes/b.js', 'routes/a.js'].map((path, i) => ({
      path,
      content: `// ${path}\n${String(i).repeat(15_000)}\n`,
    }))
    const input = view(files)
    const messages = [
      { role: 'system', content: lead.instructions },
      ...lead.brief(input),
    ]
    const size = messages.reduce((n, m) => n + m.content.length, 0)
    expect(VIEW_CAP).toBe(48_000)
    expect(size).toBeLessThanOrEqual(VIEW_CAP)
    const user = lead
      .brief(input)
      .map((m) => m.content)
      .join('\n')
    expect(user).toContain(input.plan)
    expect(user).toContain(input.pack)
    expect(user).toContain(files[0]!.content)
    expect(user).toMatch(
      /routes\/a\.js: too large to show beside the rest: read it alone/,
    )
    expect(user).toContain('Can a late post still count?')
    expect(user).toContain('Committed 23ed148')
  })

  it('never carries a token or a key, whatever the context holds', () => {
    const user = JSON.stringify(
      lead.brief(view([{ path: 'server.js', content: FILES['server.js']! }])),
    )
    expect(user).not.toMatch(/mft_|sk-/)
  })
})

describe('the CWL specialist (Decision 13)', () => {
  const brief: CwlBrief = {
    plan: {
      whoGetsIn: 'Anyone with a CWL.',
      youSee: 'Every response.',
      studentsSee: 'Their own.',
    },
    staff: { instructorPuid: 'ins000001', emails: ['sam.lee@ubc.ca'] },
    files: [{ path: 'server.js', content: FILES['server.js']! }],
  }
  const answer = (staff: unknown) => ({
    changes: [
      { op: 'write', path: 'config/staff.json', content: JSON.stringify(staff) },
      { op: 'write', path: 'auth/staff.js', content: 'export function staffOnly() {}\n' },
    ],
    summary: 'Only you and the people you named can see every response.',
  })

  it("writes config/staff.json with exactly the instructor's PUID and the brief's emails", async () => {
    const good = answer({ puids: ['ins000001'], emails: ['sam.lee@ubc.ca'] })
    expect(await askAgent(cwl, scripted({ cwl: [good] }), brief)).toEqual(good)
  })

  it.each([
    ['another PUID', { puids: ['ins000001', 'stu000009'], emails: ['sam.lee@ubc.ca'] }],
    [
      'an email nobody named',
      { puids: ['ins000001'], emails: ['sam.lee@ubc.ca', 'x@y.ca'] },
    ],
    ['a named email left out', { puids: ['ins000001'], emails: [] }],
  ])('refuses an answer with %s', async (_, staff) => {
    const error = await askAgent(
      cwl,
      scripted({ cwl: [answer(staff), answer(staff)] }),
      brief,
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ModelError)
    expect((error as ModelError).code).toBe('MODEL_ANSWER_INVALID')
  })

  it('refuses an answer with no config/staff.json at all', async () => {
    const none = {
      changes: [{ op: 'write', path: 'auth/staff.js', content: 'x' }],
      summary: 's',
    }
    const error = await askAgent(cwl, scripted({ cwl: [none, none] }), brief).catch(
      (e: unknown) => e,
    )
    expect((error as ModelError).code).toBe('MODEL_ANSWER_INVALID')
  })

  it("is briefed with the plan, the staff, and the app's files, and knows what the blueprint gives", async () => {
    const model = scripted({
      cwl: [answer({ puids: ['ins000001'], emails: ['sam.lee@ubc.ca'] })],
    })
    await askAgent(cwl, model, brief)
    const [system, user] = model.calls[0]!.messages
    expect(system?.content).toMatch(/req\.user\.user/)
    expect(system?.content).toMatch(/ubcEduCwlPuid/)
    expect(system?.content).toMatch(/\/healthz/)
    expect(user?.content).toContain('ins000001')
    expect(user?.content).toContain('sam.lee@ubc.ca')
    expect(user?.content).toContain(FILES['server.js'])
  })
})

describe('the explaining agent: a failure in one plain sentence (Decision 8, FE-8)', () => {
  const BUILD_WORDS = [
    'BUILD_FAILED: build failed (exit 1): #9 1.076 npm error Options:',
    'npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing',
    'npm error Missing: marked@14.1.0 from lock file',
  ]
  const DRAFT_WORDS = [
    'the process exited with code 1',
    'readiness: GET /healthz on mf-i-c9e0a517:3000 from the edge — the edge last answered 0 after 87 attempt(s)',
    "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/missing.js' imported from /app/server.js",
  ]
  const PLAIN = {
    note: 'A piece it depends on was missing',
    sentence:
      'We asked for a piece the app does not have yet, so it could not be put together.',
  }

  it.each([
    ['a build', 'build' as const, BUILD_WORDS],
    ['a draft', 'draft' as const, DRAFT_WORDS],
  ])(
    'for %s, answers a note and a sentence from the platform’s own words',
    async (_, what, words) => {
      const model = scripted({ explaining: [PLAIN] })
      expect(await askAgent(explaining, model, { what, words })).toEqual(PLAIN)
      const user = model.calls[0]!.messages.at(-1)!.content
      for (const line of words) expect(user).toContain(line)
    },
  )

  it.each([
    [
      'a module name',
      {
        note: 'A piece was missing',
        sentence: 'The app needs marked, which it does not have.',
      },
    ],
    [
      'a path',
      {
        note: 'A file was missing',
        sentence: 'It looked for /app/missing.js and did not find it.',
      },
    ],
    [
      'a code',
      { note: 'ERR_MODULE_NOT_FOUND', sentence: 'Something it loads was not there.' },
    ],
    [
      'machinery',
      { note: 'The container stopped', sentence: 'The container exited with code 1.' },
    ],
    [
      'a package tool',
      { note: 'The install failed', sentence: 'npm could not install everything.' },
    ],
  ])('refuses an answer with %s, and asks again', async (_, bad) => {
    const model = scripted({ explaining: [bad, PLAIN] })
    // The first answer is refused and the model asked again: the second, plain one, is what came back.
    expect(
      await askAgent(explaining, model, { what: 'build', words: BUILD_WORDS }),
    ).toEqual(PLAIN)
    const twice = scripted({ explaining: [bad, bad] })
    const error = await askAgent(explaining, twice, {
      what: 'build',
      words: BUILD_WORDS,
    }).catch((e: unknown) => e)
    expect((error as ModelError).code).toBe('MODEL_ANSWER_INVALID')
    expect(machineryIn(`${PLAIN.note} ${PLAIN.sentence}`)).toEqual([])
  })
})

describe('mock mode: the walk-through answers the three (F2 Decision 7)', () => {
  it('its lead reads, commits and is done, through the same schema and guards, in one run', async () => {
    const r = roundContext()
    const saved: RunState[] = []
    const stop = await run({
      agent: lead,
      tools: leadMoves,
      context: r.context,
      view: (state) => ({
        plan: '# Reading responses\n',
        pack: '# pack\n',
        paths: r.context.paths(),
        files: r.kept,
        step: 'pages' as const,
        tries: { build: 0, draft: 0, conflict: 0 },
        last: state.last,
        messages: [],
        failures: [],
        proposal: null,
        settled: false,
        asked: [],
      }),
      state: {
        runId: 'run-walk',
        step: 'pages',
        moves: 0,
        last: null,
        sameRefusal: null,
      },
      model: walkthroughModel(),
      maxMoves: 40,
      stopped: () => false,
      save: (s) => saved.push(s),
      trace: storeTrace(openStore(':memory:')),
    })
    expect(stop).toMatchObject({ kind: 'done' })
    expect(saved.map((s) => s.last?.kind)).toEqual(['read', 'commit', 'done'])
    expect(r.commits).toHaveLength(1)
  })

  it('its CWL specialist writes the brief’s own staff, and its explaining agent is plain', async () => {
    const brief: CwlBrief = {
      plan: { whoGetsIn: 'a', youSee: 'b', studentsSee: 'c' },
      staff: { instructorPuid: 'ins000001', emails: ['sam.lee@ubc.ca'] },
      files: [],
    }
    const proposed = await askAgent(cwl, walkthroughModel(), brief)
    const staff = proposed.changes.find((c) => c.path === 'config/staff.json')
    expect(JSON.parse((staff as { content: string }).content)).toEqual({
      puids: ['ins000001'],
      emails: ['sam.lee@ubc.ca'],
    })
    const said = await askAgent(explaining, walkthroughModel(), {
      what: 'build',
      words: ['x'],
    })
    expect(guards().words(`${said.note} ${said.sentence}`)).toBeNull()
  })
})
