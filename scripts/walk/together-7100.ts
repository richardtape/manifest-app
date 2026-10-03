/**
 * F6b'S WALK ON THE REAL PLATFORM (the plan's Task 13, Step 3): moments 17 and 18 and *Agents*,
 * through `https://app.manifest.internal`, on a launched app, at Rich's word, in a window the
 * running platform sitting gives. Built as `keeping-7100.ts` is; its first run on 7100 is its proof,
 * step by step.
 *
 * Each step is its own command, run in order, each writing what it saw to `<out>/log.txt`, its
 * screenshots beside it, and what the next step needs to `<out>/state.json`:
 *
 *   W=scripts/walk/together-7100.ts
 *   export NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt
 *   node $W check            what must be true first; changes nothing anywhere
 *   node $W people           instructor, colleague and operator sign in once (THE WALK TYPES THE
 *                            LAPTOP IdP's TEST PASSWORDS, each the person's own name: Rich's word)
 *   node $W app <slug>       the walk's app, launched already (F6b sitting 1's `f6b-measure-1`): who is
 *                            on it, its tokens and questions, said; nothing changed
 *   node $W quiet            the Overview, People and Agents at 1440 and 375; our watch minted by the
 *                            page
 *   node $W helper           People: colleague added as a helper, the second sign-in asked and back;
 *                            nobody emailed (the only owner did it)
 *   node $W theirs           colleague asks a change; instructor reads it, read-only, and stops it;
 *                            colleague reads who stopped it
 *   node $W change           instructor asks a change that needs an administrator's look (a host it
 *                            can reach): planned, agreed, built (the real lead), on trying-out; the
 *                            sign-off asked on the Overview, approved by operator, let through with
 *                            the second sign-in
 *   node $W agent            Agents: an agent of instructor's own made, its key shown once; it asks
 *                            to add someone; the band, the email (instructor's alone), the card,
 *                            answered No; then revoked
 *   node $W off              colleague asks another change; instructor takes colleague off: their
 *                            work ended, said, and theirs no more
 *   node $W tidy             BEFORE RICH'S CLICK: every active token our server does not know
 *                            revoked as its minter (Decision 4's residual; the review's M4), every
 *                            question left answered no
 *   node $W mail             every email the walk caused, word for word, to <out>/emails.md
 *
 * `OUT=<dir>` (default `$TMPDIR/together-7100`). `APP=<origin>` (default the edge's). Our server
 * must be in EDGE MODE (`pnpm dev`: ORIENTATION §7), its keeper emailing to Mailpit (7111/7112).
 * Node 24 runs this file as it is.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { machineryIn } from '../../packages/web/src/screens/machinery.ts'
import {
  launchChrome,
  Page,
  Report,
  signIn,
  signInHere,
  type Chrome,
  type Person,
} from './index.ts'

const APP = process.env['APP'] ?? 'https://app.manifest.internal'
const MAILPIT = process.env['MAILPIT'] ?? 'http://127.0.0.1:7112'
const OUT = process.env['OUT'] ?? join(tmpdir(), 'together-7100')
const STATE = join(OUT, 'state.json')
const WIDTHS = [1440, 375]
const MINUTE = 60_000
/** A plan's yes: a change's (moment 8), or a first plan's (moment 5). */
const YES = ['Yes, change it', 'Yes, build that']
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
mkdirSync(OUT, { recursive: true })

const [step = 'help', arg] = process.argv.slice(2)
const report = new Report(OUT)
const log = (line: string) => report.log(`${step}: ${line}`)
const short = (body: unknown) => JSON.stringify(body).slice(0, 600)

interface State {
  started?: string
  projectId?: string
  slug?: string
  name?: string
  theirs?: string
  change?: string
  agentTokenId?: string
  pendingActionId?: string
  last?: string
}
const state = (): State =>
  existsSync(STATE) ? (JSON.parse(readFileSync(STATE, 'utf8')) as State) : {}
const save = (more: State) =>
  writeFileSync(STATE, JSON.stringify({ ...state(), ...more }, null, 2))
function need<K extends keyof State>(key: K): NonNullable<State[K]> {
  const value = state()[key]
  if (value === undefined) throw new Error(`no ${key} in ${STATE}: run the step before`)
  return value as NonNullable<State[K]>
}

// ---- the platform and our API, in a person's session (Node), stepping up once when asked ----

