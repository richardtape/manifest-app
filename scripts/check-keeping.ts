/**
 * F6'S ACCEPTANCE, HALF TWO (the plan's Task 12, Step 1.2): THE KEEPER, IN-PROCESS. Our real
 * keeper (`createKeeper`, as `main.ts` builds it) on our real store in a scratch file, sending
 * REAL EMAIL to Mailpit through our own mailer, against a scripted event stream and a pretend live
 * address on a free port the OS picks (never 7100–7199), made to answer, fall over and answer
 * again. What the keeper sent is read back from Mailpit's API, by this run's own mark in every
 * subject and address, and deleted after. Nothing of ours runs: 7105 and the dev database are
 * untouched (half one, `check-keeping.sh`, is our API's).
 *
 *   pnpm exec tsx scripts/check-keeping.ts
 *   CONTROL=actor|restart|clear-token|mock-probe pnpm exec tsx scripts/check-keeping.ts
 *
 * The keeper looks at a live address every `lookEveryMs` (a minute in our server; here a second,
 * a dependency its caller gives: Task 12's (S4)). Each CONTROL breaks one thing, and its check
 * goes red:
 *   actor        the platform's member.added names nobody who did it: the actor is emailed;
 *   restart      the keeper's own history of the outage lost at the restart: a second email;
 *   clear-token  a watch token written in the clear into watch_tokens;
 *   mock-probe   the probe running in mock mode (a keeper built probing, and main.ts saying so).
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readConfig } from '../packages/server/src/config.js'
import { createKeeper, type Keeper } from '../packages/server/src/keeping/keeper.js'
import { smtpMailer } from '../packages/server/src/keeping/mail.js'
import { probeAddress } from '../packages/server/src/keeping/probe.js'
import { KEY_BYTES, unseal } from '../packages/server/src/keeping/seal.js'
import type {
  ProjectEvent,
  ProjectStream,
} from '../packages/server/src/platform/stream.js'
import type { Watching } from '../packages/server/src/platform/watching.js'
import { openStore, type Store } from '../packages/server/src/store/db.js'
import type { KeptApp, KeptMember } from '../packages/server/src/store/keeping.js'

const CONTROL = process.env['CONTROL'] ?? ''
const CONTROLS = ['', 'actor', 'restart', 'clear-token', 'mock-probe']
if (!CONTROLS.includes(CONTROL)) {
  console.error(
    `CONTROL is one of ${CONTROLS.filter(Boolean).join(', ')}, never '${CONTROL}'`,
  )
  process.exit(2)
}
const MAILPIT = process.env['MAILPIT'] ?? 'http://127.0.0.1:7112'
const ROOT = new URL('..', import.meta.url).pathname
const MAIN = join(ROOT, 'packages/server/src/main.ts')
// Mock mode's rule, as main.ts states it (Decision 12): the source is checked, never copied.
const MOCK_RULE = "probing: config.mode !== 'mock',"
const LOOK_MS = 1_000
const SECOND = 1_000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')

// ---- what this run is: a mark in every subject and address, its apps and people ----

const RUN = `kc${randomBytes(4).toString('hex')}`
const person = (name: string, role: KeptMember['role']): KeptMember => ({
  userId: randomUUID(),
  role,
  displayName: `${name} Check`,
  email: `${name.toLowerCase()}.${RUN}@keeping-check.test`,
})
const ALICE = person('Alice', 'owner')
const BOB = person('Bob', 'owner')
const CAROL = person('Carol', 'collaborator')
const DAY = 86_400_000

let passed = 0
let failed = 0
const ok = (n: number, name: string, detail = '') => {
  passed++
  console.log(`ok   ${n}  ${name}${detail ? `  ${detail}` : ''}`)
}
const no = (n: number, name: string, detail: string) => {
  failed++
  console.log(`FAIL ${n}  ${name}: ${detail}`)
}
const check = (n: number, name: string, good: boolean, detail: string) =>
  good ? ok(n, name, detail) : no(n, name, detail)

// ---- a pretend live address: 302 from the app's own instance, or the edge's 502 ----

interface Pretend {
  server: Server
  url: string
  answering: boolean
  served: { at: number; status: number }[]
}
async function pretendAddress(): Promise<Pretend> {
  const pretend: Pretend = {
    server: createServer((_request, response) => {
      const status = pretend.answering ? 302 : 502
      pretend.served.push({ at: Date.now(), status })
      // A CWL app's sign-in, from its own instance (`x-manifest-instance`: S1, M3); or nothing behind.
      response.writeHead(
        status,
        pretend.answering ? { location: '/login', 'x-manifest-instance': 'pretend' } : {},
      )
      response.end()
    }),
    url: '',
    answering: true,
    served: [],
  }
  await new Promise<void>((resolve) => pretend.server.listen(0, '127.0.0.1', resolve))
  const { port } = pretend.server.address() as AddressInfo
  if (port >= 7100 && port <= 7199) throw new Error(`the OS gave ${port}, the platform's`)
  pretend.url = `http://127.0.0.1:${port}/`
  return pretend
}

// ---- a scripted event stream, driven by hand, as the platform's would arrive ----

type Handlers = Parameters<ProjectStream['watch']>[2]
interface Opened {
  token: string
  projectId: string
  handlers: Handlers
  closed: boolean
}
const opened: Opened[] = []
const stream: ProjectStream = {
  watch(token, projectId, handlers) {
    const one: Opened = { token, projectId, handlers, closed: false }
    opened.push(one)
    return { ready: Promise.resolve(), close: () => void (one.closed = true) }
  },
}
const current = (projectId: string) => {
  const one = opened.filter((o) => o.projectId === projectId && !o.closed).at(-1)
  if (one === undefined) throw new Error(`no stream open for ${projectId}`)
  return one
}
/** A (re)connection's replay: each event, then the report. */
function replay(projectId: string, events: ProjectEvent[]) {
  const one = current(projectId)
  // As the stream does: each carried by the replay (minors m108), then the report.
  for (const event of events) one.handlers.event(event, true)
  one.handlers.replayed?.({ ids: events.map((e) => e.id), overlapped: false })
}
const sent: Record<string, ProjectEvent[]> = {}
function emit(projectId: string, event: ProjectEvent) {
  ;(sent[projectId] ??= []).push(event)
  current(projectId).handlers.event(event)
}
const eventOf = (type: string, detail: unknown, at = new Date()): ProjectEvent => ({
  id: randomUUID(),
  type,
  subject: 'project:x',
  detail,
  at: at.toISOString(),
  actor: null,
})

