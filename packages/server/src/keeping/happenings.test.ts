import { describe, expect, it } from 'vitest'
import type { Happening } from '../api/progress.js'
import type { HistoryEntry, KeptMember } from '../store/keeping.js'
import {
  fromOf,
  gapsOf,
  happeningOf,
  linesOf,
  questionsOf,
  tokenEndsOf,
} from './happenings.js'

/**
 * F6 TASK 4: WHAT HAPPENED, AS A PERSON READS IT. `history` keeps each event as the platform sent
 * it (Decision 1); `happeningOf` reads one into a typed happening, and `linesOf` chooses the lines
 * (Decision 2). Every `machineDetail` here is as sitting 1 measured it on 7100 (M2), or, where
 * nothing made one, as the platform's own examples write it (`observability/examples.ts`).
 */
const P = '11111111-1111-4111-8111-111111111111'
const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const STRANGER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const R1 = 'r1000000-0000-4000-8000-000000000001'
const R2 = 'r2000000-0000-4000-8000-000000000002'
const I_DRY = 'i0000000-0000-4000-8000-0000000000d1'
const I1 = 'i1000000-0000-4000-8000-000000000001'
const I2 = 'i2000000-0000-4000-8000-000000000002'
const I3 = 'i3000000-0000-4000-8000-000000000003'
const INC = 'n1000000-0000-4000-8000-000000000001'

let counter = 0
const entry = (
  type: string,
  detail: unknown,
  at = '2026-10-01T17:00:00.000Z',
): HistoryEntry => ({
  id: `e${++counter}`,
  projectId: P,
  at,
  type,
  detail,
})

const healthy = (environment: string, instanceId: string, releaseId: string) => ({
  state: 'healthy',
  releaseId,
  instanceId,
  environment,
  environmentId: 'env-1',
})

const MEMBERS: KeptMember[] = [
  { userId: ALICE, role: 'owner', displayName: 'Alice Owner', email: 'alice@ubc.ca' },
  { userId: BOB, role: 'collaborator', displayName: 'Bob Helper', email: 'bob@ubc.ca' },
]

