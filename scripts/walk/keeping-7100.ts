/**
 * F6'S WALK ON THE REAL PLATFORM (the plan's Task 12, Step 3): moments 16, 19 and 20 through
 * `https://app.manifest.internal`, on an app launched for it, at Rich's word, in a window the
 * running platform sitting gives. Written by sitting 7's unattended half (2026-10-02) and NOT RUN
 * on 7100 then (no 7100 that night): its first run on 7100 is its proof, step by step.
 *
 * Each step is its own command, run in order, each writing what it saw to `<out>/log.txt`, its
 * screenshots beside it, and what the next step needs to `<out>/state.json`:
 *
 *   W=scripts/walk/keeping-7100.ts
 *   export NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt
 *   node $W check                 what must be true first; changes nothing anywhere
 *   node $W people                instructor, colleague, student and operator sign in once (an
 *                                 addMember names someone who has; operator's admin grant follows)
 *   node $W make <slug>           instructor makes the app (a real private repository on GitHub
 *                                 that nothing deletes): created, built, released, on trying-out
 *   node $W launch                the administrator's records, the dry run, the sign-off, the
 *                                 owner's press: live (needs operator's admin grant first)
 *   node $W quiet                 Your apps and the Overview with nothing needing them, at 1440 and
 *                                 375; our watch minted by the page
 *   node $W members               colleague added as an owner, student as a helper, in the
 *                                 owner's session: "who's on it changed" to colleague alone
 *   node $W fall --stop           (Rich's word: Docker) the live app's container stopped; the email
 *                                 and the band; a helper's line; Start it again with the second
 *                                 sign-in; answering again and its email; What happened?
 *   node $W switch                switch it off (second sign-in), 410, the card; back on, the watch
 *                                 minted again; Start it for your students; the history page
 *   node $W draft                 a draft made, then deleted from its Overview; its slug free
 *   node $W mail                  every email the walk caused, word for word, to <out>/emails.md
 *   node $W stop                  (Rich's click, Step 4; Rich's word) only stop the container again
 *
 * `OUT=<dir>` (default `$TMPDIR/keeping-7100`). `APP=<origin>` (default the edge's). The laptop
 * IdP's test people sign in with their own name as the password; THE WALK TYPES THEM (as F5's
 * acceptance and F6 sitting 1 did, each at Rich's word). Rich types his own at his click.
 *
 * Our server must be in EDGE MODE (`pnpm dev`, after stopping the mock-mode tree: ORIENTATION
 * §7), its keeper probing and emailing to Mailpit (7111/7112). Node 24 runs this file as it is.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
const OUT = process.env['OUT'] ?? join(tmpdir(), 'keeping-7100')
const STATE = join(OUT, 'state.json')
const WIDTHS = [1440, 375]
const MINUTE = 60_000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
mkdirSync(OUT, { recursive: true })

const [step = 'help', arg] = process.argv.slice(2)
const flags = new Set(process.argv.slice(3))
const report = new Report(OUT)
const log = (line: string) => report.log(`${step}: ${line}`)
const short = (body: unknown) => JSON.stringify(body).slice(0, 600)

interface State {
  started?: string
  projectId?: string
  slug?: string
  name?: string
  draftId?: string
  draftSlug?: string
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

// ---- the platform, in a person's session (Node), stepping up once when asked ----

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
const idOf = (answer: Answer) =>
  field(answer.body, 'id') || field(answer.body, 'project', 'id')
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
/** Each environment by its kind: `production`, `staging`, `sandbox`. */
async function environments(person: Person, projectId: string) {
  const answer = await person.call('GET', `/v1/projects/${projectId}/environments`)
  const list = (
    Array.isArray(answer.body)
      ? answer.body
      : JSON.parse(field(answer.body, 'environments') || '[]')
  ) as unknown[]
  return Object.fromEntries(list.map((e) => [field(e, 'kind'), e])) as Record<
    string,
    unknown
  >
}
async function readiness(person: Person, projectId: string, label: string) {
  const answer = await person.call('GET', `/v1/projects/${projectId}/launch-readiness`)
  const items = JSON.parse(field(answer.body, 'items') || '[]') as {
    id: string
    state: string
  }[]
  log(
    `the checklist ${label}: ready ${field(answer.body, 'ready')}; ${items.map((i) => `${i.id}=${i.state}`).join(' ')}`,
  )
  return answer.body
}
const membersOf = async (person: Person, projectId: string) =>
  (await person.call('GET', `/v1/projects/${projectId}/members`)).body as {
    cwlLogin: string
    email: string
    displayName: string
  }[]