// ---- Mailpit: our messages, by this run's mark ----

type Mail = { ID: string; Subject: string; To: { Address: string }[] }
async function ourMail(): Promise<Mail[]> {
  const response = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(RUN)}&limit=500`,
  )
  if (!response.ok) throw new Error(`Mailpit's search answered ${response.status}`)
  return ((await response.json()) as { messages: Mail[] | null }).messages ?? []
}
/** Until at least `count` of ours have arrived (or `ms` pass), then a moment for any extra. */
async function mailSettled(count: number, ms = 20 * SECOND): Promise<Mail[]> {
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
const ownersBoth = [ALICE.email, BOB.email].sort()

// ---- the keeper, as main.ts builds it but for the stream, the reads and the interval ----

const config = readConfig(process.env)
const mailer = smtpMailer(config.smtpUrl, config.mailFrom)
const key = randomBytes(KEY_BYTES)
const apps = new Map<string, KeptApp>()
const membersOf = new Map<string, KeptMember[]>()
const watching: Watching = {
  app: async (_token, projectId) => {
    const app = apps.get(projectId)
    if (app === undefined) throw new Error(`no app ${projectId}`)
    return app
  },
  members: async (_token, projectId) => membersOf.get(projectId) ?? [],
}
const keeperOn = (store: Store, probing: boolean): Keeper =>
  createKeeper({
    store,
    key,
    stream,
    watching,
    now: () => new Date(),
    mailer,
    origin: config.origin,
    hub: { watched: () => false, busy: () => false },
    probe: (url) => probeAddress(url),
    probing,
    lookEveryMs: LOOK_MS,
  })

/** Until `test` holds of the store, or `ms` pass. */
async function until(test: () => boolean, ms = 15 * SECOND): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (test()) return true
    await sleep(100)
  }
  return test()
}
const ours = (store: Store, projectId: string, type: string) =>
  store.historyOf(projectId).filter((entry) => entry.type === type)
const detailOf = (entry: { detail: unknown } | undefined) =>
  (entry?.detail ?? {}) as { from?: string; to?: string; again?: boolean }
