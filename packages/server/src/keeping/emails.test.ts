import { describe, expect, it } from 'vitest'
import { machineryIn } from '../../../web/src/screens/machinery.js'
import type { Conversation, Happening } from '../api/progress.js'
import type { EmailKind, KeptApp, KeptMember, Outgoing } from '../store/keeping.js'
import { emailsFor, waitingEmail } from './emails.js'

/**
 * F6 TASK 5: THE EMAILS (D3), pure. Who is emailed what for one happening, and the words: plain
 * text, the app's name first, one link, the last line, Vancouver's time, and no machinery (C3:
 * the page's own list, imported, so one list has two readers).
 */
const P = '11111111-1111-4111-8111-111111111111'
const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CAROL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const DAN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const STRANGER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const ORIGIN = 'http://127.0.0.1:7105'
const R1 = 'r1000000-0000-4000-8000-000000000001'
const I1 = 'i1000000-0000-4000-8000-000000000001'
const INC = 'n1000000-0000-4000-8000-000000000001'

const APP: KeptApp = {
  projectId: P,
  name: 'Reading responses',
  slug: 'reading-responses',
  state: 'active',
  launchedAt: '2026-09-18T16:00:00.000Z',
  studentsUrl: 'https://reading-responses.manifest.internal',
}
const MEMBERS: KeptMember[] = [
  { userId: ALICE, role: 'owner', displayName: 'Alice Owner', email: 'alice@ubc.ca' },
  { userId: BOB, role: 'collaborator', displayName: 'Bob Helper', email: 'bob@ubc.ca' },
  { userId: CAROL, role: 'owner', displayName: 'Carol Owner', email: 'carol@ubc.ca' },
  { userId: DAN, role: 'owner', displayName: 'Dan Owner', email: 'dan@ubc.ca' },
]
const OWNERS = ['alice@ubc.ca', 'carol@ubc.ca', 'dan@ubc.ca']
const FROM = '2026-10-01T17:03:00.000Z'
const TO = '2026-10-01T17:07:00.000Z'

const context = (patch: Partial<Parameters<typeof emailsFor>[1]> = {}) => ({
  app: APP,
  members: MEMBERS,
  origin: ORIGIN,
  at: FROM,
  id: 'e0000001',
  ...patch,
})

const sentTo = (outgoing: Outgoing[]) => outgoing.map((one) => one.key.recipient)