type Answer = Awaited<ReturnType<Person['call']>>
const people = new Map<string, Person>()
async function as(user: string): Promise<Person> {
  const known = people.get(user)
  if (known) return known
  const person = await signIn({ app: APP, user })
  people.set(user, person)
  return person
}
/** A field of an answer's body, by its path, as text: `''` when absent. The walk reads loosely. */
function field(body: unknown, ...path: string[]): string {
  let at: unknown = body
  for (const key of path)
    at =
      at !== null && typeof at === 'object'
        ? (at as Record<string, unknown>)[key]
        : undefined
  if (at === undefined || at === null) return ''
  return typeof at === 'object'
    ? JSON.stringify(at)
    : String(at as string | number | boolean)
}
const list = (body: unknown, key: string): unknown[] =>
  Array.isArray(body) ? body : (JSON.parse(field(body, key) || '[]') as unknown[])
async function stepped(person: Person, call: () => Promise<Answer>, returnTo = '/') {
  let answer = await call()
  if (
    answer.status === 403 &&
    field(answer.body, 'error', 'code') === 'STEP_UP_REQUIRED'
  ) {
    const up = await person.stepUp(returnTo)
    log(`${person.user} signed in again (${up.status})`)
    answer = await call()
  }
  return answer
}
async function readiness(person: Person, projectId: string, label: string) {
  const answer = await person.call('GET', `/v1/projects/${projectId}/launch-readiness`)
  const items = list(answer.body, 'items') as { id: string; state: string }[]
  log(
    `the checklist ${label}: ready ${field(answer.body, 'ready')}, reescalated ${field(answer.body, 'reescalated')}, candidate ${field(answer.body, 'candidateReleaseId')}; ${items.map((i) => `${i.id}=${i.state}`).join(' ')}`,
  )
  return answer.body
}
async function production(person: Person, projectId: string) {
  const answer = await person.call('GET', `/v1/projects/${projectId}/environments`)
  return (list(answer.body, 'environments') as unknown[]).find(
    (e) => field(e, 'kind') === 'production',
  )
}
const membersOf = async (person: Person, projectId: string) =>
  list(
    (await person.call('GET', `/v1/projects/${projectId}/members`)).body,
    'members',
  ) as {
    userId: string
    cwlLogin: string
    email: string
    displayName: string
    role: string
  }[]
const tokensOf = async (person: Person, projectId: string) =>
  list((await person.call('GET', `/v1/projects/${projectId}/tokens`)).body, 'tokens') as {
    id: string
    name: string
    revokedAt: string | null
    expired: boolean
    lastUsedAt: string | null
  }[]
const questionsOf = async (person: Person, projectId: string) =>
  list(
    (await person.call('GET', `/v1/projects/${projectId}/pending-actions`)).body,
    'pendingActions',
  ) as { id: string; state: string; action: string; tokenId: string; summary: string }[]

// ---- Mailpit: what the walk caused, by recipient and time ----