const within = (at: string | undefined, low: number, high: number) =>
  at !== undefined && Date.parse(at) >= low && Date.parse(at) <= high

// ---- the run ----

const info = await fetch(`${MAILPIT}/api/v1/info`).catch(() => undefined)
if (!info?.ok) {
  console.error(
    `Mailpit does not answer at ${MAILPIT}: the platform's \`make up\` runs it.`,
  )
  process.exit(2)
}
const dir = mkdtempSync(join(tmpdir(), 'check-keeping-'))
const file = join(dir, 'app.sqlite')
const pretend = await pretendAddress()
const mockPretend = await pretendAddress()
const keepers: Keeper[] = []
const stores: Store[] = []

const LIVE: KeptApp = {
  projectId: randomUUID(),
  name: `Keeping check ${RUN}`,
  slug: `keeping-check-${RUN}`,
  state: 'active',
  launchedAt: new Date(Date.now() - DAY).toISOString(),
  studentsUrl: pretend.url,
}
const DRAFT: KeptApp = {
  projectId: randomUUID(),
  name: `Keeping draft ${RUN}`,
  slug: `keeping-draft-${RUN}`,
  state: 'active',
  launchedAt: null,
  studentsUrl: null,
}
const TOKENS = {
  [LIVE.projectId]: `mft_check_${RUN}_live`,
  [DRAFT.projectId]: `mft_check_${RUN}_draft`,
}
const hand = (keeper: Keeper, app: KeptApp) =>
  keeper.hand(
    app.projectId,
    {
      token: TOKENS[app.projectId]!,
      tokenId: randomUUID(),
      expiresAt: new Date(Date.now() + 365 * DAY).toISOString(),
    },
    ALICE.userId,
  )

const SUBJECT = {
  failed: (app: KeptApp) => `${app.name}: a change didn't go live`,
  cantReach: `${LIVE.name}: your students can't reach it`,
  answering: `${LIVE.name} is answering again`,
  added: `${LIVE.name}: ${CAROL.displayName} was added`,
}

