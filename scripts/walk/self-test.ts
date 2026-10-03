/**
 * THE WALK LIBRARY'S OWN PROOF: every check it offers, run once against a page that has the
 * defect and once against the page without it, and every trap it closes shown open first
 * (ORIENTATION §7: "a walk's own check can pass without the fix"). Nothing of ours runs: the
 * pages, a pretend app and a pretend IdP are served here, on ports the OS picks.
 *
 *   node scripts/walk/self-test.ts [out-directory]
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHROME, launchChrome } from './chrome.ts'
import { Page } from './page.ts'
import { Report } from './report.ts'
import { Jar, sessionCookie, signIn, signInHere } from './sign-in.ts'

const out = process.argv[2] ?? mkdtempSync(join(tmpdir(), 'walk-self-test-'))
const report = new Report(out)
const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function listen(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  const server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}
const html = (
  res: ServerResponse,
  body: string,
  headers: Record<string, string> = {},
) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...headers })
  res.end(`<!doctype html><meta name="viewport" content="width=device-width">${body}`)
}
const read = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
  })

// ---- the pages ----

const VISUALLY_HIDDEN =
  '.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
const writes: string[] = []
const fixtures = await listen(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const fixed = url.searchParams.get('fixed') === '1'
  if (req.method !== 'GET') {
    writes.push(`${req.method} ${url.pathname}`)
    await read(req)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"saved":true}')
    return
  }
  switch (url.pathname) {
    case '/layout':
      // A chip past its card, inside the page; a word past its sentence's box, inside a card
      // that clips. Neither makes the page wider than the window.
      return html(
        res,
        `<main>
          <div class="mf-card" style="width:300px;border:1px solid">
            <span style="display:inline-block;white-space:nowrap;${fixed ? 'max-width:100%;white-space:normal' : 'width:340px'}">A chip that will not wrap</span>
          </div>
          <div class="mf-card" style="width:320px;overflow:hidden">
            <p style="width:300px;${fixed ? 'overflow-wrap:anywhere' : ''}">Your address is averyveryverylongaddresswithnothingtobreakitatallwhatsoever.example</p>
          </div>
        </main>`,
      )
    case '/wide':
      return html(
        res,
        `<main><div style="width:${fixed ? '100%' : '600px'}">Wide</div></main>`,
      )
    case '/names':
      return html(
        res,
        `<style>${VISUALLY_HIDDEN}</style><main><p id="said">nothing yet</p>
         <button onclick="said.textContent='copied the address'">Copy<span class="vh"> the address</span></button>
         <button onclick="said.textContent='copied the message'">Copy<span class="vh"> the message</span></button>
         <button></button></main>`,
      )
    case '/focus':
      // A link hidden below a width (the folded rail's), a ring taken away, and a ring.
      return html(
        res,
        `<style>${VISUALLY_HIDDEN} .folded{display:none} .bare:focus-visible{outline:none}</style>
         <main><a href="#a">First</a><a class="folded" href="#b">Sign out</a>
         <button class="bare">No ring</button>
         <button>Copy<span class="vh"> the address</span></button></main>`,
      )
    case '/textarea':
      return html(
        res,
        `<main><label for=":r1:">Your words</label>
         <textarea id=":r1:" rows="5" style="width:140px">The first line of a message long enough to wrap over several lines in a narrow field</textarea></main>`,
      )
    case '/later':
      return html(
        res,
        `<main><h1 id="round">Round 1</h1>
         <button onclick="setTimeout(() => round.textContent = 'Round 2', 600)">Next</button></main>`,
      )
    case '/clipboard':
      return html(
        res,
        `<main><p id="said" role="status"></p>
         <button onclick="navigator.clipboard.writeText('the address').then(() => said.textContent = 'Copied', (e) => said.textContent = e.message)">Copy</button></main>`,
      )
    case '/write':
      return html(
        res,
        `<main><p id="read">reading</p><p id="said"></p>
         <button onclick="fetch('/api/thing', { method: 'POST' }).then(r => r.json()).then(() => said.textContent = 'Saved', () => said.textContent = 'Refused')">Save</button>
         <button onclick="fetch('/api/problems', { method: 'POST', body: '{}' }).then(() => said.textContent = 'Reported')">Report</button>
         <script>fetch('/api/read').then(r => r.json()).then(b => read.textContent = JSON.stringify(b))</script></main>`,
      )
    case '/api/read':
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"from":"the server"}')
      return
  }
  res.writeHead(404)
  res.end()
})

// ---- a pretend app and a pretend IdP: the three hops, strict where the real ones are ----

const pending = new Map<string, string>() // RelayState → the login cookie the app set
const sessions = new Map<string, string>() // session → who
/**
 * The names the pretend app sets: the plain ones, as loopback http does. Section 8 switches it
 * to an https origin's (`__Host-`, FE-28) for one sign-in, while it is still served on http.
 */
