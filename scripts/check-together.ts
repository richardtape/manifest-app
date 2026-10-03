/**
 * F6b'S ACCEPTANCE, HALF TWO (the plan's Task 13, Step 1): WORKING ON IT TOGETHER, IN-PROCESS. Our
 * real server (`buildServer`, every route and guard) and our real keeper (`createKeeper`, as
 * `main.ts` builds it) on our real store in a scratch file, asked by FOUR PEOPLE at once through
 * `inject`, each with their own session and our Origin, as their browsers would ask. The platform
 * is a pretend one: a `/v1/me` that knows the four by their sessions, on a port the OS picks (never
 * 7100–7199), and a scripted event stream driven by hand. Email is REAL, through our own mailer to
 * Mailpit, read back by this run's own mark and deleted after.
 *
 * Why in-process: since the platform's sitting 10 the mock trusts only the one session it issues
 * (FE-26), so no curl can be two people on it. Half one (`check-together.sh`) asks our running
 * server as the mock's one person, an owner; this half is everyone else.
 *
 *   pnpm exec tsx scripts/check-together.ts                      # half two
 *   pnpm exec tsx scripts/check-together.ts seed <file> <json>   # half one's: a colleague's work
 *   pnpm exec tsx scripts/check-together.ts forget <file> <projectId>
 *
 * Its negative controls are made by hand, each red on its own check (the sitting's entry): a
 * helper's write to another's allowed (`mayAct`), the re-read path removed (`keepMembers`), an
 * email to the helper (`questionEmails`).
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHub } from '../packages/server/src/api/events.js'
import { buildServer } from '../packages/server/src/app.js'
import { readConfig, type Config } from '../packages/server/src/config.js'
import { createKeeper } from '../packages/server/src/keeping/keeper.js'
import { smtpMailer } from '../packages/server/src/keeping/mail.js'
import { probeAddress } from '../packages/server/src/keeping/probe.js'
import { KEY_BYTES } from '../packages/server/src/keeping/seal.js'
import type {
  ProjectEvent,
  ProjectStream,
} from '../packages/server/src/platform/stream.js'
import type { Watching } from '../packages/server/src/platform/watching.js'
import {
  openStore,
  type Conversation,
  type Store,
} from '../packages/server/src/store/db.js'
import type { KeptApp, KeptMember } from '../packages/server/src/store/keeping.js'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')

// ---- half one's seeding: a colleague's work on the mock's app, through our store's own API ----

interface Seed {
  project: { id: string; name: string; slug: string }
  colleague: { id: string; displayName: string; email: string }
  /** An app we keep nobody for: the colleague's work there is a stranger's to anyone else. */
  elsewhere: string
  /** The person signed in, for their own change (half one's token hand-over). */
  me: { id: string; displayName: string; email: string }
}

/** A change on an app, planned and waiting for its yes: it holds the app (F4 Decision 5). */
function changeOf(
  store: Store,
  person: { id: string; displayName: string; email: string },
  project: Seed['project'],
  words: string,
): Conversation {
  store.rememberPerson(person)
  const made = store.createChange(person.id, project.id, words.replace(/\.$/, ''), words)
  store.addMessage(made.id, 'we', {
    kind: 'project',
    project: { ...project, blueprint: 'node-ts-mongo@1' },
  })
  store.addMessage(made.id, 'person', { kind: 'asked', change: 1, words, fix: null })
  return store.setState(made.id, 'plan-ready')
}

if (process.argv[2] === 'seed' || process.argv[2] === 'forget') {
  const [, , part, file, what] = process.argv
  if (file === undefined || what === undefined) {
    console.error('seed <file> <json>, or forget <file> <projectId>')
    process.exit(2)
  }
  const store = openStore(file)
  if (part === 'forget') store.forgetApp(what)
  else {
    const seed = JSON.parse(what) as Seed
    const theirs = changeOf(store, seed.colleague, seed.project, 'Show the week number.')
    const stranger = changeOf(
      store,
      seed.colleague,
      { id: seed.elsewhere, name: 'Somewhere else', slug: 'somewhere-else' },
      'Somewhere else entirely.',
    )
    const mine = changeOf(store, seed.me, seed.project, 'Hand its token over.')
    console.log(
      JSON.stringify({ theirs: theirs.id, stranger: stranger.id, mine: mine.id }),
    )
  }
  store.close()
  process.exit(0)
}