describe('happeningOf: an entry, as the platform sent it, read into what happened', () => {
  const cases: [string, unknown, Happening | null][] = [
    [
      'project.launched',
      { releaseId: R1, instanceId: I1, imageDigest: 'sha256:0123456789ab' },
      { kind: 'went-live', instanceId: I1 },
    ],
    [
      'instance.healthy',
      healthy('production', I1, R1),
      { kind: 'reached-students', instanceId: I1, releaseId: R1 },
    ],
    ['instance.healthy', healthy('staging', I1, R1), null],
    ['instance.healthy', healthy('sandbox', I1, R1), null],
    [
      'incident.opened',
      { incidentId: INC, instanceId: I1, releaseId: R1, environment: 'production' },
      { kind: 'change-failed', incidentId: INC, releaseId: R1 },
    ],
    [
      'incident.opened',
      { incidentId: INC, instanceId: I1, releaseId: R1, environment: 'staging' },
      null,
    ],
    [
      'release.approved',
      { decision: 'approved', releaseId: R1, imageDigest: 'sha256:0123456789ab' },
      { kind: 'signed-off', releaseId: R1 },
    ],
    [
      'release.approval_rejected',
      { decision: 'rejected', releaseId: R1, imageDigest: 'sha256:0123456789ab' },
      { kind: 'turned-down', releaseId: R1 },
    ],
    [
      'rehearsal.completed',
      { passed: true, releaseId: R1, rehearsalId: 'h1', attributeCount: 2 },
      { kind: 'dry-run', passed: true },
    ],
    [
      'rehearsal.completed',
      { passed: false, releaseId: R1, rehearsalId: 'h1', attributeCount: 2 },
      { kind: 'dry-run', passed: false },
    ],
    [
      'iam_registration.submitted',
      { environment: 'staging', sentAt: '2026-09-29', externalTicketRef: null },
      { kind: 'sent', to: 'identity' },
    ],
    [
      'privacy_assessment.submitted',
      { sentAt: '2026-09-22', externalTicketRef: 'PIA-2026-0088' },
      { kind: 'sent', to: 'privacy' },
    ],
    [
      'iam_registration.recorded',
      {
        state: 'active',
        entityId: 'https://manifest.internal/sp/f6-watch/production',
        environment: 'production',
        attributeCount: 2,
        externalTicketRef: 'IAM-1',
      },
      { kind: 'answered', by: 'identity', state: 'active' },
    ],
    [
      'iam_registration.recorded',
      { state: 'change_requested', environment: 'production', externalTicketRef: null },
      { kind: 'answered', by: 'identity', state: 'change_requested' },
    ],
    [
      'privacy_assessment.recorded',
      { state: 'approved', externalTicketRef: 'PIA-1' },
      { kind: 'answered', by: 'privacy', state: 'approved' },
    ],
    // An administrator recording that it was SENT is not UBC answering: no long wait is over.
    [
      'iam_registration.recorded',
      { state: 'submitted', environment: 'staging', externalTicketRef: 'IAM-1' },
      { kind: 'sent', to: 'identity' },
    ],
    [
      'privacy_assessment.recorded',
      { state: 'submitted', externalTicketRef: 'PIA-1' },
      { kind: 'sent', to: 'privacy' },
    ],
    // The member is `memberId`; `userId` is who acted (the platform's examples).
    [
      'member.added',
      {
        memberId: BOB,
        role: 'collaborator',
        previousRole: null,
        via: 'session',
        userId: ALICE,
        tokenId: null,
      },
      {
        kind: 'member-added',
        userId: BOB,
        role: 'collaborator',
        previousRole: null,
        by: ALICE,
      },
    ],
    [
      'member.added',
      {
        memberId: BOB,
        role: 'owner',
        previousRole: 'collaborator',
        via: 'session',
        userId: ALICE,
      },
      {
        kind: 'member-added',
        userId: BOB,
        role: 'owner',
        previousRole: 'collaborator',
        by: ALICE,
      },
    ],
    [
      'member.removed',
      {
        memberId: BOB,
        tokensRevoked: 1,
        sessionsEnded: 1,
        via: 'session',
        userId: ALICE,
        tokenId: null,
      },
      { kind: 'member-removed', userId: BOB, by: ALICE },
    ],
    [
      'project.archived',
      { via: 'session', userId: ALICE, tokenId: null },
      { kind: 'switched-off', by: ALICE },
    ],
    [
      'project.restored',
      { via: 'session', userId: BOB, tokenId: null },
      { kind: 'switched-on', by: BOB },
    ],
    [
      'project.renamed',
      {
        from: 'f6-watch',
        to: 'Reading responses',
        via: 'session',
        userId: ALICE,
        tokenId: null,
      },
      { kind: 'renamed', from: 'f6-watch', to: 'Reading responses', by: ALICE },
    ],
    // Who acted is read where it is; an action with none (an administrator's, say) is nobody's.
    ['project.archived', {}, { kind: 'switched-off', by: null }],
    [
      'keeping.unreachable',
      { from: '2026-10-01T17:03:00.000Z' },
      { kind: 'unreachable', from: '2026-10-01T17:03:00.000Z' },
    ],
    [
      'keeping.answering',
      { from: '2026-10-01T17:03:00.000Z', to: '2026-10-01T17:07:00.000Z' },
      {
        kind: 'answering-again',
        from: '2026-10-01T17:03:00.000Z',
        to: '2026-10-01T17:07:00.000Z',
      },
    ],
    // Never a line: machinery, drafts, sign-on, our own bookkeeping, and what a newer contract adds.
    [
      'iam_registration.drafted',
      { environment: 'staging', entityId: 'x', fromCommit: 'abc', attributeCount: 2 },
      null,
    ],
    ['privacy_assessment.drafted', {}, null],
    ['sso.registered', { environment: 'production' }, null],
    ['build.succeeded', { buildId: 'b1' }, null],
    ['build.started', { buildId: 'b1' }, null],
    ['token.minted', { tokenId: 't1' }, null],
    ['instance.retired', { instanceId: I1 }, null],
    [
      'keeping.gap',
      { from: '2026-10-01T10:00:00.000Z', to: '2026-10-02T10:00:00.000Z' },
      null,
    ],
    ['keeping.stopped', {}, null],
    ['approval.requested', { releaseId: R1 }, null],
    ['project.deleted', { via: 'session', userId: ALICE, tokenId: null }, null],
    // A detail missing what the happening needs is no happening, never a crash.
    ['project.launched', {}, null],
    ['instance.healthy', null, null],
    ['instance.healthy', { environment: 'production', instanceId: I1 }, null],
    ['incident.opened', { environment: 'production', releaseId: R1 }, null],
    ['release.approved', 'not an object', null],
    ['rehearsal.completed', { passed: 'yes' }, null],
    ['iam_registration.recorded', { environment: 'production' }, null],
    ['member.added', { memberId: BOB, role: 'administrator', userId: ALICE }, null],
    ['member.added', { role: 'owner', previousRole: null, userId: ALICE }, null],
    ['member.removed', { userId: ALICE }, null],
    ['project.renamed', { from: 'a' }, null],
    ['keeping.unreachable', {}, null],
    ['keeping.answering', { from: '2026-10-01T17:03:00.000Z' }, null],
  ]

  it.each(cases)('%s %j', (type, detail, want) => {
    expect(happeningOf(entry(type, detail))).toEqual(want)
  })

  it('member.added with no previousRole field reads it as a first addition', () => {
    expect(
      happeningOf(entry('member.added', { memberId: BOB, role: 'owner', userId: ALICE })),
    ).toEqual({
      kind: 'member-added',
      userId: BOB,
      role: 'owner',
      previousRole: null,
      by: ALICE,
    })
  })
})