let NAMES = { session: 'manifest_session', login: 'manifest_login' }
const app = await listen(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const cookies = Object.fromEntries(
    (req.headers.cookie ?? '').split('; ').map((c) => [c.split('=')[0], c.split('=')[1]]),
  )
  const who = sessions.get(cookies[NAMES.session] ?? '')
  if (url.pathname === '/auth/login' || url.pathname === '/auth/step-up') {
    const relay = crypto.randomUUID()
    const binding = crypto.randomUUID()
    pending.set(relay, binding)
    const force = url.pathname === '/auth/step-up' ? '&ForceAuthn=true' : ''
    res.writeHead(302, {
      location: `${idp.origin}/sso?RelayState=${relay}&ReturnTo=${encodeURIComponent(url.searchParams.get('returnTo') ?? '/')}${force}`,
      'set-cookie': `${NAMES.login}=${binding}; Path=/; HttpOnly`,
    })
    res.end()
    return
  }
  if (url.pathname === '/auth/acs' && req.method === 'POST') {
    const form = new URLSearchParams(await read(req))
    const relay = form.get('RelayState') ?? ''
    const [user, returnTo] = (form.get('SAMLResponse') ?? '').split('|')
    // The sign-in is bound to the "browser" that started it: hop 1's cookie must come back.
    if (!user || pending.get(relay) !== cookies[NAMES.login]) {
      res.writeHead(403)
      res.end('not the browser that started this sign-in')
      return
    }
    const session = crypto.randomUUID()
    sessions.set(session, user)
    res.writeHead(302, {
      location: returnTo ?? '/',
      'set-cookie': [
        `${NAMES.session}=${session}; Path=/; HttpOnly`,
        `${NAMES.login}=; Max-Age=0`,
      ],
    })
    res.end()
    return
  }
  if (url.pathname === '/v1/me') {
    res.writeHead(who ? 200 : 401, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify(who ? { displayName: who } : { error: { code: 'UNAUTHENTICATED' } }),
    )
    return
  }
  if (url.pathname === '/')
    return html(
      res,
      who
        ? `<nav aria-label="Manifest"></nav><main><h1>Your apps</h1><p>Signed in as ${who}</p></main>`
        : `<div class="signin"><h1>Manifest</h1><a href="/auth/login?returnTo=%2F">Continue with CWL</a></div>`,
    )
  res.writeHead(404)
  res.end()
})