// ---- half two: who this run is, a mark in every name, address and session ----

const RUN = `tc${randomBytes(4).toString('hex')}`
const MAILPIT = process.env['MAILPIT'] ?? 'http://127.0.0.1:7112'
const ORIGIN = 'https://app.manifest.internal'
const SECOND = 1_000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const person = (name: string, role: KeptMember['role'] | null) => ({
  id: randomUUID(),
  displayName: `${name} ${RUN}`,
  email: `${name.toLowerCase()}.${RUN}@together-check.test`,
  role,
  session: `${name.toLowerCase()}-${RUN}`,
})
type Person = ReturnType<typeof person>
const ALICE = person('Alice', 'owner')
const BOB = person('Bob', 'owner')
const SAM = person('Sam', 'collaborator')
const DAN = person('Dan', 'collaborator')
/** Signed in, and a member of nothing here. */
const CAROL = person('Carol', null)
const PEOPLE = [ALICE, BOB, SAM, DAN, CAROL]
const kept = (p: Person): KeptMember => ({
  userId: p.id,
  role: p.role!,
  displayName: p.displayName,
  email: p.email,
})

let passed = 0
let failed = 0
const check = (n: number, name: string, good: boolean, detail: string) => {
  if (good) passed++
  else failed++
  console.log(`${good ? 'ok  ' : 'FAIL'} ${n}  ${name}${good ? '  ' : ': '}${detail}`)
}

// ---- a pretend platform: /v1/me by session, and nothing else ----

async function pretendPlatform(): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    // An http origin reads the plain name, EXACTLY (FE-28): our server, in edge mode, reads
    // the browser's `__Host-manifest_session` and forwards it under the name this origin reads.
    const session = (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith('manifest_session='))
      .map((part) => part.slice('manifest_session='.length))
      .at(0)
    const who = PEOPLE.find((p) => p.session === session)
    response.setHeader('content-type', 'application/json')
    if (request.url === '/v1/me' && who !== undefined) {
      response.writeHead(200)
      const { id, displayName, email } = who
      response.end(
        JSON.stringify({
          id,
          displayName,
          email,
          puid: 'x',
          role: 'member',
          mayBuild: true,
        }),
      )
      return
    }
    const me = request.url === '/v1/me'
    response.writeHead(me ? 401 : 404)
    response.end(
      JSON.stringify({
        error: { code: me ? 'UNAUTHENTICATED' : 'NOT_FOUND', message: 'no' },
      }),
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  if (port >= 7100 && port <= 7199) throw new Error(`the OS gave ${port}, the platform's`)
  return { server, origin: `http://127.0.0.1:${port}` }
}

// ---- a scripted event stream, as check-keeping.ts drives one ----

type Handlers = Parameters<ProjectStream['watch']>[2]
const opened: { projectId: string; handlers: Handlers; closed: boolean }[] = []
const stream: ProjectStream = {
  watch(_token, projectId, handlers) {
    const one = { projectId, handlers, closed: false }
    opened.push(one)
    return { ready: Promise.resolve(), close: () => void (one.closed = true) }
  },
}
const current = (projectId: string) => {
  const one = opened.filter((o) => o.projectId === projectId && !o.closed).at(-1)
  if (one === undefined) throw new Error(`no stream open for ${projectId}`)
  return one
}
const emit = (projectId: string, type: string, detail: unknown) =>
  current(projectId).handlers.event({
    id: randomUUID(),
    type,
    subject: 'project:x',
    detail,
    at: new Date().toISOString(),
  } satisfies ProjectEvent)