describe('emailsFor: who is emailed what (D3; Decisions 13 and 15)', () => {
  const cases: [Happening, EmailKind | null, string[], string][] = [
    [
      { kind: 'change-failed', incidentId: INC, releaseId: R1 },
      'trouble',
      OWNERS,
      `${P}:e0000001`,
    ],
    [{ kind: 'unreachable', from: FROM }, 'trouble', OWNERS, `${P}:outage:${FROM}`],
    [
      { kind: 'answering-again', from: FROM, to: TO },
      'trouble',
      OWNERS,
      `${P}:answering:${FROM}`,
    ],
    [{ kind: 'signed-off', releaseId: R1 }, 'over', OWNERS, `${P}:e0000001`],
    [{ kind: 'turned-down', releaseId: R1 }, 'over', OWNERS, `${P}:e0000001`],
    [{ kind: 'dry-run', passed: true }, 'over', OWNERS, `${P}:e0000001`],
    [{ kind: 'dry-run', passed: false }, 'over', OWNERS, `${P}:e0000001`],
    [
      { kind: 'answered', by: 'identity', state: 'active' },
      'over',
      OWNERS,
      `${P}:e0000001`,
    ],
    [
      { kind: 'answered', by: 'privacy', state: 'approved' },
      'over',
      OWNERS,
      `${P}:e0000001`,
    ],
    // Nobody is emailed about what they did themselves, nor about themselves.
    [
      {
        kind: 'member-added',
        userId: BOB,
        role: 'collaborator',
        previousRole: null,
        by: ALICE,
      },
      'people',
      ['carol@ubc.ca', 'dan@ubc.ca'],
      `${P}:e0000001`,
    ],
    [
      {
        kind: 'member-added',
        userId: CAROL,
        role: 'owner',
        previousRole: 'collaborator',
        by: ALICE,
      },
      'people',
      ['dan@ubc.ca'],
      `${P}:e0000001`,
    ],
    [
      { kind: 'member-removed', userId: BOB, by: CAROL },
      'people',
      ['alice@ubc.ca', 'dan@ubc.ca'],
      `${P}:e0000001`,
    ],
    [
      { kind: 'member-removed', userId: STRANGER, by: null },
      'people',
      OWNERS,
      `${P}:e0000001`,
    ],
    [{ kind: 'went-live', instanceId: I1 }, null, [], ''],
    [{ kind: 'reached-students', instanceId: I1, releaseId: R1 }, null, [], ''],
    [{ kind: 'sent', to: 'identity' }, null, [], ''],
    [{ kind: 'sent', to: 'privacy' }, null, [], ''],
    [{ kind: 'switched-off', by: ALICE }, null, [], ''],
    [{ kind: 'switched-on', by: ALICE }, null, [], ''],
    [{ kind: 'renamed', from: 'a', to: 'b', by: ALICE }, null, [], ''],
  ]

  it.each(cases)('%j → %s', (happening, kind, recipients, key) => {
    const outgoing = emailsFor(happening, context())
    expect(sentTo(outgoing)).toEqual(recipients)
    for (const one of outgoing) {
      expect(one.key.kind).toBe(kind)
      expect(one.key.happening).toBe(key)
    }
  })

  it('a change that did not go live, before the first launch, emails nobody (Decision 15)', () => {
    const happening: Happening = { kind: 'change-failed', incidentId: INC, releaseId: R1 }
    expect(emailsFor(happening, context({ app: { ...APP, launchedAt: null } }))).toEqual(
      [],
    )
  })

  it('an owner with no address is skipped, and the rest are still emailed', () => {
    const members = MEMBERS.map((member) =>
      member.userId === CAROL ? { ...member, email: '' } : member,
    )
    expect(
      sentTo(emailsFor({ kind: 'signed-off', releaseId: R1 }, context({ members }))),
    ).toEqual(['alice@ubc.ca', 'dan@ubc.ca'])
  })
})

const conversation: Conversation = {
  id: 'c0000000-0000-4000-8000-000000000001',
  personId: ALICE,
  projectId: P,
  title: 'Add a word count',
  state: 'built',
  description: 'Add a word count to each response.',
  createdAt: '2026-09-29T16:00:00.000Z',
  updatedAt: '2026-09-30T16:00:00.000Z',
}
const waiting = (why: Parameters<typeof waitingEmail>[0]) =>
  waitingEmail(why, {
    app: APP,
    conversation,
    to: 'alice@ubc.ca',
    origin: ORIGIN,
    key: `${P}:k`,
  })

/** One of every email, with the page it must link to. */
const every: [string, Outgoing, string][] = [
  ...(
    [
      [{ kind: 'change-failed', incidentId: INC, releaseId: R1 }, ''],
      [{ kind: 'unreachable', from: FROM }, ''],
      [{ kind: 'answering-again', from: FROM, to: TO }, ''],
      [{ kind: 'signed-off', releaseId: R1 }, '/going-live'],
      [{ kind: 'turned-down', releaseId: R1 }, '/going-live'],
      [{ kind: 'dry-run', passed: true }, '/going-live'],
      [{ kind: 'dry-run', passed: false }, '/going-live'],
      [{ kind: 'answered', by: 'identity', state: 'active' }, '/going-live'],
      [{ kind: 'answered', by: 'identity', state: 'change_requested' }, '/going-live'],
      [{ kind: 'answered', by: 'identity', state: 'expired' }, '/going-live'],
      [{ kind: 'answered', by: 'privacy', state: 'approved' }, '/going-live'],
      [{ kind: 'answered', by: 'privacy', state: 'draft' }, '/going-live'],
      [
        {
          kind: 'member-added',
          userId: BOB,
          role: 'collaborator',
          previousRole: null,
          by: CAROL,
        },
        '',
      ],
      [
        {
          kind: 'member-added',
          userId: BOB,
          role: 'owner',
          previousRole: 'collaborator',
          by: null,
        },
        '',
      ],
      [{ kind: 'member-removed', userId: BOB, by: CAROL }, ''],
    ] as [Happening, string][]
  ).map(([happening, page]): [string, Outgoing, string] => [
    happening.kind,
    emailsFor(happening, context())[0]!,
    `${ORIGIN}/apps/reading-responses${page}`,
  ]),
  ...(['finished', 'needs-you', 'a-day'] as const).map(
    (why): [string, Outgoing, string] => [
      why,
      waiting(why),
      `${ORIGIN}/apps/reading-responses/conversations/${conversation.id}`,
    ],
  ),
]