const remembered = new Map<string, string>() // the IdP's session → who signed in there
const states = new Map<string, { relay: string; returnTo: string }>()
const idp = await listen(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const cookies = Object.fromEntries(
    (req.headers.cookie ?? '').split('; ').map((c) => [c.split('=')[0], c.split('=')[1]]),
  )
  const assertion = (user: string, relay: string, returnTo: string) =>
    html(
      res,
      `<form method="post" action="${app.origin}/auth/acs">
        <input type="hidden" name="SAMLResponse" value="${user}|${returnTo}">
        <input type="hidden" name="RelayState" value="${relay}"></form>
       <script>document.forms[0].submit()</script>`,
    )
  if (url.pathname === '/sso') {
    const relay = url.searchParams.get('RelayState') ?? ''
    const returnTo = url.searchParams.get('ReturnTo') ?? '/'
    // SimpleSAMLphp remembers who signed in: a second sign-in in the same jar is the first person.
    const known = remembered.get(cookies['idp_session'] ?? '')
    if (known && !url.searchParams.has('ForceAuthn'))
      return assertion(known, relay, returnTo)
    const state = `${crypto.randomUUID()}&step=1`
    states.set(state, { relay, returnTo })
    res.writeHead(302, {
      location: `/login?AuthState=${encodeURIComponent(state)}`,
      'set-cookie': `idp_session=${crypto.randomUUID()}; Path=/`,
    })
    res.end()
    return
  }
  if (url.pathname === '/login' && req.method === 'GET') {
    if (!cookies['idp_session']) return html(res, '<p>Missing cookie</p>')
    // AuthState carries a query string, HTML-escaped in the form: posted undecoded, it loops.
    const state = (url.searchParams.get('AuthState') ?? '').replace(/&/g, '&amp;')
    return html(
      res,
      `<form method="post" action="/login.php?x=1&amp;y=2">
        <input name="username"><input name="password" type="password">
        <input type="hidden" name="AuthState" value="${state}"><button>Sign in</button></form>`,
    )
  }
  if (url.pathname === '/login.php' && req.method === 'POST') {
    const form = new URLSearchParams(await read(req))
    const state = states.get(form.get('AuthState') ?? '')
    const user = form.get('username') ?? ''
    if (!state || url.search !== '?x=1&y=2' || form.get('password') !== user || !user)
      return html(res, '<form><input name="username"></form>')
    remembered.set(cookies['idp_session'] ?? '', user)
    return assertion(user, state.relay, state.returnTo)
  }
  res.writeHead(404)
  res.end()
})

// ---- 1. Chrome is stopped however a walk ends ----