// ---- Mailpit, by this run's mark ----

type Mail = { ID: string; Subject: string; To: { Address: string }[] }
async function ourMail(): Promise<Mail[]> {
  const response = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(RUN)}&limit=500`,
  )
  if (!response.ok) throw new Error(`Mailpit's search answered ${response.status}`)
  return ((await response.json()) as { messages: Mail[] | null }).messages ?? []
}
async function mailSettled(count: number, ms = 15 * SECOND): Promise<Mail[]> {
  const end = Date.now() + ms
  while (Date.now() < end && (await ourMail()).length < count) await sleep(250)
  await sleep(1_500)
  return ourMail()
}
const to = (mails: Mail[], subject: string) =>
  mails
    .filter((m) => m.Subject === subject)
    .flatMap((m) => m.To.map((t) => t.Address))
    .sort()

async function until(test: () => boolean, ms = 10 * SECOND): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (test()) return true
    await sleep(50)
  }
  return test()
}

// ---- the run ----

const info = await fetch(`${MAILPIT}/api/v1/info`).catch(() => undefined)
if (!info?.ok) {
  console.error(
    `Mailpit does not answer at ${MAILPIT}: the platform's \`make up\` runs it.`,
  )
  process.exit(2)
}
const dir = mkdtempSync(join(tmpdir(), 'check-together-'))
const file = join(dir, 'app.sqlite')
const platform = await pretendPlatform()
const env = readConfig(process.env)
const config: Config = {
  ...env,
  mode: 'edge',
  origin: ORIGIN,
  platformOrigin: platform.origin,
  sessionOrigin: platform.origin,
}
const store = openStore(file)
const hub = createHub()
const APP: KeptApp = {
  projectId: randomUUID(),
  name: `Together check ${RUN}`,
  slug: `together-check-${RUN}`,
  state: 'active',
  launchedAt: new Date(Date.now() - 86_400_000).toISOString(),
  studentsUrl: null,
}
const PROJECT = { id: APP.projectId, name: APP.name, slug: APP.slug }
let members: KeptMember[] = [ALICE, BOB, SAM, DAN].map(kept)
const watching: Watching = {
  app: async () => APP,
  members: async () => members,
}
const keeper = createKeeper({
  store,
  key: randomBytes(KEY_BYTES),
  stream,
  watching,
  now: () => new Date(),
  mailer: smtpMailer(config.smtpUrl, config.mailFrom),
  origin: ORIGIN,
  hub,
  probe: (url) => probeAddress(url),
  probing: false,
})
const app = buildServer(config, () => undefined, { store, hub, keeper })

