/**
 * SIGNING IN, from Node and in the browser.
 *
 * FROM NODE, through the edge, by manifest's three hops (`infra/lib/idp-login.sh`, ported in
 * F5 sitting 1): our app's `/auth/login` → the IdP's form → its assertion, posted to the ACS.
 * ONE JAR PER PERSON, KEYED BY HOST: the ACS post must carry the login cookie hop 1 set
 * (`__Host-manifest_login` through the edge, at `Path=/` since the platform's `7b85326`; the
 * jar keeps any name and ignores `Path`, so it rides to the ACS as it is; a separate IdP jar
 * loses it, and the sign-in is refused), and a jar shared by two
 * people signs the second in as the first (the IdP remembers who signed in). A step-up
 * forgets the IdP host's cookies first, so its form is served again.
 *
 * Node through the edge needs the platform's CA, set BEFORE Node starts:
 *   NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt
 * Against our mock (mock mode), `/auth/login` signs straight in as Instructor One.
 *
 * The laptop IdP's test people sign in with their own name as the password (`instructor`).
 * A walk on the real platform (7100) is Rich's word, every time (ORIENTATION §2, §7).
 *
 * IN THE BROWSER (`signInHere`): the sign-in screen's *Continue with CWL*, then the IdP's form
 * when there is one. Cookies and passwords are never printed.
 */
import type { Page } from './page.ts'

/**
 * THE SESSION COOKIE'S NAME ON `app`'s ORIGIN, as the contract's `sessionCookieFor` names it
 * (FE-28, the platform's `7b85326`, contract 1.6.0): `__Host-manifest_session` on https (through
 * the edge), `manifest_session` on loopback http (the mock). An https origin does not read the
 * plain name at all, so a sign-in that ends holding only that is no sign-in.
 */
export function sessionCookie(app: string): string {
  return new URL(app).protocol === 'https:'
    ? '__Host-manifest_session'
    : 'manifest_session'
}

/** A cookie jar per host (host includes the port): name → value, and whether it was https. */
export class Jar {
  readonly hosts = new Map<string, Map<string, string>>()
  private secure = new Set<string>()

  take(url: string, response: Response): void {
    const { host, protocol } = new URL(url)
    if (protocol === 'https:') this.secure.add(host)
    const jar = this.hosts.get(host) ?? new Map<string, string>()
    for (const line of response.headers.getSetCookie()) {
      const [pair = '', ...attributes] = line.split(';')
      const at = pair.indexOf('=')
      const name = pair.slice(0, at).trim()
      const value = pair.slice(at + 1).trim()
      const expired =
        value === '' ||
        attributes.some((a) => /^\s*max-age=0\b/i.test(a)) ||
        attributes.some(
          (a) =>
            /^\s*expires=/i.test(a) && Date.parse(a.split('=')[1] ?? '') < Date.now(),
        )
      if (expired) jar.delete(name)
      else jar.set(name, value)
    }
    this.hosts.set(host, jar)
  }

  header(url: string): string {
    const jar = this.hosts.get(new URL(url).host)
    return jar ? [...jar].map(([name, value]) => `${name}=${value}`).join('; ') : ''
  }

  names(url: string): string[] {
    return [...(this.hosts.get(new URL(url).host)?.keys() ?? [])]
  }

  /** Forget one host's cookies (a step-up's IdP). */
  forget(host: string): void {
    this.hosts.delete(host)
  }

  /** Every cookie, for `Page.adopt`: a person signed in here, handed to a browser tab. */
  cookies(): { host: string; name: string; value: string; secure: boolean }[] {
    return [...this.hosts].flatMap(([host, jar]) =>
      [...jar].map(([name, value]) => ({
        host,
        name,
        value,
        secure: this.secure.has(host),
      })),
    )
  }
}

export interface Answer {
  status: number
  ms: number
  body: unknown
  headers: Record<string, string>
}