interface Mail {
  ID: string
  Subject: string
  Created: string
  To: { Address: string }[]
}
async function mailTo(address: string): Promise<Mail[]> {
  const response = await fetch(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=200`,
  )
  if (!response.ok) throw new Error(`Mailpit's search answered ${response.status}`)
  const since = Date.parse(need('started'))
  return (((await response.json()) as { messages: Mail[] | null }).messages ?? []).filter(
    (m) => Date.parse(m.Created) >= since,
  )
}
async function untilMail(address: string, subject: string, ms: number) {
  const end = Date.now() + ms
  for (;;) {
    const found = (await mailTo(address)).filter((m) => m.Subject === subject)
    if (found.length > 0 || Date.now() > end) return found
    await sleep(10_000)
  }
}
/** The name the platform gives them (the laptop's: "Test Instructor"), as our pages show it. */
const nameOf = async (user: string) => field((await as(user)).me, 'displayName')
const emailOf = async (user: string) =>
  field((await as(user)).me, 'email') || `${user}@example.test`

// ---- the browser: one Chrome, a tab per person, each signed in at the IdP ----

let chrome: Chrome | undefined
const tabs: Page[] = []
async function tabFor(user: string): Promise<Page> {
  chrome ??= await launchChrome()
  const page = await Page.open(chrome, {
    base: APP,
    out: OUT,
    allowWrites: true,
    isolated: true,
  })
  tabs.push(page)
  await signInHere(page, { user })
  log(`${user} signed in at the IdP, in the browser`)
  return page
}
async function fillIdp(page: Page, user: string) {
  await page.run((name: string) => {
    const input = document.querySelector<HTMLInputElement>('input[name=username]')
    const pass = input?.form?.querySelector<HTMLInputElement>('input[name=password]')
    if (!input || !pass || !input.form) throw new Error('the IdP form has no fields')
    input.value = name
    pass.value = name
    input.form.submit()
  }, user)
}
/**
 * After a press: the second sign-in asked, or the press went through (`going`: its own signs, in
 * the page's markup). The card arrives after a moment's working line (ORIENTATION §7), so wait
 * for either, then sign in again at the IdP and come back to the same button, said.
 */
async function signInAgainIfAsked(
  page: Page,
  user: string,
  then: string,
  going: string[],
) {
  const asked = await page.until(
    'the press under way, or the second sign-in asked',
    (signs: string[]) =>
      document.body.textContent?.includes('Sign in once more')
        ? 'asked'
        : signs.some((sign) => document.body.innerHTML.includes(sign))
          ? 'going'
          : '',
    [going],
    60_000,
  )
  if (asked !== 'asked') return false
  await page.shot(`step-up-${then}`)
  await page.press('Sign in again')
  const where = await page.until(
    'the IdP, or back already',
    (home: string) =>
      location.host !== home
        ? document.querySelector('input[name=username]')
          ? 'idp'
          : ''
        : location.search.includes('then=')
          ? 'back'
          : '',
    [new URL(APP).host],
    30_000,
  )
  if (where === 'idp') await fillIdp(page, user)
  await page.until(
    `back with then=${then}`,
    (home: string) =>
      location.host === home && document.body.textContent?.includes('signed in again'),
    [new URL(APP).host],
    45_000,
  )
  report.check(
    `${then}: the second sign-in asked, and back to the same page, said`,
    (await page.words('main')).includes('signed in again'),
  )
  return true
}
/** What every screen is held to: no machinery outside mono, every control named, it fits. */
async function held(page: Page, name: string) {
  const machinery = machineryIn(await page.words('main', '.mono'))
  report.check(`${name}: no machinery word`, machinery.length === 0, machinery.join(', '))
  const unnamed = (await page.names())
    .filter((n) => ['button', 'link', 'radio', 'textbox', 'checkbox'].includes(n.role))
    .filter((n) => !n.name.trim())
  report.check(`${name}: every control named`, unnamed.length === 0, short(unnamed))
  const problems = await page.layout()
  report.check(`${name}: fits`, problems.length === 0, problems.join(' | '))
  await page.shot(name)
}
async function atEachWidth(page: Page, path: string, wait: string, name: string) {
  for (const width of WIDTHS) {
    await page.setWidth(width)
    await page.go(path)
    await page.untilWords(wait, 'main', 30_000)
    await held(page, `${name} at ${width}`)
  }
  await page.setWidth(WIDTHS[0]!)
}
/** Ask a change through the page, as a person does: its conversation's id, once it is planned. */
async function askChange(page: Page, slug: string, words: string): Promise<string> {
  await page.go(`/apps/${slug}/change`)
  await page.untilWords('What should change', 'main', 20_000)
  await page.type({ label: 'What should change' }, words)
  await page.press('Ask for it')
  const id = await page.until(
    'the change opened',
    () => /\/conversations\/([^/?]+)/.exec(location.pathname)?.[1] ?? '',
    [],
    60_000,
  )
  await page.until(
    'its plan, ready for a yes',
    (yes: string[]) =>
      [...document.querySelectorAll('button')].some((b) =>
        yes.includes(b.textContent?.trim() ?? ''),
      ),
    [YES],
    5 * MINUTE,
  )
  log(`asked "${words}": ${id}, planned`)
  return id
}

// ---- the steps ----

async function check() {
  const doctor = await fetch(`${APP}/api/__doctor`).then(
    async (r) => `${r.status} ${await r.text()}`,
    (e) => `nothing (${String(e)})`,
  )
  report.check(
    'our server answers through the edge',
    doctor.includes('manifest-app'),
    doctor,
  )
  const ours = await fetch('http://127.0.0.1:7105/auth/login?returnTo=/', {
    redirect: 'manual',
  }).catch(() => undefined)
  report.check(
    'our server is in EDGE mode (7105 proxies no /auth to the mock)',
    ours !== undefined && ours.status !== 302,
    `7105's /auth/login answered ${ours?.status}`,
  )
  const me = await fetch(`${APP}/v1/me`).catch(() => undefined)
  report.check(
    'the platform answers through the edge (401 unsigned)',
    me?.status === 401,
    `${me?.status}`,
  )
  const mail = await fetch(`${MAILPIT}/api/v1/info`).catch(() => undefined)
  report.check('Mailpit answers', mail?.ok === true, `${mail?.status}`)
  report.check(
    'Node trusts the platform CA',
    (process.env['NODE_EXTRA_CA_CERTS'] ?? '').endsWith('manifest-root.crt'),
  )
}

async function signEveryoneIn() {
  for (const user of ['instructor', 'colleague', 'operator']) {
    const person = await as(user)
    const me = person.me as Record<string, unknown>
    log(
      `${user} signed in: ${short({ role: me['role'], mayBuild: me['mayBuild'], email: me['email'] })}`,
    )
  }
  report.check(
    'operator is an administrator (the grant is still there)',
    field((await as('operator')).me, 'role') === 'admin',
    field((await as('operator')).me, 'role'),
  )
}

async function adopt(slug: string) {
  const owner = await as('instructor')
  const projects = list((await owner.call('GET', '/v1/projects')).body, 'projects')
  const project = projects.find((p) => field(p, 'slug') === slug)
  if (project === undefined) throw new Error(`instructor keeps no app '${slug}' on 7100`)
  const projectId = field(project, 'id')
  const name = field(project, 'name')
  save({ started: new Date().toISOString(), projectId, slug, name })
  log(
    `the app: ${name} (${slug}), ${projectId}, launched ${field(project, 'launchedAt')}, ${field(project, 'state')}`,
  )
  const members = await membersOf(owner, projectId)
  log(`its members: ${members.map((m) => `${m.cwlLogin} (${m.role})`).join(', ')}`)
  const active = (await tokensOf(owner, projectId)).filter(
    (t) => !t.revokedAt && !t.expired,
  )
  log(
    `its active tokens: ${active.map((t) => `${t.name} ${t.id.slice(0, 8)}`).join(', ') || 'none'}`,
  )
  const waiting = (await questionsOf(owner, projectId)).filter(
    (q) => q.state === 'pending',
  )
  log(
    `its questions waiting: ${waiting.map((q) => `${q.action} ${q.id.slice(0, 8)}`).join(', ') || 'none'}`,
  )
  await readiness(owner, projectId, 'now')
  report.check(
    'launched, active, instructor its owner, colleague not on it',
    field(project, 'launchedAt') !== '' &&
      field(project, 'state') === 'active' &&
      members.some((m) => m.cwlLogin === 'instructor' && m.role === 'owner') &&
      !members.some((m) => m.cwlLogin === 'colleague'),
    members.map((m) => m.cwlLogin).join(', '),
  )
}

async function quiet() {
  const projectId = need('projectId')
  const slug = need('slug')
  const page = await tabFor('instructor')
  await atEachWidth(page, `/apps/${slug}`, 'Switching it off', 'overview')
  await atEachWidth(page, `/apps/${slug}/people`, 'Add someone', 'people')
  await atEachWidth(page, `/apps/${slug}/agents`, 'Our agents', 'agents')
  const owner = await as('instructor')
  let watching: unknown = {}
  for (let i = 0; i < 15 && field(watching, 'watching') !== 'true'; i++) {
    await sleep(1_000)
    watching = (await owner.call('GET', `/api/apps/${projectId}/keeping`)).body
  }
  report.check(
    'our watch minted by the page and kept',
    field(watching, 'watching') === 'true' && field(watching, 'mine') === 'true',
    `mine ${field(watching, 'mine')}, until ${field(watching, 'until')}`,
  )
}

async function helper() {
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const page = await tabFor('instructor')
  await page.go(`/apps/${slug}/people`)
  await page.untilWords('Add someone', 'main', 20_000)
  await page.type({ label: 'Their CWL login or email' }, 'colleague')
  await page.press('Helper', { role: 'radio' })
  await page.press('Add them')
  const colleagueName = await nameOf('colleague')
  await signInAgainIfAsked(page, 'instructor', 'people', [colleagueName])
  // Back from the second sign-in, the name and role kept: Add them once more, as they would.
  if (!(await page.words('main')).includes(colleagueName)) {
    const kept = await page.run(
      () =>
        (document.querySelector('.people__add input') as HTMLInputElement | null)
          ?.value ?? '',
    )
    log(`back at People: the field holds '${kept}'`)
    if (kept === '') await page.type({ label: 'Their CWL login or email' }, 'colleague')
    await page.press('Add them')
  }
  await page.untilWords(colleagueName, 'main', 30_000)
  await held(page, 'people-with-a-helper')
  const owner = await as('instructor')
  const members = await membersOf(owner, projectId)
  const colleague = members.find((m) => m.cwlLogin === 'colleague')
  report.check(
    'colleague is on it, a helper',
    colleague?.role === 'collaborator',
    short(colleague),
  )
  await sleep(MINUTE)
  const told = (
    await Promise.all(
      ['instructor', 'colleague'].map(async (u) => mailTo(await emailOf(u))),
    )
  )
    .flat()
    .filter((m) => m.Subject.startsWith(`${name}:`) && m.Subject.includes('was added'))
  report.check(
    "who's on it changed: nobody emailed (instructor, the only owner, did it; colleague is whom)",
    told.length === 0,
    told.map((m) => m.Subject).join(' | '),
  )
}

async function theirs() {
  const slug = need('slug')
  const colleagueTab = await tabFor('colleague')
  // A change of theirs planned already (a run before this one stopped short): theirs again.
  const colleague = await as('colleague')
  const planned = (
    list(
      (await colleague.call('GET', `/api/apps/${need('projectId')}/conversations`)).body,
      'conversations',
    ) as { id: string; state: string; by: { id: string } }[]
  ).find((c) => c.state === 'plan-ready' && c.by.id === field(colleague.me, 'id'))
  const id =
    planned?.id ??
    (await askChange(colleagueTab, slug, 'Show the week number at the top of each page.'))
  if (planned) log(`colleague's change planned already: ${planned.id}`)
  save({ theirs: id })
  const colleagueName = await nameOf('colleague')
  const owner = await tabFor('instructor')
  await owner.go(`/apps/${slug}/conversations`)
  await owner.untilWords(colleagueName, 'main', 20_000)
  await held(owner, 'conversations-with-theirs')
  for (const width of WIDTHS) {
    await owner.setWidth(width)
    await owner.go(`/apps/${slug}/conversations/${id}`)
    await owner.untilWords(colleagueName, 'main', 20_000)
    const buttons = (await owner.names('button')).map((b) => b.name)
    report.check(
      `${width}: theirs, read-only: no Yes, no box; an owner's Stop`,
      !buttons.some((b) => YES.includes(b)) && buttons.includes('Stop'),
      buttons.join(', '),
    )
    await held(owner, `theirs-read-only at ${width}`)
  }
  await owner.setWidth(WIDTHS[0]!)
  await owner.press('Stop')
  const person = await as('instructor')
  let stateNow = ''
  for (let i = 0; i < 20 && stateNow !== 'set-aside'; i++) {
    await sleep(500)
    stateNow = field((await person.call('GET', `/api/conversations/${id}`)).body, 'state')
  }
  report.check(
    "instructor's Stop on colleague's change: set aside",
    stateNow === 'set-aside',
    stateNow,
  )
  await colleagueTab.go(`/apps/${slug}/conversations/${id}`)
  await colleagueTab.untilWords(
    `Stopped by ${await nameOf('instructor')}.`,
    'main',
    20_000,
  )
  await held(colleagueTab, 'theirs-stopped-by')
}

async function change() {
  const projectId = need('projectId')
  const slug = need('slug')
  const page = await tabFor('instructor')
  // A change asked already (a run before this one stopped short): taken up where it is.
  const asked = state().change
  if (asked !== undefined) {
    await page.go(`/apps/${slug}/conversations/${asked}`)
    log(`the change asked already: ${asked}`)
  } else {
    const id = await askChange(
      page,
      slug,
      "Let it look up each reading's book on openlibrary.org, and show the book's cover and publisher beside the reading's title.",
    )
    save({ change: id })
    await held(page, 'change-planned')
    await page.press('Yes, change it')
  }
  const end = await page.until(
    'the round ends: ready, or it needs them',
    () => {
      const text = document.body.textContent ?? ''
      return text.includes('Ready on your draft address.')
        ? 'ready'
        : text.includes('Needs you')
          ? 'needs'
          : ''
    },
    [],
    25 * MINUTE,
  )
  await held(page, `change-${end}`)
  const words = await page.words('main')
  log(`the round: ${end}; ${words.slice(0, 600)}`)
  report.check(
    "built, and the kind of change said: an administrator's look, for what it can reach",
    end === 'ready' &&
      words.includes("This change needs a Manifest administrator's look") &&
      words.includes('what it can reach'),
    end,
  )
  if (end !== 'ready') return
  await page.press('Put this version on trying-out')
  // The question is asked once the page has read the version (put.tsx's `ask`).
  await page.until(
    'the question: put it there?',
    () =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Put it there',
      ),
    [],
    30_000,
  )
  await page.press('Put it there')
  await page.untilWords("It's on the trying-out address.", 'main', 3 * MINUTE)
  await held(page, 'change-on-trying-out')
  const owner = await as('instructor')
  await readiness(owner, projectId, 'on trying-out')
  await page.go(`/apps/${slug}`)
  await page.untilWords('Waiting to reach your students', 'main', 30_000)
  await held(page, 'overview-waiting-sign-off')
  await page.press('Ask a Manifest administrator to sign this off')
  await page.type(
    { label: 'Anything they should know?' },
    'The walk on 7100: a host it can reach.',
  )
  await page.press('Ask them')
  await page.untilWords('asked', 'main', 30_000)
  await held(page, 'overview-sign-off-asked')
  // The administrator's look: operator, in their own session (the console's job).
  const admin = await as('operator')
  const releaseId = field(
    await readiness(owner, projectId, 'asked'),
    'candidateReleaseId',
  )
  const preview = await stepped(admin, () =>
    admin.change('POST', `/v1/releases/${releaseId}/approval-preview`),
  )
  const approved = await stepped(admin, () =>
    admin.change('POST', `/v1/releases/${releaseId}/approve`, {
      previewId: field(preview.body, 'id'),
      reason: 'The walk on 7100: one host added.',
    }),
  )
  log(
    `operator's sign-off: preview ${preview.status}, approve ${approved.status} ${approved.status >= 400 ? short(approved.body) : ''}`,
  )
  await page.go(`/apps/${slug}`)
  await page.untilWords('Let your students have this version', 'main', 30_000)
  await held(page, 'overview-signed-off')
  await page.press('Let your students have this version')
  await signInAgainIfAsked(page, 'instructor', 'new-version', ['Your students have'])
  if (
    (await page.names('button')).some(
      (b) => b.name === 'Let your students have this version',
    )
  )
    await page.press('Let your students have this version')
  let served = ''
  for (let i = 0; i < 60 && served !== releaseId; i++) {
    await sleep(3_000)
    served = field(await production(owner, projectId), 'instance', 'releaseId')
  }
  report.check(
    'let through to students: production serves the version signed off',
    served === releaseId,
    `${served} vs ${releaseId}`,
  )
  await page.go(`/apps/${slug}`)
  await page.untilWords('Switching it off', 'main', 30_000)
  await held(page, 'overview-after')
}