/** The students' address, as our watch asks it: no redirect, routed only with the instance header. */
async function probe(url: string) {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
    await response.body?.cancel()
    return {
      status: response.status,
      routed: response.headers.has('x-manifest-instance'),
    }
  } catch (error) {
    return { status: 0, routed: false, error: String(error) }
  }
}

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
/** Until `address` has a message whose subject is `subject` (or `ms` pass). */
async function untilMail(address: string, subject: string, ms: number) {
  const end = Date.now() + ms
  for (;;) {
    const found = (await mailTo(address)).filter((m) => m.Subject === subject)
    if (found.length > 0 || Date.now() > end) return found
    await sleep(10_000)
  }
}

// ---- the browser: one Chrome, a tab per person, each signed in at the IdP ----

let chrome: Chrome | undefined
const tabs: Page[] = []
async function tabFor(user: string): Promise<Page> {
  chrome ??= await launchChrome()
  const page = await Page.open(chrome, {
    base: APP,
    out: OUT,
    allowWrites: true,
    isolated: tabs.length > 0,
  })
  tabs.push(page)
  await signInHere(page, { user })
  log(`${user} signed in at the IdP, in the browser`)
  return page
}
/** The IdP's form, filled as signInHere does (the laptop's test people). */
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
 * F5's step-up card, if the press met one: *Sign in again*, the IdP's form, and back to the same
 * button, said (*You're signed in again.*). `going` are the press's own signs that it went
 * through (its stations' name, its end, `@/` for *Your apps*), read in the page's markup so a
 * list's `aria-label` counts; never a status the page drew before the press. Answers whether the
 * second sign-in was asked.
 */
async function signInAgainIfAsked(
  page: Page,
  user: string,
  then: string,
  going: string[],
) {
  const asked = await page.until(
    `the press under way, or the second sign-in asked`,
    (signs: string[]) =>
      document.body.textContent?.includes('Sign in once more')
        ? 'asked'
        : signs.some((sign) =>
              sign === '@/'
                ? location.pathname === '/'
                : document.body.innerHTML.includes(sign),
            )
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
    (home: string, wanted: string) =>
      location.host === home && document.body.textContent?.includes('signed in again')
        ? location.href.includes(wanted) || 'said'
        : '',
    [new URL(APP).host, `then=${then}`],
    45_000,
  )
  report.check(
    `${then}: the second sign-in asked, and back to the same button, said`,
    (await page.words('main')).includes('signed in again'),
  )
  return true
}
async function atEachWidth(page: Page, path: string, wait: string, name: string) {
  for (const width of WIDTHS) {
    await page.setWidth(width)
    await page.go(path)
    await page.untilWords(wait, 'main', 20_000)
    report.check(`${name} fits at ${width}`, (await page.layout()).length === 0)
    await page.shot(name)
  }
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
  for (const user of ['instructor', 'colleague', 'student', 'operator']) {
    const person = await as(user)
    const me = person.me as Record<string, unknown>
    log(
      `${user} signed in: ${short({ role: me['role'], mayBuild: me['mayBuild'], email: me['email'] })}`,
    )
  }
  log(
    "operator's admin grant is the platform session's (`scripts/admin-grant.sh grant opr000001`, Rich's word): ask it now",
  )
}

async function make(slug: string) {
  if (!/^[a-z][a-z0-9-]{2,40}$/.test(slug))
    throw new Error(`a slug, please, not '${slug}'`)
  if (existsSync(`/Users/rich/Developer/manifest/.manifest/repos/${slug}.git`))
    throw new Error(
      `a repository named ${slug} is left from a truncation: pick another slug`,
    )
  const owner = await as('instructor')
  const free = await owner.call('GET', `/v1/slugs/${slug}`)
  log(`checkSlug ${slug}: ${short(free.body)}`)
  const name = `Keeping walk ${slug.slice(-4)}`
  const created = await owner.change('POST', '/v1/projects', {
    slug,
    name,
    blueprint: 'node-ts-mongo@1',
    starter: 'proof-app',
    audience: {
      scale: 'class',
      burst: 'synchronised',
      justification: "F6 sitting 7's walk: moments 16, 19 and 20 on the real platform",
    },
  })
  log(`createProject: ${created.status} in ${created.ms} ms`)
  if (created.status !== 201 && created.status !== 200)
    throw new Error(
      `createProject: ${short(created.body)} (SOURCE_CONFLICT: a repository of that name is on GitHub; SOURCE_GIT_FAILED: FE-41, F5 sitting 1's way round it)`,
    )
  const projectId = idOf(created)
  save({ started: new Date().toISOString(), projectId, slug, name })
  const build = await owner.change('POST', `/v1/projects/${projectId}/builds`, {})
  let built = ''
  for (let i = 0; i < 120 && !['succeeded', 'failed'].includes(built); i++) {
    await sleep(5_000)
    built = field(
      (await owner.call('GET', `/v1/builds/${field(build.body, 'id')}`)).body,
      'status',
    )
  }
  log(`the build: ${built}`)
  if (built !== 'succeeded') throw new Error(`the build: ${built}`)
  const release = await owner.change('POST', `/v1/projects/${projectId}/releases`, {
    buildId: field(build.body, 'id'),
    summary: "F6 sitting 7's walk",
  })
  const e = await environments(owner, projectId)
  const staged = await owner.change(
    'POST',
    `/v1/environments/${field(e, 'staging', 'id')}/deploy`,
    { releaseId: field(release.body, 'id') },
  )
  log(`trying-out: ${staged.status} in ${staged.ms} ms, ${field(staged.body, 'state')}`)
  report.check(
    'made, built, released, on trying-out',
    staged.status === 200 && field(staged.body, 'state') === 'healthy',
    field(staged.body, 'state'),
  )
}

async function launch() {
  const projectId = need('projectId')
  const slug = need('slug')
  const owner = await as('instructor')
  const admin = await as('operator')
  if ((admin.me as Record<string, unknown>)['role'] !== 'admin')
    throw new Error(
      "operator is not an administrator yet: ask the platform session for its admin grant (Rich's word), then run launch again",
    )
  await readiness(owner, projectId, 'before')
  // The registration, from the app's own manifest (F5 sitting 6's admin.mjs): submitted, then active.
  const e = await environments(owner, projectId)
  const tree = await owner.call('GET', `/v1/projects/${projectId}/tree`)
  const manifest = field(
    (
      await owner.call(
        'GET',
        `/v1/projects/${projectId}/file?path=manifest.yaml&ref=${field(tree.body, 'commitSha')}`,
      )
    ).body,
    'content',
  )
  const hostname = field(e, 'production', 'hostname')
  const auth = /\nauth:\n((?:[ \t]+.*\n|\s*\n)+)/.exec(manifest + '\n')?.[1] ?? ''
  const callback =
    /callback:\s*['"]?([^'"\n]+)/.exec(auth)?.[1]?.trim() ?? '/auth/ubcshib/callback'
  const logout = /logout:\s*['"]?([^'"\n]+)/.exec(auth)?.[1]?.trim() ?? '/auth/logout'
  const listed =
    /attributes:\s*(\[[^\]]*\]|\n(?:\s+-\s*.*\n)+)/.exec(auth + '\n')?.[1] ?? ''
  const attributes = listed.startsWith('[')
    ? listed
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    : [...listed.matchAll(/-\s*['"]?([^'"\n]+)/g)].map((m) => (m[1] ?? '').trim())
  for (const iamState of ['submitted', 'active']) {
    const r = await admin.change(
      'POST',
      `/v1/projects/${projectId}/launch-records/iam-registration`,
      {
        entityId: `https://manifest.internal/sp/${slug}/production`,
        acsUrl: `https://${hostname}${callback}`,
        sloUrl: `https://${hostname}${logout}`,
        registeredAttributes: attributes,
        state: iamState,
        externalTicketRef: 'F6-S7-IAM-1',
      },
    )
    log(
      `recordIamRegistration ${iamState}: ${r.status} ${r.status >= 400 ? short(r.body) : ''}`,
    )
  }
  for (const privacyState of ['submitted', 'approved']) {
    const r = await admin.change(
      'POST',
      `/v1/projects/${projectId}/launch-records/privacy-assessment`,
      {
        state: privacyState,
        ...(privacyState === 'approved'
          ? { reviewer: "F6 sitting 7's walk (a pretend Privacy Office)" }
          : {}),
        externalTicketRef: 'F6-S7-PIA-1',
      },
    )
    log(
      `recordPrivacyAssessment ${privacyState}: ${r.status} ${r.status >= 400 ? short(r.body) : ''}`,
    )
  }
  // The dry run: the owner's since the platform's 5b (F6 sitting 1), stepped up when asked.
  let rehearsed = await stepped(
    owner,
    () => owner.change('POST', `/v1/projects/${projectId}/rehearsal`),
    `/apps/${slug}/going-live?then=dry-run`,
  )
  if (
    rehearsed.status === 403 &&
    field(rehearsed.body, 'error', 'code') !== 'STEP_UP_REQUIRED'
  )
    rehearsed = await stepped(admin, () =>
      admin.change('POST', `/v1/projects/${projectId}/rehearsal`),
    )
  log(
    `the dry run: ${rehearsed.status} in ${rehearsed.ms} ms, passed ${field(rehearsed.body, 'passed') || short(rehearsed.body)}`,
  )
  const releaseId = field(
    await readiness(owner, projectId, 'after the dry run'),
    'candidateReleaseId',
  )
  const preview = await stepped(admin, () =>
    admin.change('POST', `/v1/releases/${releaseId}/approval-preview`),
  )
  const approved = await stepped(admin, () =>
    admin.change('POST', `/v1/releases/${releaseId}/approve`, {
      previewId: field(preview.body, 'id'),
      reason: "F6 sitting 7's walk",
    }),
  )
  log(
    `the sign-off: preview ${preview.status}, approve ${approved.status} ${approved.status >= 400 ? short(approved.body) : ''}`,
  )
  await readiness(owner, projectId, 'after the sign-off')
  const live = await stepped(
    owner,
    () =>
      owner.change('POST', `/v1/environments/${field(e, 'production', 'id')}/deploy`, {
        releaseId,
      }),
    `/apps/${slug}/going-live?then=live`,
  )
  log(
    `the owner's press: ${live.status} in ${live.ms} ms, ${field(live.body, 'state') || short(live.body)}`,
  )
  const launchedAt = field(
    (await owner.call('GET', `/v1/projects/${projectId}`)).body,
    'launchedAt',
  )
  report.check('live', launchedAt !== '', `launchedAt ${launchedAt}`)
  const address = await probe(field(e, 'production', 'url'))
  report.check("the students' address answers, routed", address.routed, short(address))
}

async function quiet() {
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const page = await tabFor('instructor')
  await atEachWidth(page, '/', name, 'your-apps-quiet')
  report.check(
    'Your apps: nothing needs them (no band)',
    !(await page.run(() => !!document.querySelector('[aria-label="What needs you"]'))),
  )
  await atEachWidth(page, `/apps/${slug}`, 'Switching it off', 'overview-quiet')
  report.check(
    'the Overview: no band',
    !(await page.run(() => !!document.querySelector('[aria-label="What needs you"]'))),
  )
  // Drawn once the app has been live (the Overview's `seen.launched`).
  report.check(
    'the Overview: How we keep watch, said of this app',
    (await page.words('main')).includes(
      `Once a minute, we check that your students can reach ${name}.`,
    ),
  )
  const owner = await as('instructor')
  let watching: unknown = {}
  for (let i = 0; i < 15 && field(watching, 'watching') !== 'true'; i++) {
    await sleep(1_000)
    watching = (await owner.call('GET', `/api/apps/${projectId}/keeping`)).body
  }
  report.check(
    'our watch minted by the page and kept',
    field(watching, 'watching') === 'true',
    `mine ${field(watching, 'mine')}, until ${field(watching, 'until')}`,
  )
}

async function members() {
  const projectId = need('projectId')
  const name = need('name')
  const owner = await as('instructor')
  for (const [cwlLogin, role] of [
    ['colleague', 'owner'],
    ['student', 'collaborator'],
  ] as const) {
    const added = await stepped(owner, () =>
      owner.change('POST', `/v1/projects/${projectId}/members`, { cwlLogin, role }),
    )
    log(
      `addMember ${cwlLogin} as ${role}: ${added.status} ${added.status >= 400 ? short(added.body) : ''}`,
    )
  }
  const list = await membersOf(owner, projectId)
  const of = (login: string) => list.find((m) => m.cwlLogin === login)
  const student = of('student')
  const subject = `${name}: ${student?.displayName ?? 'someone'} was added`
  const toColleague = await untilMail(of('colleague')?.email ?? '', subject, 3 * MINUTE)
  const toInstructor = (await mailTo(of('instructor')?.email ?? '')).filter((m) =>
    m.Subject.includes('was added'),
  )
  const toStudent = (await mailTo(student?.email ?? '')).filter((m) =>
    m.Subject.includes('was added'),
  )
  report.check(
    `"${subject}": to colleague (the other owner), never to instructor (who did it) nor student`,
    toColleague.length === 1 && toInstructor.length === 0 && toStudent.length === 0,
    `colleague ${toColleague.length}, instructor ${toInstructor.length}, student ${toStudent.length}`,
  )
}

async function stopContainer(projectId: string, slug: string) {
  const owner = await as('instructor')
  const e = await environments(owner, projectId)
  const production = (
    await owner.call('GET', `/v1/environments/${field(e, 'production', 'id')}`)
  ).body
  const instanceId = field(production, 'instance', 'id')
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((n) => n.startsWith('mf-') && n.includes(slug))
  // One container: the production instance's app. Never a manifest-* one (F6 sitting 1, M6).
  const target = names.filter(
    (n) =>
      n.includes('-production-') &&
      n.endsWith('-app') &&
      instanceId !== '' &&
      n.includes(instanceId.slice(0, 8)),
  )
  if (target.length !== 1 || !target[0]?.startsWith('mf-'))
    throw new Error(`no single production app container to stop: ${names.join(', ')}`)
  log(`stopping ${target[0]} (Rich's word)`)
  execFileSync('docker', ['stop', target[0]])
  return { url: field(e, 'production', 'url') }
}

async function fall() {
  if (!flags.has('--stop'))
    throw new Error(
      "the fall stops a container on the platform's Docker: Rich's word, then --stop",
    )
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const owner = await as('instructor')
  const list = await membersOf(owner, projectId)
  const email = (login: string) => list.find((m) => m.cwlLogin === login)?.email ?? ''
  const stoppedAt = Date.now()
  const { url } = await stopContainer(projectId, slug)
  log(`the address at once: ${short(await probe(url))}`)
  // Two misses a minute apart: the email within about three minutes.
  const cantReach = `${name}: your students can't reach it`
  const toInstructor = await untilMail(email('instructor'), cantReach, 5 * MINUTE)
  const toColleague = await untilMail(email('colleague'), cantReach, MINUTE)
  const toStudent = (await mailTo(email('student'))).filter(
    (m) => m.Subject === cantReach,
  )
  report.check(
    `"${cantReach}": once to each owner, in ${Math.round((Date.now() - stoppedAt) / 1000)} s; not to the helper`,
    toInstructor.length === 1 && toColleague.length === 1 && toStudent.length === 0,
    `instructor ${toInstructor.length}, colleague ${toColleague.length}, student ${toStudent.length}`,
  )
  // A helper's band: the line, and no button (Review Focus 5).
  const helper = await tabFor('student')
  await helper.go(`/apps/${slug}`)
  await helper.untilWords(`${name}: your students can't reach it`, 'main', 30_000)
  report.check(
    "the helper's band: can't reach it, An owner can start it again., no Start it again",
    (await helper.words('main')).includes('An owner can start it again.') &&
      !(await helper.names('button')).some((b) => b.name === 'Start it again'),
  )
  await helper.shot('band-down-helper')
  // The owner's band, at both widths, then Start it again.
  const page = await tabFor('instructor')
  await atEachWidth(
    page,
    `/apps/${slug}`,
    `${name}: your students can't reach it`,
    'band-down-owner',
  )
  await page.setWidth(1440)
  await page.press('Start it again')
  if (
    await signInAgainIfAsked(page, 'instructor', 'start-again', [
      'Starting it again',
      "It's answering again.",
    ])
  )
    await page.press('Start it again')
  await page.untilWords("It's answering again.", 'main', 3 * MINUTE)
  await page.shot('started-again')
  report.check("Start it again: It's answering again.", true)
  report.check("the students' address answers again, routed", (await probe(url)).routed)
  // Three answers a minute apart: answering again, and its email.
  const answering = `${name} is answering again`
  const back = await untilMail(email('instructor'), answering, 6 * MINUTE)
  report.check(`"${answering}": to instructor`, back.length === 1, `${back.length}`)
  report.check(
    `"${answering}": to colleague`,
    (await untilMail(email('colleague'), answering, MINUTE)).length === 1,
  )
  await atEachWidth(page, `/apps/${slug}`, 'answering again since', 'band-answering')
  await page.setWidth(1440)
  await page.press('What happened?')
  await page.untilWords("Your students couldn't reach it", 'main', 30_000)
  await page.shot('what-happened')
  report.check(
    "What happened?: the outage's conversation, opened",
    (await page.run(() => location.pathname)).includes('/conversations'),
  )
}

async function switching() {
  const projectId = need('projectId')
  const slug = need('slug')
  const name = need('name')
  const owner = await as('instructor')
  const url = field(await environments(owner, projectId), 'production', 'url')
  const page = await tabFor('instructor')
  await page.go(`/apps/${slug}`)
  await page.untilWords('Switching it off', 'main', 20_000)
  await page.press('Switch it off')
  await page.untilWords('Everything is kept', 'main')
  await page.shot('confirm-off')
  await page.press('Switch it off')
  if (
    await signInAgainIfAsked(page, 'instructor', 'switch-off', [
      'Switched off, ',
      "we didn't finish tidying up",
    ])
  )
    await page.press('Switch it off')
  await page.untilWords('Switched off, ', 'main', 30_000)
  report.check(
    "switched off: the students' address answers 410",
    (await probe(url)).status === 410,
  )
  const before = (await owner.call('GET', `/api/apps/${projectId}/keeping`)).body
  log(
    `our watch while switched off: watching ${field(before, 'watching')}, token ${field(before, 'tokenId')}`,
  )
  await atEachWidth(page, '/', `Switched off, `, 'card-switched-off')
  await page.setWidth(1440)
  await page.go(`/apps/${slug}`)
  await page.untilWords('Switch it back on', 'main', 20_000)
  await page.press('Switch it back on')
  await page.untilWords("It's back, but not running yet.", 'main', 30_000)
  await page.shot('back-on')
  const minted = (body: unknown) =>
    field(body, 'watching') === 'true' &&
    field(body, 'tokenId') !== field(before, 'tokenId')
  let after: unknown = {}
  for (let i = 0; i < 20 && !minted(after); i++) {
    await sleep(1_000)
    after = (await owner.call('GET', `/api/apps/${projectId}/keeping`)).body
  }
  report.check('back on: our watch minted again, a new token', minted(after))
  await page.press('Start it for your students')
  if (
    await signInAgainIfAsked(page, 'instructor', 'students', [
      'Letting your students in',
      `${name} is live.`,
    ])
  )
    await page.press('Start it for your students')
  await page.untilWords(`${name} is live.`, 'main', 4 * MINUTE)
  await page.shot('students-again')
  report.check(
    'Start it for your students: live, the address answering',
    (await probe(url)).routed,
  )
  await atEachWidth(page, `/apps/${slug}/history`, 'Everything that happened', 'history')
  const history = await page.words('main')
  for (const line of [
    'Went live',
    'was added',
    "Your students couldn't reach it",
    'Answering again. It was down for',
    'switched it off',
    'switched it back on',
  ])
    report.check(`the history says "${line}"`, history.includes(line))
  report.check(
    'the history names no false gap',
    !history.includes("We weren't watching between"),
    history.slice(0, 300),
  )
}

async function draft() {
  const slug = `${need('slug')}-d`
  const owner = await as('instructor')
  const created = await owner.change('POST', '/v1/projects', {
    slug,
    name: 'Keeping walk draft',
    blueprint: 'node-ts-mongo@1',
    starter: 'proof-app',
    audience: {
      scale: 'class',
      burst: 'synchronised',
      justification: "F6 sitting 7's walk: a draft to delete",
    },
  })
  if (created.status !== 201 && created.status !== 200)
    throw new Error(`createProject: ${short(created.body)}`)
  const draftId = idOf(created)
  save({ draftId, draftSlug: slug })
  const page = await tabFor('instructor')
  await page.go(`/apps/${slug}`)
  await page.untilWords('Delete it', 'main', 20_000)
  await page.press('Delete it')
  await page.untilWords("This can't be undone.", 'main')
  await page.shot('confirm-delete')
  await page.press('Delete it for good')
  if (await signInAgainIfAsked(page, 'instructor', 'delete', ['@/']))
    await page.press('Delete it for good')
  await page.until(
    'Your apps, after the delete',
    () => location.pathname === '/',
    [],
    60_000,
  )
  report.check(
    'deleted: its project 404',
    (await owner.call('GET', `/v1/projects/${draftId}`)).status === 404,
  )
  const free = await owner.call('GET', `/v1/slugs/${slug}`)
  report.check(
    'its slug free',
    JSON.stringify(free.body).includes('available'),
    short(free.body),
  )
  report.check(
    'our watch forgets it',
    field((await owner.call('GET', `/api/apps/${draftId}/keeping`)).body, 'watching') !==
      'true',
  )
}

async function mail() {
  const owner = await as('instructor')
  const list = await membersOf(owner, need('projectId'))
  const lines: string[] = [
    `# Every email of F6's walk on 7100, since ${need('started')}`,
    '',
  ]
  for (const member of list) {
    for (const found of await mailTo(member.email)) {
      const message = (await (
        await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)
      ).json()) as { Text: string; Date: string }
      lines.push(
        `## ${found.Subject}`,
        '',
        `To ${member.cwlLogin} <${member.email}>, ${message.Date}`,
        '',
        '```',
        message.Text.trim(),
        '```',
        '',
      )
    }
  }
  writeFileSync(join(OUT, 'emails.md'), lines.join('\n'))
  log(
    `${lines.filter((l) => l.startsWith('## ')).length} emails written to ${join(OUT, 'emails.md')}`,
  )
}

const steps: Record<string, () => Promise<unknown>> = {
  check,
  people: signEveryoneIn,
  make: () => make(arg ?? ''),
  launch,
  quiet,
  members,
  fall,
  switch: switching,
  draft,
  mail,
  stop: async () => {
    if (!flags.has('--stop') && arg !== '--stop')
      throw new Error("Rich's word, then: stop --stop")
    const { url } = await stopContainer(need('projectId'), need('slug'))
    log(
      `stopped; the email should arrive within about three minutes. The address: ${short(await probe(url))}`,
    )
  },
}
const run = steps[step]
if (run === undefined) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
  process.exit(step === 'help' ? 0 : 2)
}
await run()
report.finish(tabs)