export interface Person {
  user: string
  jar: Jar
  /** What `GET /v1/me` answered when they signed in. */
  me: unknown
  /** A call on their session: `Origin` on a change; a content-type only with a body. */
  call(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Answer>
  /** A change with a fresh `Idempotency-Key`. */
  change(method: string, path: string, body?: unknown): Promise<Answer>
  /** `/auth/step-up` and back, the password asked again; answers where it landed. */
  stepUp(returnTo: string): Promise<{ status: number; location: string | null }>
}

/** One request, redirects NOT followed, cookies kept per host. */
async function hop(jar: Jar, url: string, init: RequestInit = {}): Promise<Response> {
  const cookie = jar.header(url)
  let response: Response
  try {
    response = await fetch(url, {
      redirect: 'manual',
      ...init,
      headers: {
        ...(init.headers as Record<string, string>),
        ...(cookie ? { cookie } : {}),
      },
    })
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code ?? ''
    if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(cause))
      throw new Error(
        `${new URL(url).host} answered with a certificate Node does not trust (${cause}): start Node with NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt`,
      )
    throw error
  }
  jar.take(url, response)
  return response
}

/** Redirects followed by hand, so each host's cookies go only to it. */
async function follow(jar: Jar, url: string, init: RequestInit = {}) {
  let response = await hop(jar, url, init)
  let here = url
  for (let i = 0; i < 10 && response.status >= 300 && response.status < 400; i++) {
    here = new URL(response.headers.get('location') ?? '', here).href
    response = await hop(jar, here)
  }
  return { response, here }
}

const unescape = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
const field = (html: string, name: string) => {
  const match = new RegExp(`name="${name}"[^>]*value="([^"]*)"`).exec(html)
  return match?.[1] === undefined ? null : unescape(match[1])
}
const formAction = (html: string) => {
  const match = /<form[^>]*action="([^"]*)"/.exec(html)
  return match?.[1] === undefined ? null : unescape(match[1])
}

/** Hops 2 and 3 at the IdP, then the assertion to the ACS (read from the IdP's own form). */
async function atTheIdp(jar: Jar, idp: string, user: string, password: string) {
  const { response: formPage, here } = await follow(jar, idp)
  const form = await formPage.text()
  if (!/name="username"/.test(form))
    throw new Error(
      `the IdP served no login form at ${here.slice(0, 80)} (${formPage.status}): ${form.slice(0, 200)}`,
    )
  const action = new URL(formAction(form) ?? '', here).href
  const { response: posted, here: postedAt } = await follow(jar, action, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: user,
      password,
      AuthState: field(form, 'AuthState') ?? '',
    }).toString(),
  })
  const assertion = await posted.text()
  const saml = field(assertion, 'SAMLResponse')
  if (!saml)
    throw new Error(
      `no SAMLResponse for ${user} at ${postedAt.slice(0, 80)}: the IdP refused the password, or served its form again`,
    )
  const acs = formAction(assertion)
  if (!acs) throw new Error(`the IdP's assertion for ${user} names no ACS`)
  const relay = field(assertion, 'RelayState')
  // RelayState rides back beside the assertion, as a browser's auto-submit sends it.
  const back = new URLSearchParams({
    SAMLResponse: saml,
    ...(relay ? { RelayState: relay } : {}),
  })
  const response = await hop(jar, acs, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: back.toString(),
  })
  return { status: response.status, location: response.headers.get('location') }
}

/**
 * Sign `user` in at `app` (our app's origin: `https://app.manifest.internal` through the edge,
 * or `http://127.0.0.1:7105` in mock mode). A fresh jar per person, unless one is handed in.
 */