async function agent() {
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const page = await tabFor('instructor')
  // An agent a run before this one made and never revoked (its key shown once, and lost): revoked.
  const maker = await as('instructor')
  for (const old of (await tokensOf(maker, projectId)).filter(
    (t) => t.name === 'Reading helper' && !t.revokedAt && !t.expired,
  )) {
    const revoked = await maker.change('DELETE', `/v1/tokens/${old.id}`)
    log(`an agent a run before left, ${old.id.slice(0, 8)}: revoked ${revoked.status}`)
  }
  await page.go(`/apps/${slug}/agents`)
  await page.untilWords('Our agents', 'main', 20_000)
  await page.type({ label: 'What do you call it?' }, 'Reading helper')
  await page.press('read the app', { role: 'checkbox' })
  await page.press('Make it')
  await page.untilWords('Made. Give your agent this key:', 'main', 30_000)
  // The key from its own element in mono: the page's text runs it into the next words ("…Copy").
  const key = await page.run(
    () =>
      [...document.querySelectorAll('main .mono')]
        .map((element) => element.textContent?.trim() ?? '')
        .find((text) => /^mft_\S+$/.test(text)) ?? '',
  )
  report.check(
    'the key shown once, in mono',
    key.startsWith('mft_'),
    `${key.slice(0, 8)}…`,
  )
  await held(page, 'agents-key-shown')
  await page.press('Done')
  report.check('Done puts the key away', !(await page.words('main')).includes(key))
  // The agent asks to add someone: a question for an owner (TOKEN_ACTION_PENDING).
  const response = await fetch(`${APP}/v1/projects/${projectId}/members`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify({ cwlLogin: 'student', role: 'collaborator' }),
  })
  const body = (await response.json().catch(() => ({}))) as unknown
  const pendingActionId =
    field(body, 'error', 'details', 'pendingActionId') ||
    field(body, 'pendingActionId') ||
    field(body, 'error', 'pendingActionId')
  log(`the agent's addMember: ${response.status} ${short(body)}`)
  const owner = await as('instructor')
  const tokens = await tokensOf(owner, projectId)
  const agentToken = tokens.find((t) => t.name === 'Reading helper' && !t.revokedAt)
  save({ agentTokenId: agentToken?.id ?? '', pendingActionId })
  const waiting = (await questionsOf(owner, projectId)).filter(
    (q) => q.state === 'pending' && q.tokenId === agentToken?.id,
  )
  report.check(
    "the agent's addMember is a question for an owner",
    waiting.length === 1 && waiting[0]!.action === 'members:manage',
    `${response.status} ${field(body, 'error', 'code')}; ${short(waiting)}`,
  )
  await page.go(`/apps/${slug}`)
  await page.untilWords(`${name}: your agent is asking something.`, 'main', 2 * MINUTE)
  await held(page, 'overview-band-agent-asks')
  const subject = `${name}: your agent is asking something`
  const toOwner = await untilMail(await emailOf('instructor'), subject, 3 * MINUTE)
  const toHelper = (await mailTo(await emailOf('colleague'))).filter(
    (m) => m.Subject === subject,
  )
  report.check(
    `"${subject}": to instructor (the owner), never to colleague (a helper)`,
    toOwner.length === 1 && toHelper.length === 0,
    `instructor ${toOwner.length}, colleague ${toHelper.length}`,
  )
  await page.go(`/apps/${slug}/agents`)
  await page.untilWords('What your agents are asking', 'main', 30_000)
  await held(page, 'agents-question')
  await page.type(
    { label: 'Tell it why' },
    'Students join through their course, not through an agent.',
  )
  await page.press('No')
  await page.untilWords('You said no, and it has been told.', 'main', 30_000)
  const answered = (await questionsOf(owner, projectId)).find(
    (q) => q.id === waiting[0]?.id,
  )
  report.check(
    'answered No: the question rejected',
    answered?.state === 'rejected',
    short(answered),
  )
  await page.go(`/apps/${slug}`)
  await page.untilWords('Switching it off', 'main', 30_000)
  report.check(
    'the band forgets it',
    !(await page.words('main')).includes('your agent is asking something'),
  )
  // Revoked, from its row: asked in place.
  await page.go(`/apps/${slug}/agents`)
  await page.untilWords('Reading helper', 'main', 30_000)
  const revokes = (await page.names('button')).filter((b) => b.name.startsWith('Revoke'))
  log(`Revoke buttons: ${revokes.map((b) => b.name).join(', ')}`)
  await page.press(
    revokes.length === 1 ? revokes[0]!.name : /^Revoke/,
    revokes.length === 1 ? {} : { nth: 0 },
  )
  await page.untilWords(
    "Revoke it? It stops working at once, and that can't be undone.",
    'main',
    10_000,
  )
  await page.press('Revoke it')
  await page.untilWords(`Revoked. It can't do anything on ${name} now.`, 'main', 30_000)
  const revoked = (await tokensOf(owner, projectId)).find((t) => t.id === agentToken?.id)
  report.check(
    'the agent revoked',
    revoked?.revokedAt !== null && revoked?.revokedAt !== undefined,
    short(revoked),
  )
}