describe('linesOf: Decision 2, the lines chosen when read', () => {
  const at = (minute: number) =>
    `2026-10-01T17:${String(minute).padStart(2, '0')}:00.000Z`
  const LAUNCHED_AT = at(10)

  /**
   * A first launch as sitting 1 measured it (M0, M2): the dry run's production instance healthy,
   * then retired; the launch's own instance healthy; then `project.launched` with that instance.
   */
  const launch = (): HistoryEntry[] => [
    entry(
      'rehearsal.completed',
      { passed: true, releaseId: R1, rehearsalId: 'h1' },
      at(1),
    ),
    entry('instance.healthy', healthy('production', I_DRY, R1), at(2)),
    entry('instance.retired', { instanceId: I_DRY }, at(3)),
    entry('release.approved', { decision: 'approved', releaseId: R1 }, at(5)),
    entry('instance.healthy', healthy('production', I1, R1), at(9)),
    entry('project.launched', { releaseId: R1, instanceId: I1 }, LAUNCHED_AT),
  ]

  const kinds = (lines: { happening: Happening }[]) =>
    lines.map((line) => line.happening.kind)

  it("the dry run's production instance before the launch is no line; the launch is one line, went live", () => {
    expect(kinds(linesOf(launch(), MEMBERS, LAUNCHED_AT))).toEqual([
      'went-live',
      'signed-off',
      'dry-run',
    ])
  })

  it("the launch's own healthy is not also a new version, whichever event is held first", () => {
    const entries = [
      entry('project.launched', { releaseId: R1, instanceId: I1 }, at(10)),
      entry('instance.healthy', healthy('production', I1, R1), at(10)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, LAUNCHED_AT))).toEqual(['went-live'])
  })

  it('a later production healthy with a new release is a new version reaching the students', () => {
    const lines = linesOf(
      [...launch(), entry('instance.healthy', healthy('production', I2, R2), at(30))],
      MEMBERS,
      LAUNCHED_AT,
    )
    expect(lines[0]).toEqual({
      id: expect.any(String),
      at: at(30),
      happening: { kind: 'reached-students', instanceId: I2, releaseId: R2 },
      who: null,
      whom: null,
      administrator: null,
    })
  })

  it('a production healthy with the same release as the one before it is a restart: no line', () => {
    const entries = [
      ...launch(),
      entry('instance.healthy', healthy('production', I2, R1), at(30)),
      entry('instance.healthy', healthy('production', I3, R2), at(40)),
      entry('instance.healthy', healthy('production', I2, R2), at(50)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, LAUNCHED_AT))).toEqual([
      'reached-students',
      'went-live',
      'signed-off',
      'dry-run',
    ])
    expect(linesOf(entries, MEMBERS, LAUNCHED_AT)[0]?.at).toBe(at(40))
  })

  it("staging's healthy is never a line", () => {
    const entries = [
      ...launch(),
      entry('instance.healthy', healthy('staging', I2, R2), at(30)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, LAUNCHED_AT))).toEqual([
      'went-live',
      'signed-off',
      'dry-run',
    ])
  })

  it('a second dry run, of a changed version, before the launch is still no new version', () => {
    const entries = [
      entry('instance.healthy', healthy('production', I_DRY, R1), at(2)),
      entry('instance.healthy', healthy('production', I2, R2), at(20)),
    ]
    expect(linesOf(entries, MEMBERS, null)).toEqual([])
  })

  it("the launch held and its own healthy fallen outside the replay: the launch's release is the one before", () => {
    const entries = [
      entry('project.launched', { releaseId: R1, instanceId: I1 }, at(10)),
      entry('instance.healthy', healthy('production', I2, R2), at(30)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, LAUNCHED_AT))).toEqual([
      'reached-students',
      'went-live',
    ])
  })

  it('an app that never launched has no new versions and no failed changes on the live address', () => {
    const entries = [
      entry('instance.healthy', healthy('production', I_DRY, R1), at(2)),
      entry(
        'incident.opened',
        { incidentId: INC, releaseId: R1, environment: 'production' },
        at(4),
      ),
      entry('rehearsal.completed', { passed: false, releaseId: R1 }, at(5)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, null))).toEqual(['dry-run'])
  })

  it('after the launch, a change that failed on the live address is a line', () => {
    const entries = [
      ...launch(),
      entry(
        'incident.opened',
        { incidentId: INC, releaseId: R2, environment: 'production' },
        at(30),
      ),
    ]
    expect(linesOf(entries, MEMBERS, LAUNCHED_AT)[0]?.happening).toEqual({
      kind: 'change-failed',
      incidentId: INC,
      releaseId: R2,
    })
  })

  /**
   * The replay is the newest 50 (FE-7): a watch begun long after the launch holds no
   * `project.launched`, and the kept app's `launchedAt` says it went live before what we hold.
   * Its first production healthy, with no release held before it, may be a restart: no line.
   */
  it('a watch begun after the launch: the kept launchedAt anchors it, and a release before is needed', () => {
    const entries = [
      entry('instance.healthy', healthy('production', I2, R1), at(30)),
      entry('instance.healthy', healthy('production', I3, R2), at(40)),
    ]
    expect(kinds(linesOf(entries, MEMBERS, LAUNCHED_AT))).toEqual(['reached-students'])
    expect(linesOf(entries, MEMBERS, LAUNCHED_AT)[0]?.at).toBe(at(40))
  })

  it('who acted, and to whom, by the kept members; an id we do not keep is nobody named', () => {
    const entries = [
      entry(
        'member.added',
        { memberId: BOB, role: 'collaborator', previousRole: null, userId: ALICE },
        at(1),
      ),
      entry('project.archived', { via: 'session', userId: STRANGER }, at(2)),
      entry('member.removed', { memberId: STRANGER, userId: BOB }, at(3)),
      entry('release.approved', { decision: 'approved', releaseId: R1 }, at(4)),
    ]
    const lines = linesOf(entries, MEMBERS, null)
    expect(lines.map(({ who, whom }) => ({ who, whom }))).toEqual([
      { who: null, whom: null },
      { who: 'Bob Helper', whom: null },
      { who: null, whom: null },
      { who: 'Alice Owner', whom: 'Bob Helper' },
    ])
  })

  it('newest first, each line its own entry id and time', () => {
    const entries = [
      entry('project.renamed', { from: 'a', to: 'b', userId: ALICE }, at(1)),
      entry('keeping.unreachable', { from: at(20) }, at(20)),
      entry('keeping.answering', { from: at(20), to: at(25) }, at(25)),
    ]
    const lines = linesOf(entries, MEMBERS, null)
    expect(lines.map((line) => [line.id, line.at])).toEqual([
      [entries[2]!.id, at(25)],
      [entries[1]!.id, at(20)],
      [entries[0]!.id, at(1)],
    ])
  })
})