describe('the words: plain text in our words (C3)', () => {
  it.each(every)(
    '%s: the app first, one link to its page, no machinery, and why you got it',
    (_, one, link) => {
      expect(one.subject.startsWith('Reading responses')).toBe(true)
      expect(one.text.match(/https?:\/\//g)).toHaveLength(1)
      expect(one.text).toContain(link)
      expect(one.text.split('\n').at(-1)).toMatch(/^You're getting this because you /)
      expect(machineryIn(`${one.subject}\n${one.text.replace(link, '')}`)).toEqual([])
      for (const id of [INC, R1, I1, P, ALICE, BOB, CAROL])
        expect(one.text).not.toContain(id)
    },
  )

  it('an owner reads why they got it; the person whose work it is reads theirs', () => {
    expect(emailsFor({ kind: 'signed-off', releaseId: R1 }, context())[0]!.text).toMatch(
      /You're getting this because you own Reading responses on Manifest\.$/,
    )
    expect(waiting('finished').text).toMatch(
      /You're getting this because you asked us to work on Reading responses\.$/,
    )
  })

  it('times are Vancouver’s; an outage says how long it was down', () => {
    expect(emailsFor({ kind: 'unreachable', from: FROM }, context())[0]!.text).toContain(
      'since 10:03am',
    )
    const again = emailsFor(
      { kind: 'answering-again', from: FROM, to: TO },
      context(),
    )[0]!
    expect(again.text).toContain('since 10:07am')
    expect(again.text).toContain('It was down for 4 minutes.')
    const long = emailsFor(
      { kind: 'answering-again', from: FROM, to: '2026-10-01T18:04:00.000Z' },
      context(),
    )[0]!
    expect(long.text).toContain('It was down for 1 hour and 1 minute.')
  })

  it('the subjects, as Rich was shown them', () => {
    const subject = (happening: Happening) => emailsFor(happening, context())[0]!.subject
    expect(subject({ kind: 'change-failed', incidentId: INC, releaseId: R1 })).toBe(
      "Reading responses: a change didn't go live",
    )
    expect(subject({ kind: 'unreachable', from: FROM })).toBe(
      "Reading responses: your students can't reach it",
    )
    expect(subject({ kind: 'answering-again', from: FROM, to: TO })).toBe(
      'Reading responses is answering again',
    )
    expect(subject({ kind: 'signed-off', releaseId: R1 })).toBe(
      'Reading responses: signed off',
    )
    expect(subject({ kind: 'turned-down', releaseId: R1 })).toBe(
      'Reading responses: not signed off',
    )
    expect(subject({ kind: 'dry-run', passed: true })).toBe(
      'Reading responses: the dry run worked',
    )
    expect(subject({ kind: 'dry-run', passed: false })).toBe(
      "Reading responses: the dry run didn't sign anyone in",
    )
    expect(subject({ kind: 'answered', by: 'identity', state: 'active' })).toBe(
      "Reading responses: UBC's identity team answered",
    )
    expect(subject({ kind: 'answered', by: 'privacy', state: 'approved' })).toBe(
      "Reading responses: UBC's Privacy Office answered",
    )
    expect(waiting('finished').subject).toBe("Reading responses: we've finished")
    expect(waiting('needs-you').subject).toBe('Reading responses: we need you')
    expect(waiting('a-day').subject).toBe('Reading responses: still waiting for you')
  })

  it('people are named by the kept members; one we do not keep is someone', () => {
    const added = emailsFor(
      {
        kind: 'member-added',
        userId: BOB,
        role: 'collaborator',
        previousRole: null,
        by: CAROL,
      },
      context(),
    )[0]!
    expect(added.subject).toBe('Reading responses: Bob Helper was added')
    expect(added.text).toContain('Carol Owner added Bob Helper')
    const promoted = emailsFor(
      {
        kind: 'member-added',
        userId: BOB,
        role: 'owner',
        previousRole: 'collaborator',
        by: STRANGER,
      },
      context(),
    )[0]!
    expect(promoted.subject).toBe('Reading responses: Bob Helper is now an owner')
    expect(promoted.text).toContain('Someone made Bob Helper an owner')
    const removed = emailsFor(
      { kind: 'member-removed', userId: STRANGER, by: null },
      context(),
    )[0]!
    expect(removed.subject).toBe('Reading responses: someone was taken off it')
  })

  // Rich's word, 2026-10-02: the bodies as written, with three tidy-ups (A, B and C).
  it('A and B: never "<app>\'s", and every time carries its day, Vancouver’s', () => {
    const body = (happening: Happening) =>
      emailsFor(happening, context())[0]!.text.split('\n')[0]
    expect(body({ kind: 'answered', by: 'identity', state: 'change_requested' })).toBe(
      "UBC's identity team asked for a change to the request for Reading responses. Going live has the rest:",
    )
    expect(body({ kind: 'answered', by: 'privacy', state: 'approved' })).toBe(
      "UBC's Privacy Office approved the privacy assessment for Reading responses. Going live has the rest:",
    )
    expect(body({ kind: 'answered', by: 'privacy', state: 'draft' })).toBe(
      "UBC's Privacy Office answered about the privacy assessment for Reading responses. Going live has the rest:",
    )
    for (const [, one] of every) expect(one.text).not.toContain("Reading responses's")
    expect(body({ kind: 'change-failed', incidentId: INC, releaseId: R1 })).toBe(
      "A change to Reading responses didn't go live, at 10:03am on 1 October. Nobody has lost anything: your students still have the version from before. You can give it to your agent from its page:",
    )
    expect(body({ kind: 'unreachable', from: FROM })).toBe(
      "Your students can't reach Reading responses, since 10:03am on 1 October. We can see that, not why. Starting it again usually fixes it, and you can do that from its page:",
    )
    expect(body({ kind: 'answering-again', from: FROM, to: TO })).toBe(
      'Reading responses is answering again, since 10:07am on 1 October. It was down for 4 minutes. What happened is on its page:',
    )
    // The day is Vancouver's, as the clock is: 02:00Z on 2 October is 7:00pm on 1 October there.
    expect(body({ kind: 'unreachable', from: '2026-10-02T02:00:00.000Z' })).toContain(
      'since 7:00pm on 1 October.',
    )
  })

  it('C: when we can name neither person, the body says what happened, never "someone … someone"', () => {
    const body = (happening: Happening) =>
      emailsFor(happening, context())[0]!.text.split('\n')[0]
    expect(
      body({
        kind: 'member-added',
        userId: STRANGER,
        role: 'collaborator',
        previousRole: null,
        by: null,
      }),
    ).toBe(
      "Someone was added to Reading responses, as a helper. Who's on it is on its page:",
    )
    expect(
      body({
        kind: 'member-added',
        userId: STRANGER,
        role: 'owner',
        previousRole: 'collaborator',
        by: null,
      }),
    ).toBe(
      "Someone is now an owner of Reading responses. They were a helper. Who's on it is on its page:",
    )
    expect(body({ kind: 'member-removed', userId: STRANGER, by: null })).toBe(
      "Someone was taken off Reading responses. Who's on it is on its page:",
    )
    // One of them named: as before.
    expect(body({ kind: 'member-removed', userId: BOB, by: null })).toBe(
      "Someone took Bob Helper off Reading responses. Who's on it is on its page:",
    )
    expect(body({ kind: 'member-removed', userId: STRANGER, by: CAROL })).toBe(
      "Carol Owner took someone off Reading responses. Who's on it is on its page:",
    )
  })

  it('waitingEmail is the person’s, keyed as asked', () => {
    expect(waiting('needs-you').key).toEqual({
      kind: 'waiting',
      happening: `${P}:k`,
      recipient: 'alice@ubc.ca',
    })
  })
})