async function off() {
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const colleagueTab = await tabFor('colleague')
  // A change of theirs planned already (a run before this one stopped short): theirs still.
  const colleague = await as('colleague')
  const theirsNow = (
    list(
      (await colleague.call('GET', `/api/apps/${projectId}/conversations`)).body,
      'conversations',
    ) as { id: string; state: string; by: { id: string } }[]
  ).filter(
    (c) =>
      ['plan-ready', 'waiting', 'planning'].includes(c.state) &&
      c.by.id === field(colleague.me, 'id'),
  )
  const id =
    theirsNow.find((c) => c.state === 'plan-ready')?.id ??
    (await askChange(colleagueTab, slug, 'Add a reading list for week one.'))
  log(
    `colleague's work on it: ${theirsNow.map((c) => `${c.id.slice(0, 8)} ${c.state}`).join(', ') || id}`,
  )
  save({ last: id })
  const page = await tabFor('instructor')
  const colleagueName = await nameOf('colleague')
  await page.go(`/apps/${slug}/people`)
  await page.untilWords(colleagueName, 'main', 20_000)
  // Take off in colleague's row: their own row has one too (to leave), and it comes first.
  const takeOff = async () => {
    await page.run((who: string) => {
      const row = [...document.querySelectorAll('li')].find((li) =>
        (li.textContent ?? '').includes(who),
      )
      const button = [...(row?.querySelectorAll('button') ?? [])].find(
        (b) => b.textContent?.trim() === 'Take off',
      )
      if (!button) throw new Error(`no Take off in ${who}'s row`)
      button.click()
    }, colleagueName)
    await page.untilWords('Their work on it stops.', 'main', 10_000)
    await page.press('Take them off')
  }
  await takeOff()
  // Back from the second sign-in, the press is theirs to make again.
  if (await signInAgainIfAsked(page, 'instructor', 'people', ['has stopped.']))
    await takeOff()
  await page.untilWords(`${colleagueName}'s work on ${name} has stopped.`, 'main', 30_000)
  await held(page, 'people-taken-off')
  const owner = await as('instructor')
  let stateNow = ''
  for (let i = 0; i < 30 && stateNow !== 'set-aside'; i++) {
    await sleep(1_000)
    stateNow = field((await owner.call('GET', `/api/conversations/${id}`)).body, 'state')
  }
  const theirOwn = (await colleague.call('GET', `/api/conversations/${id}`)).status
  const members = await membersOf(owner, projectId)
  report.check(
    "colleague taken off: their work ended here, theirs no more (404), still the owner's to read",
    stateNow === 'set-aside' &&
      theirOwn === 404 &&
      !members.some((m) => m.cwlLogin === 'colleague'),
    `${stateNow}; colleague reads their own → ${theirOwn}`,
  )
  await page.go(`/apps/${slug}/conversations/${id}`)
  await page.untilWords(
    `${colleagueName} was taken off ${name}. Their work on it stopped.`,
    'main',
    20_000,
  )
  await held(page, 'theirs-taken-off')
}