describe('linesOf: a platform administrator who is not a member (the adoption note’s question 10, EventFrame.actor)', () => {
  const at = (hour: number, minute: number) =>
    `2026-10-01T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
  const OPERATOR = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const asAdministrator = (reason: string, name = 'Operator One') => ({
    name,
    asAdministrator: true,
    reason,
    token: null,
  })
  const LEAK = 'Rotating a key that leaked'
  const by = (
    type: string,
    detail: unknown,
    when: string,
    actor: unknown = asAdministrator(LEAK),
  ): HistoryEntry => ({ ...entry(type, detail, when), actor })
  const administrator = (reason = LEAK, name = 'Operator One') => ({ name, reason })

  it('a line that says who acted (switched off, someone taken off) names the administrator as the platform does, and their reason; who stays the kept members’', () => {
    const entries = [
      by('project.archived', { via: 'session', userId: OPERATOR }, at(17, 1)),
      by('member.removed', { memberId: BOB, userId: OPERATOR }, at(17, 2), {
        ...asAdministrator('Bob asked to leave'),
      }),
    ]
    expect(linesOf(entries, MEMBERS, null)).toEqual([
      {
        id: entries[1]!.id,
        at: at(17, 2),
        happening: { kind: 'member-removed', userId: BOB, by: OPERATOR },
        who: null,
        whom: 'Bob Helper',
        administrator: administrator('Bob asked to leave'),
      },
      {
        id: entries[0]!.id,
        at: at(17, 1),
        happening: { kind: 'switched-off', by: OPERATOR },
        who: null,
        whom: null,
        administrator: administrator(),
      },
    ])
  })

  it('an act no line says (a secret set, an agent let in): one line of its own, the administrator worked on it, and why', () => {
    const set = by(
      'app_secret.set',
      { name: 'API_KEY', environment: 'production' },
      at(17, 1),
    )
    expect(linesOf([set], MEMBERS, null)).toEqual([
      {
        id: `${set.id}:administrator`,
        at: at(17, 1),
        happening: { kind: 'worked-on' },
        who: null,
        whom: null,
        administrator: administrator(),
      },
    ])
  })

  it('one act’s later events (the same administrator and reason, within the hour of the last) are that one line; another reason, another administrator, or an hour on, is another', () => {
    const entries = [
      by('instance.provisioning', { environment: 'staging' }, at(17, 1)),
      by('instance.starting', { environment: 'staging' }, at(17, 3)),
      by('instance.healthy', healthy('staging', I1, R1), at(17, 50)),
      by('build.started', {}, at(18, 45)),
      by('app_secret.set', { name: 'API_KEY' }, at(18, 46), asAdministrator('A new key')),
      by(
        'app_secret.set',
        { name: 'API_KEY' },
        at(18, 47),
        asAdministrator(LEAK, 'Operator Two'),
      ),
      by('build.succeeded', {}, at(19, 46)),
    ]
    const lines = linesOf(entries, MEMBERS, null)
    expect(
      lines.map((line) => [line.at, line.happening.kind, line.administrator]),
    ).toEqual([
      [at(19, 46), 'worked-on', administrator()],
      [at(18, 47), 'worked-on', administrator(LEAK, 'Operator Two')],
      [at(18, 46), 'worked-on', administrator('A new key')],
      [at(17, 1), 'worked-on', administrator()],
    ])
  })

  it('a line that says who acted begins its act: what follows from it, the same administrator and reason, is that line', () => {
    const entries = [
      by('project.archived', { via: 'session', userId: OPERATOR }, at(17, 1)),
      by('instance.retiring', { instanceId: I1 }, at(17, 2)),
      by('instance.retired', { instanceId: I1 }, at(17, 4)),
    ]
    expect(linesOf(entries, MEMBERS, null).map((line) => line.happening.kind)).toEqual([
      'switched-off',
    ])
  })

  it('a line said whoever acted (a new version reached the students) stays as it is; the administrator’s act is its own line, said first', () => {
    const entries = [
      entry('project.launched', { releaseId: R1, instanceId: I1 }, at(17, 0)),
      by('instance.healthy', healthy('production', I2, R2), at(17, 30)),
    ]
    const lines = linesOf(entries, MEMBERS, at(17, 0))
    expect(
      lines.map((line) => [line.id, line.happening.kind, line.administrator]),
    ).toEqual([
      [entries[1]!.id, 'reached-students', null],
      [`${entries[1]!.id}:administrator`, 'worked-on', administrator()],
      [entries[0]!.id, 'went-live', null],
    ])
  })

  it('an administrator acting as a member, a person’s agent, or nobody: no administrator, and no line of their own', () => {
    const member = {
      name: 'Alice Owner',
      asAdministrator: false,
      reason: null,
      token: null,
    }
    const agent = {
      name: 'Operator One',
      asAdministrator: false,
      reason: null,
      token: { id: 't-1', name: 'Fixer' },
    }
    const entries = [
      by('project.archived', { via: 'session', userId: ALICE }, at(17, 1), member),
      by('app_secret.set', { name: 'API_KEY' }, at(17, 2), agent),
      by('app_secret.set', { name: 'API_KEY' }, at(17, 3), null),
    ]
    expect(linesOf(entries, MEMBERS, null)).toEqual([
      {
        id: entries[0]!.id,
        at: at(17, 1),
        happening: { kind: 'switched-off', by: ALICE },
        who: 'Alice Owner',
        whom: null,
        administrator: null,
      },
    ])
  })

  it('an actor sent wrongly (no reason, no name, not true, not an object) is no administrator, never a crash', () => {
    const entries = [
      by('app_secret.set', {}, at(17, 1), { ...asAdministrator(LEAK), reason: null }),
      by('app_secret.set', {}, at(17, 2), { ...asAdministrator(LEAK), reason: '' }),
      by('app_secret.set', {}, at(17, 3), { ...asAdministrator(LEAK), name: '' }),
      by('app_secret.set', {}, at(17, 4), {
        ...asAdministrator(LEAK),
        asAdministrator: 'yes',
      }),
      by('app_secret.set', {}, at(17, 5), 'Operator One'),
      by('app_secret.set', {}, at(17, 6), [asAdministrator(LEAK)]),
    ]
    expect(linesOf(entries, MEMBERS, null)).toEqual([])
  })

  it('an event kept before version 8, with no actor, says what it said', () => {
    const archived = entry(
      'project.archived',
      { via: 'session', userId: OPERATOR },
      at(17, 1),
    )
    expect(linesOf([archived], MEMBERS, null)).toEqual([
      {
        id: archived.id,
        at: at(17, 1),
        happening: { kind: 'switched-off', by: OPERATOR },
        who: null,
        whom: null,
        administrator: null,
      },
    ])
  })
})

describe('gapsOf and fromOf: what the history page says of itself', () => {
  it('gapsOf gives each gap the keeper recorded, as its detail says, oldest first', () => {
    const entries = [
      entry(
        'project.launched',
        { releaseId: R1, instanceId: I1 },
        '2026-09-18T16:00:00.000Z',
      ),
      entry(
        'keeping.gap',
        { from: '2026-10-02T09:00:00.000Z', to: '2026-10-05T12:00:00.000Z' },
        '2026-10-02T09:00:00.000Z',
      ),
      entry('keeping.gap', { from: 'not both' }, '2026-10-06T09:00:00.000Z'),
      entry(
        'keeping.gap',
        { from: '2026-10-07T09:00:00.000Z', to: '2026-10-08T09:00:00.000Z' },
        '2026-10-07T09:00:00.000Z',
      ),
    ]
    expect(gapsOf(entries)).toEqual([
      { from: '2026-10-02T09:00:00.000Z', to: '2026-10-05T12:00:00.000Z' },
      { from: '2026-10-07T09:00:00.000Z', to: '2026-10-08T09:00:00.000Z' },
    ])
  })

  it('fromOf is the first platform event held, never one of ours', () => {
    const entries = [
      entry('keeping.stopped', {}, '2026-09-17T09:00:00.000Z'),
      entry('build.succeeded', { buildId: 'b1' }, '2026-09-18T16:00:00.000Z'),
      entry(
        'project.launched',
        { releaseId: R1, instanceId: I1 },
        '2026-09-19T16:00:00.000Z',
      ),
    ]
    expect(fromOf(entries)).toBe('2026-09-18T16:00:00.000Z')
    expect(fromOf([entry('keeping.gap', { from: 'a', to: 'b' })])).toBeNull()
    expect(fromOf([])).toBeNull()
  })
})

describe('questionsOf: their agent’s questions still waiting (F6b Task 12, Decision 14)', () => {
  const Q1 = 'q1000000-0000-4000-8000-000000000001'
  const Q2 = 'q2000000-0000-4000-8000-000000000002'
  const T1 = 't1000000-0000-4000-8000-000000000001'
  const AT = '2026-10-03T17:00:00.000Z'
  const asked = (id: string, at = AT, action = 'members:manage') =>
    entry('pending_action.created', { pendingActionId: id, tokenId: T1, action }, at)
  const answered = (type: string, id: string) =>
    entry(type, { pendingActionId: id, tokenId: T1, action: 'members:manage' }, AT)
  const soon = Date.parse('2026-10-03T18:00:00.000Z')

  it('a question asked is waiting for a day: its expiry the moment it was heard plus 24 hours (S1: M4)', () => {
    expect(questionsOf([asked(Q1)], soon)).toEqual([
      {
        pendingActionId: Q1,
        tokenId: T1,
        action: 'members:manage',
        at: AT,
        expiresAt: '2026-10-04T17:00:00.000Z',
      },
    ])
  })

  it.each([
    'pending_action.confirmed',
    'pending_action.rejected',
    'pending_action.expired',
  ])('%s for it: no longer waiting; another’s answer changes nothing', (type) => {
    expect(questionsOf([asked(Q1), asked(Q2), answered(type, Q1)], soon)).toEqual([
      expect.objectContaining({ pendingActionId: Q2 }),
    ])
  })

  it('pending_action.expired as the platform sends it (FE-52: cause and by, a person’s act on its token): no longer waiting, whatever the cause', () => {
    for (const cause of ['token_revoked', 'member_removed', 'project_archived'])
      expect(
        questionsOf(
          [
            asked(Q1),
            entry(
              'pending_action.expired',
              {
                pendingActionId: Q1,
                tokenId: T1,
                action: 'members:manage',
                cause,
                by: 'a0000000-0000-4000-8000-000000000001',
              },
              '2026-10-03T17:30:00.000Z',
            ),
          ],
          soon,
        ),
      ).toEqual([])
  })

  it('its token stopping sooner than its day: waiting until then, as the platform caps it (its faculty-ready Task 13)', () => {
    const ends = tokenEndsOf([
      { tokenId: T1, expiresAt: '2026-10-03T20:00:00.000Z' },
      { tokenId: 'other', expiresAt: null },
    ])
    expect(questionsOf([asked(Q1)], soon, ends)[0]?.expiresAt).toBe(
      '2026-10-03T20:00:00.000Z',
    )
    expect(
      questionsOf([asked(Q1)], Date.parse('2026-10-03T20:00:00.000Z'), ends),
    ).toEqual([])
    // A token that outlives the day changes nothing; one we do not know, nothing either.
    const later = tokenEndsOf([{ tokenId: T1, expiresAt: '2026-11-01T00:00:00.000Z' }])
    expect(questionsOf([asked(Q1)], soon, later)[0]?.expiresAt).toBe(
      '2026-10-04T17:00:00.000Z',
    )
    expect(questionsOf([asked(Q1)], soon, tokenEndsOf([]))[0]?.expiresAt).toBe(
      '2026-10-04T17:00:00.000Z',
    )
  })

  it('past its day, with no event: no longer waiting (Review Focus 5)', () => {
    expect(questionsOf([asked(Q1)], Date.parse('2026-10-04T17:00:00.000Z'))).toEqual([])
    expect(questionsOf([asked(Q1)], Date.parse('2026-10-04T16:59:59.000Z'))).toHaveLength(
      1,
    )
  })

  it('an action the platform adds later is still a question, by its name', () => {
    expect(questionsOf([asked(Q1, AT, 'payments:spend')], soon)[0]?.action).toBe(
      'payments:spend',
    )
  })

  it('a detail missing an id, or the action, is no question (never a crash)', () => {
    const broken = [
      entry('pending_action.created', { tokenId: T1, action: 'members:manage' }),
      entry('pending_action.created', { pendingActionId: Q1, action: 'members:manage' }),
      entry('pending_action.created', { pendingActionId: Q2, tokenId: T1 }),
      entry('pending_action.created', null),
    ]
    expect(questionsOf(broken, soon)).toEqual([])
  })

  it('is never a line of the history (what happened is the platform’s; a question is a need)', () => {
    expect(happeningOf(asked(Q1))).toBeNull()
  })
})