/** One person's request, with their session and, for a change, our Origin. */
async function ask(
  who: Person,
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const response = await app.inject({
    method,
    url,
    headers: {
      // What a browser sends us through the edge (FE-28, contract 1.6.0).
      cookie: `__Host-manifest_session=${who.session}`,
      ...(method === 'GET' ? {} : { origin: ORIGIN }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  })
  let json: unknown = null
  try {
    json = response.json()
  } catch {
    // No body.
  }
  return { status: response.statusCode, json }
}

/** Every change route on a conversation, with a body that passes its own check (Decision 2). */
/**
 * A token whose secret names its own id, as the platform's does (`mft_<id>_<secret>`): our
 * hand-overs refuse an id the secret does not name (m122, m83).
 */
const named = (what: string) => {
  const tokenId = randomUUID()
  return { token: `mft_${tokenId.replaceAll('-', '')}_check_${RUN}_${what}`, tokenId }
}

const CHANGES = (projectId: string) =>
  [
    ['build', {}],
    ['messages', { words: 'Make the title bigger, please.' }],
    ['answers', { questionId: 'q-1', words: 'It closes at the deadline.' }],
    ['plan', {}],
    ['plan/correction', { correction: 'Twelve weeks, not ten.' }],
    ['plan/agree', { answers: [] }],
    ['project', { projectId, ...named('x') }],
  ] as const

/** Each change route on `conversation`, by `who`: what each answered, and whether it changed. */
async function writes(who: Person, conversation: Conversation) {
  const before = {
    state: store.conversationById(conversation.id)?.state,
    messages: store.listMessages(conversation.id).length,
  }
  const answered: string[] = []
  for (const [route, body] of CHANGES(conversation.projectId!)) {
    const { status } = await ask(
      who,
      'POST',
      `/api/conversations/${conversation.id}/${route}`,
      body,
    )
    answered.push(`${route} ${status}`)
  }
  const after = {
    state: store.conversationById(conversation.id)?.state,
    messages: store.listMessages(conversation.id).length,
  }
  return {
    answered,
    all404: answered.every((a) => a.endsWith(' 404')),
    unchanged: JSON.stringify(before) === JSON.stringify(after),
  }
}

const setAsides = (conversationId: string) =>
  store
    .listMessages(conversationId)
    .map((m) => m.body as { kind?: string; by?: string; why?: string })
    .filter((b) => b.kind === 'set-aside')

const NEED_WORDS = `${APP.name}: your agent is asking something`

console.log(
  `F6b acceptance, half two: our server and keeper in-process, four people, run ${RUN}; email to ${config.smtpUrl}, read from ${MAILPIT}`,
)
try {
  // 1. Alice hands our watch over through our API, as her page does: kept, and the keeper keeps
  //    the app's four members (the members every check below reads).
  const handed = await ask(ALICE, 'POST', `/api/apps/${APP.projectId}/keeping`, {
    ...named('watch'),
    expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  })
  // The first replay of an app never watched is its past: nothing in it is told.
  current(APP.projectId).handlers.replayed?.({ ids: [], overlapped: false })
  const keptMembers = await until(() => store.members(APP.projectId).length === 4)
  check(
    1,
    "Alice's hand-over through our API keeps the watch, and its four members",
    handed.status === 201 && keptMembers,
    `→ ${handed.status} ${JSON.stringify(handed.json)}; kept ${store
      .members(APP.projectId)
      .map((m) => `${m.displayName.split(' ')[0]} (${m.role})`)
      .join(', ')}`,
  )

  // 2. Each reads the other's: Alice's change and Sam's, on one app; the list names who started each.
  const alices = changeOf(store, ALICE, PROJECT, 'Show each week in its own colour.')
  const sams = changeOf(store, SAM, PROJECT, 'Add a word count.')
  const samReads = await ask(SAM, 'GET', `/api/conversations/${alices.id}`)
  const aliceReads = await ask(ALICE, 'GET', `/api/conversations/${sams.id}`)
  const list = await ask(SAM, 'GET', `/api/apps/${APP.projectId}/conversations`)
  const byOf = (id: string) =>
    (list.json as { id: string; by: { name: string } }[]).find((c) => c.id === id)?.by
      .name
  check(
    2,
    "each reads the other's, and the app's list says who started each",
    samReads.status === 200 &&
      aliceReads.status === 200 &&
      (samReads.json as Conversation).id === alices.id &&
      byOf(alices.id) === ALICE.displayName &&
      byOf(sams.id) === SAM.displayName,
    `Sam reads Alice's → ${samReads.status}; Alice reads Sam's → ${aliceReads.status}; Sam's list: ${byOf(alices.id)}, ${byOf(sams.id)}`,
  )

  // 3. Every change route on the other's is 404, and changes nothing: the helper on the owner's,
  //    the owner on the helper's; and the helper's Stop on the owner's (Decision 2).
  const samOnAlices = await writes(SAM, alices)
  const samStops = await ask(SAM, 'POST', `/api/conversations/${alices.id}/stop`, {})
  const aliceOnSams = await writes(ALICE, sams)
  check(
    3,
    "every change route on the other's → 404, nothing changed; a helper's Stop on an owner's → 404",
    samOnAlices.all404 &&
      samOnAlices.unchanged &&
      samStops.status === 404 &&
      aliceOnSams.all404 &&
      aliceOnSams.unchanged &&
      store.conversationById(alices.id)?.state === 'plan-ready',
    `Sam on Alice's: ${samOnAlices.answered.join(', ')}, stop ${samStops.status} (unchanged: ${samOnAlices.unchanged}); Alice on Sam's: ${aliceOnSams.answered.join(', ')} (unchanged: ${aliceOnSams.unchanged})`,
  )

  // 4. A stranger (signed in, a member of nothing here) meets none of it.
  const carol = [
    (await ask(CAROL, 'GET', `/api/conversations/${alices.id}`)).status,
    (await ask(CAROL, 'GET', `/api/conversations/${sams.id}`)).status,
    (await ask(CAROL, 'POST', `/api/conversations/${sams.id}/stop`, {})).status,
    (await ask(CAROL, 'GET', `/api/apps/${APP.projectId}/minted`)).status,
  ]
  check(
    4,
    "a stranger: each read, Stop and the app's token ids → 404",
    carol.every((s) => s === 404),
    `→ ${carol.join(', ')}`,
  )

  // 5. An owner's Stop on the helper's: set aside, recorded as hers, and nothing holds the app.
  const stopped = await ask(ALICE, 'POST', `/api/conversations/${sams.id}/stop`, {})
  const recorded = setAsides(sams.id)
  const holding = store
    .conversationsOn(APP.projectId)
    .filter((c) => c.id !== alices.id)
    .filter((c) =>
      ['planning', 'plan-ready', 'building', 'paused', 'waiting'].includes(c.state),
    )
  const samSees = await ask(SAM, 'GET', `/api/conversations/${sams.id}`)
  check(
    5,
    "an owner's Stop on the helper's → 202: set aside, recorded as hers; Sam reads it so",
    stopped.status === 202 &&
      store.conversationById(sams.id)?.state === 'set-aside' &&
      recorded.length === 1 &&
      recorded[0]!.by === ALICE.id &&
      recorded[0]!.why === 'stopped' &&
      holding.length === 0 &&
      (samSees.json as Conversation).state === 'set-aside',
    `→ ${stopped.status}; ${store.conversationById(sams.id)?.state}, recorded ${JSON.stringify(recorded.map((r) => ({ by: r.by === ALICE.id ? 'Alice' : r.by, why: r.why })))}; ${holding.length} others holding it`,
  )
  // Alice's own change is set aside too, by her, so nothing of this run holds the app.
  await ask(ALICE, 'POST', `/api/conversations/${alices.id}/stop`, {})

  // An agent of Sam's own, kept by our page (its id alone), for the removal to forget.
  const samsAgent = randomUUID()
  const agentKept = await ask(SAM, 'POST', `/api/apps/${APP.projectId}/agents`, {
    tokenId: samsAgent,
    name: `Sam's helper ${RUN}`,
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  })

  // 6. Their agent's question: a need for each member, an owner's to answer.
  const pendingActionId = randomUUID()
  emit(APP.projectId, 'pending_action.created', {
    action: 'members:manage',
    tokenId: randomUUID(),
    pendingActionId,
  })
  type Needs = { needs: { kind: string; pendingActionId?: string; owner?: boolean }[] }
  const askingOf = async (who: Person) =>
    ((await ask(who, 'GET', '/api/needs')).json as Needs).needs.find(
      (n) => n.kind === 'agent-asks' && n.pendingActionId === pendingActionId,
    )
  await until(() =>
    store.historyOf(APP.projectId).some((e) => e.type === 'pending_action.created'),
  )
  const aliceNeed = await askingOf(ALICE)
  const samNeed = await askingOf(SAM)
  check(
    6,
    "their agent's question: a need on Alice's band (hers to answer), and on Sam's (not his)",
    aliceNeed?.owner === true && samNeed?.owner === false,
    `Alice ${JSON.stringify(aliceNeed && { owner: aliceNeed.owner })}; Sam ${JSON.stringify(samNeed && { owner: samNeed.owner })}`,
  )

  // 7. Emailed once to each owner, never to a helper.
  const asked = await mailSettled(2)
  const askedTo = to(asked, NEED_WORDS)
  check(
    7,
    'emailed once to each owner, never to a helper',
    JSON.stringify(askedTo) === JSON.stringify([ALICE.email, BOB.email].sort()),
    `"${NEED_WORDS}" to ${JSON.stringify(askedTo)}`,
  )

  // 8. Answered: the need is gone. And a question of Sam's agent, ended by its revoke (the
  //    platform's faculty-ready Task 13, FE-52: `pending_action.expired`, its cause and who): gone
  //    the same, with nobody answering it.
  emit(APP.projectId, 'pending_action.confirmed', { pendingActionId })
  await until(() =>
    store.historyOf(APP.projectId).some((e) => e.type === 'pending_action.confirmed'),
  )
  const answered = [await askingOf(ALICE), await askingOf(SAM)]
  const revokedQuestion = randomUUID()
  emit(APP.projectId, 'pending_action.created', {
    action: 'release:promote',
    tokenId: samsAgent,
    pendingActionId: revokedQuestion,
  })
  const needOf = async (who: Person) =>
    ((await ask(who, 'GET', '/api/needs')).json as Needs).needs.find(
      (n) => n.kind === 'agent-asks' && n.pendingActionId === revokedQuestion,
    )
  await until(() =>
    store
      .historyOf(APP.projectId)
      .some(
        (e) =>
          e.type === 'pending_action.created' &&
          (e.detail as { pendingActionId?: string }).pendingActionId === revokedQuestion,
      ),
  )
  const beforeRevoke = await needOf(ALICE)
  emit(APP.projectId, 'pending_action.expired', {
    pendingActionId: revokedQuestion,
    tokenId: samsAgent,
    action: 'release:promote',
    cause: 'token_revoked',
    by: SAM.id,
  })
  await until(() =>
    store.historyOf(APP.projectId).some((e) => e.type === 'pending_action.expired'),
  )
  const endedNeeds = [await needOf(ALICE), await needOf(SAM)]
  check(
    8,
    'answered (pending_action.confirmed), or its agent revoked (pending_action.expired): the need gone from every band',
    answered.every((n) => n === undefined) &&
      beforeRevoke !== undefined &&
      endedNeeds.every((n) => n === undefined),
    `confirmed: Alice ${JSON.stringify(answered[0] ?? null)}, Sam ${JSON.stringify(answered[1] ?? null)}; revoked: before ${beforeRevoke === undefined ? 'none' : 'a need'}, after Alice ${JSON.stringify(endedNeeds[0] ?? null)}, Sam ${JSON.stringify(endedNeeds[1] ?? null)}`,
  )

  // 9. Sam taken off, by the event: their work ended here, recorded `removed`; their agent's id
  //    forgotten; their own conversations 404 to them, still the members' to read.
  const samsNext = changeOf(store, SAM, PROJECT, 'Add a reading list.')
  members = members.filter((m) => m.userId !== SAM.id)
  emit(APP.projectId, 'member.removed', { memberId: SAM.id, userId: ALICE.id })
  const ended = await until(
    () => store.conversationById(samsNext.id)?.state === 'set-aside',
  )
  const removedBy = setAsides(samsNext.id)
  const samsOwn = (await ask(SAM, 'GET', `/api/conversations/${samsNext.id}`)).status
  const aliceStill = (await ask(ALICE, 'GET', `/api/conversations/${samsNext.id}`)).status
  const agentGone = !store.mintedOn(APP.projectId).some((r) => r.tokenId === samsAgent)
  check(
    9,
    "Sam taken off (member.removed): their work ended, recorded removed; their agent's id forgotten; their own 404 to them, the members' still",
    agentKept.status === 201 &&
      ended &&
      removedBy.length === 1 &&
      removedBy[0]!.by === SAM.id &&
      removedBy[0]!.why === 'removed' &&
      agentGone &&
      samsOwn === 404 &&
      aliceStill === 200,
    `agent kept → ${agentKept.status}, forgotten: ${agentGone}; ${store.conversationById(samsNext.id)?.state}, recorded ${JSON.stringify(removedBy.map((r) => r.why))}; Sam reads their own → ${samsOwn}; Alice → ${aliceStill}`,
  )

  // 10. Dan taken off with no event (FE-48: the stream closed before it): a re-read of the members
  //     (a reconnect's) ends their work, and a second re-read ends nothing again; Sam's stays one.
  const dans = changeOf(store, DAN, PROJECT, 'A page for the TAs.')
  members = members.filter((m) => m.userId !== DAN.id)
  current(APP.projectId).handlers.reconnected?.()
  const danEnded = await until(
    () => store.conversationById(dans.id)?.state === 'set-aside',
  )
  current(APP.projectId).handlers.reconnected?.()
  await sleep(1_000)
  const danRecorded = setAsides(dans.id)
  check(
    10,
    'Dan taken off with no event: a re-read ends their work once, a second ends nothing again',
    danEnded &&
      danRecorded.length === 1 &&
      danRecorded[0]!.why === 'removed' &&
      setAsides(samsNext.id).length === 1 &&
      !store.members(APP.projectId).some((m) => m.userId === DAN.id),
    `${store.conversationById(dans.id)?.state}, ${danRecorded.length} set-aside (${danRecorded.map((r) => r.why).join(', ')}); Sam's ${setAsides(samsNext.id).length}`,
  )

  // 11. Nobody taken off is emailed anything, in the whole run.
  const all = await mailSettled(3)
  const toRemoved = all.filter((m) =>
    m.To.some((t) => t.Address === SAM.email || t.Address === DAN.email),
  )
  check(
    11,
    'no email to anyone taken off (nor to a helper), in the whole run',
    toRemoved.length === 0 && all.length > 0,
    `${all.length} of ours: ${JSON.stringify(all.map((m) => `${m.Subject.replace(APP.name, '<App>')} → ${m.To.map((t) => t.Address.split('.')[0]).join(',')}`))}`,
  )

  // 12. No credential in the clear: every table, the watch sealed only, the token ids ids only.
  const db = new DatabaseSync(file, { readOnly: true })
  const tables = db
    .prepare("select name from sqlite_master where type = 'table'")
    .all() as { name: string }[]
  const dump = tables
    .map(({ name }) => JSON.stringify(db.prepare(`select * from "${name}"`).all()))
    .join('\n')
  const minted = db.prepare('select * from minted').all()
  db.close()
  const leaked = dump.match(/(^|[^A-Za-z0-9_])(mft_|sk-)[A-Za-z0-9_-]{0,12}/g) ?? []
  check(
    12,
    'no mft_ and no sk- in any table',
    leaked.length === 0 && tables.some((t) => t.name === 'minted'),
    `${tables.length} tables, ${dump.length} bytes, ${minted.length} minted rows; leaked ${JSON.stringify(leaked)}`,
  )
} finally {
  await app.close()
  try {
    store.close()
  } catch {
    // Closed already.
  }
  platform.server.close()
  rmSync(dir, { recursive: true, force: true })
  const mine = await ourMail().catch(() => [] as Mail[])
  if (mine.length > 0)
    await fetch(`${MAILPIT}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ IDs: mine.map((m) => m.ID) }),
    }).catch(() => undefined)
  const left = await ourMail().catch(() => [] as Mail[])
  check(
    13,
    "our messages deleted from Mailpit's shared inbox",
    left.length === 0,
    `${mine.length} deleted, ${left.length} left`,
  )
}

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