async function tidy() {
  const projectId = need('projectId')
  const owner = await as('instructor')
  const minted = (await owner.call('GET', `/api/apps/${projectId}/minted`)).body
  // Every token our server knows: ours, and the agents our page let in. Anything else active was
  // minted under an older dev database (sitting 1's watch, conversation and measurement tokens: the
  // whole-branch review's M4), and Agents would list it under Your agents at Rich's click.
  const ours = new Set([
    ...(list(minted, 'ours') as { tokenId: string }[]).map((t) => t.tokenId),
    ...(list(minted, 'agents') as { tokenId: string }[]).map((t) => t.tokenId),
  ])
  const active = (await tokensOf(owner, projectId)).filter(
    (t) => !t.revokedAt && !t.expired,
  )
  for (const token of active.filter((t) => !ours.has(t.id))) {
    // Only its minter may revoke it (S1: M5): another's answers 404, and is said.
    const revoked = await owner.change('DELETE', `/v1/tokens/${token.id}`)
    log(
      `a leftover token '${token.name}' ${token.id.slice(0, 8)} (last used ${token.lastUsedAt}): revoked ${revoked.status}`,
    )
  }
  for (const question of (await questionsOf(owner, projectId)).filter(
    (q) => q.state === 'pending',
  )) {
    const rejected = await owner.change(
      'POST',
      `/v1/pending-actions/${question.id}/reject`,
      {
        reason: 'Left from a walk.',
      },
    )
    log(
      `a question left (${question.action} ${question.id.slice(0, 8)}): answered no ${rejected.status}`,
    )
  }
  const left = (await tokensOf(owner, projectId)).filter(
    (t) => !t.revokedAt && !t.expired,
  )
  log(
    `active tokens now: ${left.map((t) => `${t.name} ${t.id.slice(0, 8)}${ours.has(t.id) ? ' (ours)' : ''}`).join(', ')}`,
  )
  report.check(
    'every active token is one our server knows',
    left.every((t) => ours.has(t.id)),
    `${left.length} active, ${left.filter((t) => !ours.has(t.id)).length} not ours`,
  )
}