export async function signIn(options: {
  app: string
  user: string
  password?: string
  jar?: Jar
}): Promise<Person> {
  const { app, user } = options
  const password = options.password ?? user
  const jar = options.jar ?? new Jar()
  const start = await hop(jar, `${app}/auth/login?returnTo=${encodeURIComponent('/')}`)
  const idp = start.headers.get('location')
  if (start.status !== 302 || !idp)
    throw new Error(`${app}/auth/login answered ${start.status}`)
  const idpUrl = new URL(idp, app)
  if (idpUrl.host === new URL(app).host) {
    // The mock fakes the IdP: its /auth/login set the session and sent us home.
    await follow(jar, idpUrl.href)
  } else {
    const back = await atTheIdp(jar, idpUrl.href, user, password)
    if (!jar.names(app).includes(sessionCookie(app)))
      throw new Error(
        `${user}: no ${sessionCookie(app)} after the ACS (${back.status} → ${back.location})`,
      )
  }
  const person = makePerson(app, jar, user, password)
  const me = await person.call('GET', '/v1/me')
  if (me.status !== 200) throw new Error(`${user}: GET /v1/me answered ${me.status}`)
  person.me = me.body
  return person
}

function makePerson(app: string, jar: Jar, user: string, password: string): Person {
  const person: Person = {
    user,
    jar,
    me: undefined,
    async call(method, path, body, headers = {}) {
      const url = `${app}${path}`
      const started = Date.now()
      // No content-type without a body: a DELETE with one and no body is 400 (ORIENTATION §7).
      const response = await hop(jar, url, {
        method,
        headers: {
          ...(method === 'GET' ? {} : { origin: app }),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      const text = await response.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        // Not JSON: the text itself.
      }
      return {
        status: response.status,
        ms: Date.now() - started,
        body: parsed,
        headers: Object.fromEntries(response.headers),
      }
    },
    change(method, path, body) {
      return person.call(method, path, body, { 'idempotency-key': crypto.randomUUID() })
    },
    async stepUp(returnTo) {
      const start = await hop(
        jar,
        `${app}/auth/step-up?returnTo=${encodeURIComponent(returnTo)}`,
      )
      const idp = start.headers.get('location')
      if (start.status !== 302 || !idp) return { status: start.status, location: idp }
      const idpUrl = new URL(idp, app)
      if (idpUrl.host === new URL(app).host) {
        const { response, here } = await follow(jar, idpUrl.href)
        return { status: response.status, location: here }
      }
      // The IdP asks for the password again only once it has forgotten them.
      jar.forget(idpUrl.host)
      return atTheIdp(jar, idpUrl.href, user, password)
    },
  }
  return person
}

/**
 * Sign in in the browser, as a person does: the sign-in screen's *Continue with CWL*, then
 * the IdP's form when there is one (the edge; the mock signs straight in as Instructor One).
 * The tab's profile is fresh, so the IdP always asks.
 */
export async function signInHere(
  page: Page,
  options: { user?: string; password?: string; returnTo?: string } = {},
): Promise<void> {
  const user = options.user ?? 'instructor'
  const password = options.password ?? user
  const base = new URL(page.options.base)
  await page.go(options.returnTo ?? '/')
  const where = await page.until(
    'the sign-in screen, or signed in already',
    () =>
      document.querySelector('a[href^="/auth/login"]')
        ? 'sign-in'
        : document.querySelector('h1')
          ? 'in'
          : '',
    [],
    15_000,
  )
  if (where === 'in') return
  await page.press('Continue with CWL')
  const next = await page.until(
    'the IdP or the app',
    (home: string) =>
      location.host !== home
        ? document.querySelector('input[name=username]')
          ? 'idp'
          : ''
        : document.querySelector('h1') &&
            !document.querySelector('a[href^="/auth/login"]')
          ? 'in'
          : '',
    [base.host],
    30_000,
  )
  if (next === 'idp') {
    await page.run(
      (name: string, secret: string) => {
        const input = document.querySelector<HTMLInputElement>('input[name=username]')
        const form = input?.form
        const pass = form?.querySelector<HTMLInputElement>('input[name=password]')
        if (!input || !form || !pass)
          throw new Error('the IdP form has no username or password')
        input.value = name
        pass.value = secret
        form.submit()
      },
      user,
      password,
    )
    await page.until(
      'back at the app, signed in',
      (home: string) =>
        location.host === home &&
        !!document.querySelector('h1') &&
        !document.querySelector('a[href^="/auth/login"]'),
      [base.host],
      45_000,
    )
  }
}