const childWalk = (body: string) => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { launchChrome } from ${JSON.stringify(new URL('./chrome.ts', import.meta.url).href)}
       const chrome = await launchChrome()
       console.log(JSON.stringify({ pid: chrome.pid, profile: chrome.profile }))
       ${body}`,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  )
  const line = result.stdout.split('\n').find((l) => l.startsWith('{'))
  return {
    ...(JSON.parse(line ?? '{}') as { pid: number; profile: string }),
    status: result.status,
  }
}

const threw = childWalk(`throw new Error('the walk threw')`)
await sleep(300)
report.check(
  'a walk that throws: its Chrome stopped and its profile removed',
  threw.status === 1 && !alive(threw.pid) && !existsSync(threw.profile),
  `exit ${threw.status}, Chrome ${alive(threw.pid) ? 'ALIVE' : 'gone'}, profile ${existsSync(threw.profile) ? 'LEFT' : 'gone'}`,
)
const rejected = childWalk(
  `setTimeout(() => Promise.reject(new Error('later')), 10); await new Promise((r) => setTimeout(r, 5000))`,
)
await sleep(300)
report.check(
  'a walk with an unhandled rejection: its Chrome stopped',
  rejected.status === 1 && !alive(rejected.pid),
  `exit ${rejected.status}, Chrome ${alive(rejected.pid) ? 'ALIVE' : 'gone'}`,
)
// The trap, shown open: a Chrome with no exit handler outlives the walk that threw. Its pid is
// written plain: under FORCE_COLOR, console.log colours a number, Number() reads NaN, and the bare
// Chrome is left running (minors m74).
const bare = spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    `import { spawn } from 'node:child_process'
     const c = spawn(${JSON.stringify(CHROME)}, ['--headless=new', '--user-data-dir=' + ${JSON.stringify(join(out, 'bare-profile'))}, 'about:blank'], { stdio: 'ignore' })
     process.stdout.write(c.pid + '\\n'); await new Promise((r) => setTimeout(r, 1500)); throw new Error('threw')`,
  ],
  { encoding: 'utf8', timeout: 30_000 },
)
const barePid = Number(bare.stdout.trim())
report.check(
  'the trap, shown open: without the handler, Chrome outlives the walk that threw',
  alive(barePid),
)
try {
  process.kill(barePid, 'SIGKILL')
} catch {
  // Gone.
}
// A walk killed outright runs no handler: its Chrome is stopped at the next launch.
const killed = childWalk(`process.kill(process.pid, 'SIGKILL')`)
await sleep(500)
const orphaned = alive(killed.pid)
const chrome = await launchChrome()
await sleep(300)
report.check(
  'a walk killed with SIGKILL: its orphaned Chrome stopped, and its profile removed, at the next launch',
  orphaned && !alive(killed.pid) && !existsSync(killed.profile),
  `orphan ${orphaned ? 'was left' : 'was NOT left (no proof)'}, now ${alive(killed.pid) ? 'ALIVE' : 'gone'}, profile ${existsSync(killed.profile) ? 'LEFT' : 'gone'}`,
)
report.check(
  "Chrome's DevTools port is the OS's choice, never the platform's",
  chrome.port < 7100 || chrome.port > 7199,
  String(chrome.port),
)

// ---- 2. the layout checks: each red with its defect, green without ----

const page = await Page.open(chrome, { base: fixtures.origin, out })
await page.setWidth(375)
await page.go('/layout')
let problems = await page.layout()
report.check(
  'layout: a chip past its card is found',
  problems.some((p) => /past its card/.test(p)),
  problems.join(' | '),
)
report.check(
  'layout: a word past its sentence is found, inside a card that clips it',
  problems.some((p) => /past its own box/.test(p)),
)
report.check(
  'the trap, shown open: the page-width check alone passes with both defects on screen',
  !problems.some((p) => /the page is/.test(p)),
)
await page.go('/layout?fixed=1')
problems = await page.layout()
report.check(
  'layout: the same page fixed fits',
  problems.length === 0,
  problems.join(' | '),
)
await page.go('/wide')
problems = await page.layout()
report.check(
  'layout: a page wider than the window is found',
  problems.some((p) => /the page is \d+px wide in a 375px window/.test(p)),
  problems.join(' | '),
)
await page.go('/wide?fixed=1')
report.check('layout: and fixed, fits', (await page.layout()).length === 0)

// ---- 3. names from Chrome's accessibility tree, and pressing by them ----

await page.go('/names')
const buttons = await page.names('button')
report.check(
  "names: Chrome's, with the hidden part's leading space",
  JSON.stringify(buttons.map((b) => b.name)) ===
    JSON.stringify(['Copy the address', 'Copy the message', '']),
  JSON.stringify(buttons),
)
await page.press('Copy the message')
report.check(
  'press: the control Chrome names',
  (await page.words()).includes('copied the message'),
)
let refused = ''
await page.press(/^Copy/).catch((error: Error) => (refused = error.message))
report.check(
  'press: two controls with one name is an error that lists them',
  /2 controls named/.test(refused) && refused.includes('"Copy the address"'),
  refused.slice(0, 120),
)

// ---- 3b. the keyboard: Tab to a control by its name, and its ring ----

await page.go('/focus')
const copyKey = await page.tabTo('Copy the address')
report.check(
  'tabTo: reached by the keyboard, by its name, with its ring',
  copyKey?.presses === 3 && copyKey.ring !== '',
  JSON.stringify(copyKey),
)
const bareKey = await page.tabTo('No ring')
report.check(
  'tabTo: a ring taken away reads as none',
  bareKey?.ring === '',
  JSON.stringify(bareKey),
)
report.check(
  'tabTo: a hidden control is never reached',
  (await page.tabTo('Sign out', 10)) === undefined,
)
report.check(
  "the trap, shown open: past the last control the focus is <body>, whose text holds the hidden one's name",
  await page.run(
    () =>
      document.activeElement === document.body &&
      (document.body.textContent ?? '').includes('Sign out'),
  ),
)

// ---- 4. typing at the end of a wrapped textarea; a React id ----

await page.go('/textarea')
const value = () => document.querySelector('textarea')?.value ?? ''
await page.evaluate(`document.getElementById(':r1:').focus()`)
await page.key('End', 'End', 35)
await page.send('Input.insertText', { text: '|END' })
const naive = await page.run(value)
report.check(
  "the trap, shown open: End stops at the visual line's end",
  naive.includes('|END') && !naive.endsWith('|END'),
  JSON.stringify(naive),
)
await page.go('/textarea')
await page.type({ id: ':r1:' }, ' And the end.')
report.check(
  'type: at the end of the value, by its React id',
  (await page.run(value)).endsWith('narrow field And the end.'),
)
await page.type({ label: 'Your words' }, 'Replaced.', 'replace')
report.check(
  'type: found by its label, replacing the value',
  (await page.run(value)) === 'Replaced.',
)
report.check(
  "the trap, shown open: '#' + a React id is refused",
  await page.evaluate(`document.querySelector('#:r1:')`).then(
    () => false,
    () => true,
  ),
)

// ---- 5. waiting for the page to change ----

const round = () => document.getElementById('round')?.textContent
await page.go('/later')
await page.press('Next')
report.check(
  'the trap, shown open: a read straight after a press reads the old page',
  (await page.run(round)) === 'Round 1',
)
await page.go('/later')
const after = await page.after('Next', () => page.press('Next'), round, [])
report.check(
  'after: waits for the page to change, and reads the new one',
  after === 'Round 2',
  String(after),
)

// ---- 6. the clipboard: focus emulated, and permission granted ----
// Measured: a tab is focused only while it is in front. Another tab brought forward (a second
// person's) leaves this one "not focused", and the clipboard refuses it unless focus is
// emulated. And a click from a walk is no person's gesture: without the permission
// `Page.open` grants, the write is refused whatever the focus.

const copied = async () => {
  await page.go('/clipboard')
  await page.press('Copy')
  return page.until(
    'an answer',
    () => document.getElementById('said')?.textContent ?? '',
    [],
  )
}
const front = await Page.open(chrome, { base: fixtures.origin, out })
await front.send('Page.bringToFront')
report.check(
  'clipboard: Copy says Copied, with another tab in front',
  (await copied()) === 'Copied',
)
await page.send('Emulation.setFocusEmulationEnabled', { enabled: false })
const unfocused = await copied()
report.check(
  'the trap, shown open: another tab in front, no focus emulation: refused',
  /not focused/.test(unfocused),
  unfocused,
)
await page.send('Emulation.setFocusEmulationEnabled', { enabled: true })
await chrome.send('Browser.resetPermissions', {})
const ungranted = await copied()
report.check(
  'the trap, shown open: no permission granted: refused',
  /permission denied/i.test(ungranted),
  ungranted,
)
await chrome.send('Browser.grantPermissions', {
  origin: fixtures.origin,
  permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
})

// ---- 7. writes blocked by default; reads, reports and rewrites through ----

await page.go('/write')
await page.until(
  'the read',
  () => document.getElementById('read')?.textContent !== 'reading',
  [],
)
report.check(
  'guard: a read reaches the server',
  (await page.words()).includes('the server'),
)
await page.press('Save')
await page.untilWords('Refused')
await page.press('Report')
await page.untilWords('Reported')
report.check(
  'guard: a write is refused in the browser and listed; a problem report goes through',
  JSON.stringify(writes) === JSON.stringify(['POST /api/problems']) &&
    JSON.stringify(page.trouble.blocked) === JSON.stringify(['POST /api/thing']),
  `server saw ${JSON.stringify(writes)}; blocked ${JSON.stringify(page.trouble.blocked)}`,
)
const writer = await Page.open(chrome, { base: fixtures.origin, out, allowWrites: true })
await writer.go('/write')
await writer.press('Save')
await writer.untilWords('Saved')
report.check(
  'guard: a walk that allows writes writes',
  writes.includes('POST /api/thing'),
)
// Blocked on purpose above: the page's own record of it is not this walk's failure.
page.trouble.blocked.length = 0
await page.rewrite({ path: '/api/read', body: { from: 'the walk' } })
await page.go('/write')
await page.untilWords('the walk')
report.check('rewrite: the walk answers for the server', true)

// ---- 8. signing in: Node's three hops, one jar per person, keyed by host ----

const alice = await signIn({ app: app.origin, user: 'alice' })
const bob = await signIn({ app: app.origin, user: 'bob' })
report.check(
  'sign-in: two people, each themselves',
  JSON.stringify([alice.me, bob.me]) ===
    JSON.stringify([{ displayName: 'alice' }, { displayName: 'bob' }]),
  JSON.stringify([alice.me, bob.me]),
)
report.check(
  "sign-in: the IdP's cookies kept apart from the app's (keyed by host)",
  alice.jar.names(app.origin).includes('manifest_session') &&
    !alice.jar.names(app.origin).includes('idp_session') &&
    alice.jar.names(idp.origin).includes('idp_session'),
)
const shared = await signIn({ app: app.origin, user: 'bob', jar: alice.jar }).then(
  (p) => JSON.stringify(p.me),
  (error: Error) => `refused: ${error.message.slice(0, 60)}`,
)
report.check(
  'the trap, shown open: a jar shared by two people does not sign the second in as themselves',
  !shared.includes('"bob"'),
  shared,
)
class SplitJar extends Jar {
  header(url: string) {
    return url.endsWith('/auth/acs') ? '' : super.header(url)
  }
}
const split = await signIn({ app: app.origin, user: 'carol', jar: new SplitJar() }).then(
  () => 'signed in',
  (error: Error) => error.message,
)
report.check(
  "the trap, shown open: an ACS post without hop 1's cookie is refused",
  /no manifest_session after the ACS \(403/.test(split),
  split,
)
// FE-28: an https origin's names, `__Host-manifest_login` (now at `Path=/`) and
// `__Host-manifest_session`, set by an app still served on http. The jar carries hop 1's
// `__Host-` login cookie to the ACS (it answers 302, not 403), and the sign-in still refuses:
// the session it holds is not the name this origin reads.
NAMES = { session: '__Host-manifest_session', login: '__Host-manifest_login' }
const hosted = await signIn({ app: app.origin, user: 'erin' }).then(
  () => 'signed in',
  (error: Error) => error.message,
)
NAMES = { session: 'manifest_session', login: 'manifest_login' }
report.check(
  "sign-in: hop 1's __Host-manifest_login rides to the ACS, and only the origin's own session name signs in",
  /no manifest_session after the ACS \(302/.test(hosted),
  hosted,
)
report.check(
  "sign-in: the session's name is the origin's (sessionCookieFor): __Host- on https, plain on http",
  sessionCookie('https://app.manifest.internal') === '__Host-manifest_session' &&
    sessionCookie('http://127.0.0.1:7105') === 'manifest_session',
)
const stepped = await alice.stepUp('/apps/x/going-live')
report.check(
  'step-up: the IdP asks again, and sends them back where they were',
  stepped.status === 302 && stepped.location === '/apps/x/going-live',
  JSON.stringify(stepped),
)

// ---- 9. in the browser: Continue with CWL and the IdP's form; a person handed to a tab ----

const fresh = await Page.open(chrome, { base: app.origin, out, isolated: true })
await signInHere(fresh, { user: 'dana' })
report.check(
  'signInHere: Continue with CWL, the IdP form, and back, signed in',
  (await fresh.words()).includes('Signed in as dana'),
)
const handed = await Page.open(chrome, { base: app.origin, out, isolated: true })
await handed.adopt(bob.jar.cookies())
await handed.go('/')
report.check(
  "adopt: a tab with bob's cookies is bob",
  (await handed.words()).includes('Signed in as bob'),
)
const nobody = await Page.open(chrome, { base: app.origin, out, isolated: true })
await nobody.go('/')
report.check(
  "isolated: another tab's jar is its own (nobody signed in)",
  (await nobody.words('body')).includes('Continue with CWL'),
)

for (const server of [fixtures.server, app.server, idp.server] as Server[]) server.close()
report.finish([page, front, writer, fresh, handed])