async function mail() {
  const lines: string[] = [`# Every email the walk caused (since ${need('started')})`, '']
  const seen = new Set<string>()
  for (const user of ['instructor', 'colleague', 'operator']) {
    for (const message of await mailTo(await emailOf(user))) {
      if (seen.has(message.ID)) continue
      seen.add(message.ID)
      const full = (await (
        await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)
      ).json()) as {
        Text: string
      }
      lines.push(
        `## ${message.Subject}`,
        '',
        `To: ${message.To.map((t) => t.Address).join(', ')} · ${message.Created}`,
        '',
        '```',
        full.Text.trim(),
        '```',
        '',
      )
    }
  }
  writeFileSync(join(OUT, 'emails.md'), lines.join('\n'))
  log(`${seen.size} emails, word for word, in ${join(OUT, 'emails.md')}`)
}

const steps: Record<string, () => Promise<unknown>> = {
  check,
  people: signEveryoneIn,
  app: () => adopt(arg ?? 'f6b-measure-1'),
  quiet,
  helper,
  theirs,
  change,
  agent,
  off,
  tidy,
  mail,
}
const run = steps[step]
if (run === undefined) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
  process.exit(step === 'help' ? 0 : 2)
}
try {
  await run()
} catch (error) {
  report.check(`${step} ran to its end`, false, String(error).slice(0, 1500))
}
report.finish(tabs)