console.log(
  `F6 acceptance, half two: the keeper in-process, run ${RUN}${CONTROL ? `, CONTROL=${CONTROL}` : ''}; email to ${config.smtpUrl}, read from ${MAILPIT}`,
)
try {
  for (const app of [LIVE, DRAFT]) {
    apps.set(app.projectId, app)
    membersOf.set(app.projectId, [ALICE, BOB])
  }
  let store = openStore(file)
  stores.push(store)
  const first = keeperOn(store, true)
  keepers.push(first)
  first.start()

  // 1. Handed over: kept, sealed; a second hand while it is good is current.
  const handed = [
    await hand(first, LIVE),
    await hand(first, DRAFT),
    await hand(first, LIVE),
  ]
  check(
    1,
    'each token handed over is kept, and a second hand while it is good is current',
    JSON.stringify(handed) === '["kept","kept","current"]',
    JSON.stringify(handed),
  )

  // The first replay of an app never watched is its past: written, emailed to nobody.
  const past = [
    eventOf('project.launched', { instanceId: randomUUID() }, new Date(Date.now() - DAY)),
    eventOf(
      'incident.opened',
      { environment: 'production', incidentId: randomUUID(), releaseId: randomUUID() },
      new Date(Date.now() - DAY / 2),
    ),
  ]
  sent[LIVE.projectId] = [...past]
  replay(LIVE.projectId, past)
  sent[DRAFT.projectId] = []
  replay(DRAFT.projectId, [])

  // A change that didn't go live, on each app; someone added to the live one by Alice.
  const incident = () => ({
    environment: 'production',
    incidentId: randomUUID(),
    releaseId: randomUUID(),
  })
  emit(LIVE.projectId, eventOf('incident.opened', incident()))
  emit(DRAFT.projectId, eventOf('incident.opened', incident()))
  membersOf.set(LIVE.projectId, [ALICE, BOB, CAROL])
  emit(
    LIVE.projectId,
    eventOf('member.added', {
      memberId: CAROL.userId,
      role: 'collaborator',
      previousRole: null,
      // CONTROL=actor: the platform names nobody who did it, so nobody is spared.
      ...(CONTROL === 'actor' ? {} : { userId: ALICE.userId }),
    }),
  )

  // The live address answers for three looks; then falls over.
  await sleep(3 * LOOK_MS)
  const fellAt = Date.now()
  pretend.answering = false
  const fell = await until(
    () => ours(store, LIVE.projectId, 'keeping.unreachable').length > 0,
  )
  const unreachable = ours(store, LIVE.projectId, 'keeping.unreachable')[0]
  const firstMiss = pretend.served.find((s) => s.at >= fellAt)?.at ?? NaN
  check(
    2,
    'two misses: one keeping.unreachable, from the first miss',
    fell && within(detailOf(unreachable).from, fellAt - LOOK_MS, firstMiss),
    `from ${detailOf(unreachable).from}; fell over at ${new Date(fellAt).toISOString()}, first miss served ${new Date(firstMiss).toISOString()}`,
  )
  // Its emails arrive (with the change's and the member's) before the restart.
  await mailSettled(5)

  // 3. A RESTART MID-OUTAGE: the keeper stopped, the store closed and opened again, a new keeper
  //    started from the sealed rows; the stream replays the same events.
  first.stop()
  store.close()
  if (CONTROL === 'restart') {
    const db = new DatabaseSync(file)
    db.prepare("delete from history where type like 'keeping.%'").run()
    db.close()
  }
  store = openStore(file)
  stores.push(store)
  const second = keeperOn(store, true)
  keepers.push(second)
  second.start()
  const reopened = [LIVE, DRAFT].map((app) => current(app.projectId).token)
  check(
    3,
    'after a restart, each stream is opened again with its token, unsealed from the store',
    JSON.stringify(reopened) ===
      JSON.stringify([TOKENS[LIVE.projectId], TOKENS[DRAFT.projectId]]),
    `${reopened.length} streams, each with the token handed over: ${JSON.stringify(reopened) === JSON.stringify([TOKENS[LIVE.projectId], TOKENS[DRAFT.projectId]])}`,
  )
  for (const app of [LIVE, DRAFT]) replay(app.projectId, sent[app.projectId] ?? [])

  // Still down, for three looks more.
  await sleep(4 * LOOK_MS)
  const downStill = await mailSettled(0, 0)
  const cantReach = to(downStill, SUBJECT.cantReach)
  check(
    4,
    "your students can't reach it: once to each owner, and no second after the restart",
    JSON.stringify(cantReach) === JSON.stringify(ownersBoth) &&
      ours(store, LIVE.projectId, 'keeping.unreachable').length === 1,
    `to ${JSON.stringify(cantReach)}; ${ours(store, LIVE.projectId, 'keeping.unreachable').length} keeping.unreachable`,
  )

  // Answering again: three answers in a row; the outage ends at the first.
  const upAt = Date.now()
  pretend.answering = true
  const recovered = await until(
    () => ours(store, LIVE.projectId, 'keeping.answering').length > 0,
  )
  const answering = ours(store, LIVE.projectId, 'keeping.answering')[0]
  const firstAnswer = pretend.served.find((s) => s.at >= upAt)?.at ?? NaN
  const fallFrom = detailOf(ours(store, LIVE.projectId, 'keeping.unreachable')[0]).from
  check(
    5,
    'three answers: one keeping.answering, from the first fall to the first answer',
    recovered &&
      detailOf(answering).from === fallFrom &&
      within(detailOf(answering).to, upAt - LOOK_MS, firstAnswer),
    `from ${detailOf(answering).from} (the fall's ${fallFrom}), to ${detailOf(answering).to} (first answer served ${new Date(firstAnswer).toISOString()})`,
  )

  // The replay of the same events, once more: nothing new.
  const before = await mailSettled(7)
  for (const app of [LIVE, DRAFT]) replay(app.projectId, sent[app.projectId] ?? [])
  await sleep(2 * LOOK_MS)
  const mails = await mailSettled(0, 0)

  const answeringTo = to(mails, SUBJECT.answering)
  check(
    6,
    'answering again: once to each owner',
    JSON.stringify(answeringTo) === JSON.stringify(ownersBoth),
    `to ${JSON.stringify(answeringTo)}`,
  )
  const failedLive = to(mails, SUBJECT.failed(LIVE))
  const failedDraft = to(mails, SUBJECT.failed(DRAFT))
  check(
    7,
    "a change didn't go live: once to each owner of the launched app (its past emailed nobody), none for the one never launched",
    JSON.stringify(failedLive) === JSON.stringify(ownersBoth) && failedDraft.length === 0,
    `launched: to ${JSON.stringify(failedLive)}; never launched: to ${JSON.stringify(failedDraft)}`,
  )
  const added = to(mails, SUBJECT.added)
  check(
    8,
    "who's on it changed: to the other owner, not the one who did it nor the one added",
    JSON.stringify(added) === JSON.stringify([BOB.email]),
    `"${SUBJECT.added}" to ${JSON.stringify(added)}`,
  )
  check(
    9,
    'the replay of the same events sends nothing',
    before.length > 0 && mails.length === before.length,
    `${before.length} of ours before the replay, ${mails.length} after`,
  )

  // 10. No credential in the clear: the store's every table, the watch tokens sealed only.
  if (CONTROL === 'clear-token') {
    const db = new DatabaseSync(file)
    db.prepare('update watch_tokens set sealed = ? where project_id = ?').run(
      TOKENS[LIVE.projectId]!,
      LIVE.projectId,
    )
    db.close()
  }
  const db = new DatabaseSync(file, { readOnly: true })
  const tables = db
    .prepare("select name from sqlite_master where type = 'table'")
    .all() as { name: string }[]
  const dump = tables
    .map(({ name }) => JSON.stringify(db.prepare(`select * from "${name}"`).all()))
    .join('\n')
  const watches = db.prepare('select project_id, sealed from watch_tokens').all() as {
    project_id: string
    sealed: string
  }[]
  db.close()
  const leaked = dump.match(/(^|[^A-Za-z0-9_])(mft_|sk-)[A-Za-z0-9_-]{0,12}/g) ?? []
  const sealedOnly = watches.every(
    (w) => !w.sealed.includes('mft_') && unseal(key, w.sealed) === TOKENS[w.project_id],
  )
  check(
    10,
    'no mft_ and no sk- in any table; watch_tokens holds sealed values only, each ours',
    leaked.length === 0 && watches.length === 2 && sealedOnly,
    `${tables.length} tables, ${dump.length} bytes; leaked ${JSON.stringify(leaked)}; ${watches.length} watch tokens, sealed only: ${sealedOnly}`,
  )

  // 11. Mock mode (Decision 12): main.ts builds the keeper not probing, and a keeper not probing
  //     asks a launched app's address nothing.
  const mainText = readFileSync(MAIN, 'utf8')
  const ruled =
    CONTROL === 'mock-probe'
      ? mainText.replace(MOCK_RULE, 'probing: true,').includes(MOCK_RULE)
      : mainText.includes(MOCK_RULE)
  const mockStore = openStore(join(dir, 'mock.sqlite'))
  stores.push(mockStore)
  const mock = keeperOn(mockStore, CONTROL === 'mock-probe')
  keepers.push(mock)
  const mockApp = { ...LIVE, projectId: randomUUID(), studentsUrl: mockPretend.url }
  apps.set(mockApp.projectId, mockApp)
  // Its token reads its members, the one handing it among them (or it is a stranger's: I2).
  membersOf.set(mockApp.projectId, [ALICE, BOB])
  TOKENS[mockApp.projectId] = `mft_check_${RUN}_mock`
  mock.start()
  await hand(mock, mockApp)
  replay(mockApp.projectId, [])
  await sleep(3 * LOOK_MS + 500)
  check(
    11,
    "mock mode: main.ts builds the keeper not probing, and a launched app's address is asked nothing",
    ruled && mockPretend.served.length === 0,
    `main.ts says ${JSON.stringify(MOCK_RULE)}: ${ruled}; the address asked ${mockPretend.served.length} times in ${3 * LOOK_MS + 500} ms`,
  )
} finally {
  for (const keeper of keepers) keeper.stop()
  await sleep(200)
  for (const store of stores)
    try {
      store.close()
    } catch {
      // Closed already.
    }
  pretend.server.close()
  mockPretend.server.close()
  rmSync(dir, { recursive: true, force: true })
  // Ours deleted from the shared inbox, by their ids.
  const mine = await ourMail().catch(() => [] as Mail[])
  if (mine.length > 0)
    await fetch(`${MAILPIT}/api/v1/messages`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ IDs: mine.map((m) => m.ID) }),
    }).catch(() => undefined)
  const left = await ourMail().catch(() => [] as Mail[])
  check(
    12,
    "our messages deleted from Mailpit's shared inbox",
    left.length === 0,
    `${mine.length} deleted, ${left.length} left`,
  )
}

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
