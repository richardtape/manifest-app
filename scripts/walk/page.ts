/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/**
 * ONE TAB OF A WALK: where it goes, what it waits for, what it presses and types, and what
 * it reads. Each method carries a lesson a sitting paid for (ORIENTATION §7):
 * - `go` waits for the NEW document: a `readyState` read straight after a navigation can
 *   answer the old page's `complete`;
 * - `after` waits for a page to CHANGE before reading it: a fast press reads the old round;
 * - `press` and `names` read Chrome's ACCESSIBILITY TREE (`Accessibility.getFullAXTree`), the
 *   names a person's screen reader hears, never jsdom's (jsdom drops a visually hidden part's
 *   leading space: "Copythe address");
 * - `type` puts the caret with `setSelectionRange` first: in a wrapped `<textarea>`, `End`
 *   moves to the end of the visual line, not of the value;
 * - `field({ id })` uses `getElementById`: a React id holds `:`, which `#id` refuses;
 * - focus is emulated, so the clipboard works ("Document is not focused"); trust the page's
 *   own "Copied", since headless Chrome's `readText` answers empty;
 * - `words` reads text as a person does (`layout.ts`);
 * - WRITES ARE BLOCKED unless the walk says otherwise: every request to `/api/` or `/v1/`
 *   but a GET is refused in the browser and listed (`blocked`), so a read-only walk cannot
 *   start work by mistake. A problem report (`POST /api/problems`) is let through: it is
 *   evidence, not work. Sign-in (`/auth/`) is never blocked.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CdpEvent, Chrome } from './chrome.ts'
import { LAYOUT_DEFAULTS, layoutProblems, wordsIn, type LayoutOptions } from './layout.ts'

export interface Rewrite {
  /** A method to match; any when absent. */
  method?: string
  /** The end of the path to match (`/launch-readiness`), or a pattern on the whole path. */
  path: string | RegExp
  status?: number
  /** Sent as JSON; `null` sends no body. */
  body: unknown
}

export interface PageOptions {
  /** Where `go` starts from: our server (`http://127.0.0.1:7105`) or the edge. */
  base: string
  /** Where screenshots go. */
  out: string
  /** Let the page change things (a walk that presses Describe, Make it…). Default: blocked. */
  allowWrites?: boolean
  /** Writes let through even when blocked, as `METHOD /path` (path prefix). */
  allowed?: string[]
  /** Its own cookies, apart from every other page (a second person). */
  isolated?: boolean
}

export interface Trouble {
  /** What the page threw, and what it logged as an error. */
  exceptions: string[]
  consoleErrors: string[]
  /** Every answer of 400 or more, and every request that failed (not those we blocked). */
  failedRequests: string[]
  /** Every write the read-only guard refused. */
  blocked: string[]
}

type Target =
  | { id: string }
  | { selector: string }
  | { label: string | RegExp; role?: string }
  | { name: string | RegExp; role?: string }

interface AxNode {
  nodeId: string
  ignored: boolean
  role?: { value: string }
  name?: { value: string }
  properties?: { name: string; value: { value: unknown } }[]
  backendDOMNodeId?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const PRESSABLE = [
  'button',
  'link',
  'tab',
  'menuitem',
  'checkbox',
  'radio',
  'switch',
  'option',
]
const TEXTBOX = ['textbox', 'searchbox', 'combobox']

const matches = (pattern: string | RegExp, value: string) =>
  typeof pattern === 'string' ? value === pattern : pattern.test(value)

export class Page {
  readonly trouble: Trouble = {
    exceptions: [],
    consoleErrors: [],
    failedRequests: [],
    blocked: [],
  }
  /** The width last set, for screenshots' names. */
  width = 0
  private rewrites: Rewrite[] = []
  private shots = 0
  private requests = new Map<string, string>()
  private fetchOn = false

  readonly chrome: Chrome
  readonly sessionId: string
  readonly options: PageOptions
  /** Its cookie jar's id when `isolated` (Chrome's browser context). */
  readonly browserContextId: string | undefined

  // No parameter properties: Node strips types, and cannot strip those.
  private constructor(
    chrome: Chrome,
    sessionId: string,
    options: PageOptions,
    browserContextId: string | undefined,
  ) {
    this.chrome = chrome
    this.sessionId = sessionId
    this.options = options
    this.browserContextId = browserContextId
  }

  static async open(chrome: Chrome, options: PageOptions): Promise<Page> {
    mkdirSync(options.out, { recursive: true })
    const { sessionId, targetId } = await chrome.newPage({
      isolated: options.isolated ?? false,
    })
    const { targetInfo } = await chrome.send<{
      targetInfo: { browserContextId?: string }
    }>('Target.getTargetInfo', { targetId })
    const page = new Page(chrome, sessionId, options, targetInfo.browserContextId)
    chrome.on((event) => {
      if (event.sessionId === sessionId) void page.onEvent(event)
    })
    for (const domain of ['Page', 'Runtime', 'Network', 'DOM', 'Log', 'Accessibility'])
      await page.send(`${domain}.enable`)
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true })
    await chrome
      .send('Browser.grantPermissions', {
        origin: new URL(options.base).origin,
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        ...(targetInfo.browserContextId
          ? { browserContextId: targetInfo.browserContextId }
          : {}),
      })
      .catch(() => undefined)
    if (!options.allowWrites) await page.intercept()
    return page
  }

  send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
  ) {
    return this.chrome.send<T>(method, params, this.sessionId)
  }

  // ---- reading the page ----

  /** An expression, its value returned by value. */
  async evaluate<T = unknown>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await this.send<{
      result: { value: T }
      exceptionDetails?: { text: string; exception?: { description?: string } }
    }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (exceptionDetails)
      throw new Error(
        `in the page: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`,
      )
    return result.value
  }

  /**
   * A function run in the page, sent as its source with its arguments as JSON: it may use
   * nothing from outside itself. (`__name` is esbuild's, should the walk be run by tsx.)
   */
  run<A extends unknown[], T>(fn: (...args: A) => T, ...args: A): Promise<Awaited<T>> {
    return this.evaluate(
      `(() => { const __name = (f) => f; return (${fn.toString()})(...${JSON.stringify(args)}) })()`,
    )
  }

  /** The words on screen in `selector`, as a person reads them, less `without` (`layout.ts`). */
  words(selector = 'main', without = ''): Promise<string> {
    return this.run(wordsIn, selector, without)
  }

  /** Every way the page fails to fit, in words (`layout.ts`); empty when it fits. */
  layout(options: Partial<LayoutOptions> = {}): Promise<string[]> {
    return this.run(layoutProblems, { ...LAYOUT_DEFAULTS, ...options })
  }

  /** Chrome's accessibility tree: every role and name a screen reader is given. */
  async names(role?: string): Promise<{ role: string; name: string }[]> {
    return (await this.axNodes())
      .filter((node) => role === undefined || node.role?.value === role)
      .map((node) => ({ role: node.role?.value ?? '', name: node.name?.value ?? '' }))
  }

  // ---- waiting ----

  /**
   * The first truthy value of `fn`, run in the page every 100 ms. On a timeout: a screenshot
   * named for what it waited for, and the page's words in the error.
   */
  async until<A extends unknown[], T>(
    what: string,
    fn: (...args: A) => T,
    args: A,
    ms = 10_000,
  ): Promise<Awaited<T>> {
    const end = Date.now() + ms
    let last: unknown
    for (;;) {
      try {
        const value = await this.run(fn, ...args)
        if (value) return value
      } catch (error) {
        // A page between documents throws: wait on.
        last = error
      }
      if (Date.now() > end) {
        await this.shot(`timeout-${what}`).catch(() => undefined)
        const words = await this.words('body').catch(() => '')
        throw new Error(
          `never: ${what} (${ms} ms)${last ? `; last error ${String(last)}` : ''}\nthe page says: ${words.slice(0, 1500)}`,
        )
      }
      await sleep(100)
    }
  }

  /** `until` with words: their first appearance in `selector`. */
  untilWords(text: string, selector = 'body', ms = 10_000) {
    return this.until(
      `"${text}"`,
      (wanted: string, where: string) => {
        const root = document.querySelector(where)
        return !!root && (root.textContent ?? '').replace(/\s+/g, ' ').includes(wanted)
      },
      [text, selector],
      ms,
    )
  }

  /**
   * Do something, then wait until `read` answers differently: a page read straight after a
   * press can be the page before it (F2 sitting 4). Answers the new reading.
   */
  async after<A extends unknown[], T>(
    what: string,
    action: () => Promise<unknown>,
    read: (...args: A) => T,
    args: A,
    ms = 10_000,
  ): Promise<Awaited<T>> {
    const before = JSON.stringify(await this.run(read, ...args))
    await action()
    const end = Date.now() + ms
    for (;;) {
      const now = await this.run(read, ...args).catch(() => undefined)
      if (now !== undefined && JSON.stringify(now) !== before) return now as Awaited<T>
      if (Date.now() > end) {
        await this.shot(`unchanged-${what}`).catch(() => undefined)
        throw new Error(
          `the page never changed after ${what} (${ms} ms); it read ${before}`,
        )
      }
      await sleep(100)
    }
  }

  // ---- moving ----

  /** Navigate to `path` (on `base`) or a whole URL, and wait for the NEW document's load. */
  async go(path: string, ms = 15_000): Promise<void> {
    const url = /^https?:/.test(path) ? path : new URL(path, this.options.base).href
    await this.evaluate('window.__walkLeaving = true').catch(() => undefined)
    const { errorText } = await this.send<{ errorText?: string }>('Page.navigate', {
      url,
    })
    if (errorText) throw new Error(`could not open ${url}: ${errorText}`)
    await this.until(
      `the load of ${path}`,
      () =>
        !(window as unknown as { __walkLeaving?: boolean }).__walkLeaving &&
        document.readyState === 'complete',
      [],
      ms,
    )
  }

  /** The window's width (and a phone's height and touch below 600 px), laid out again. */
  async setWidth(width: number): Promise<void> {
    this.width = width
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: width < 600 ? 812 : 900,
      deviceScaleFactor: 1,
      mobile: width < 600,
    })
    await this.evaluate(
      'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))',
    )
  }

  /** A screenshot of the whole page, numbered in order, named with the width. */
  async shot(name: string): Promise<string> {
    const { data } = await this.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    const file = join(
      this.options.out,
      `${String(++this.shots).padStart(2, '0')}-${name.replace(/[^\w.-]+/g, '-')}${this.width ? `-${this.width}` : ''}.png`,
    )
    writeFileSync(file, Buffer.from(data, 'base64'))
    return file
  }

  // ---- pressing and typing ----

  /**
   * Press the one control Chrome names `name` (a button, link, tab…), as a screen reader
   * finds it. Two with that name is an error unless `nth` says which.
   */
  async press(
    name: string | RegExp,
    options: { role?: string; nth?: number } = {},
  ): Promise<void> {
    const node = await this.find(
      name,
      options.role ? [options.role] : PRESSABLE,
      options.nth,
    )
    const disabled = node.properties?.find((p) => p.name === 'disabled')?.value.value
    if (disabled) throw new Error(`"${node.name?.value}" is disabled`)
    await this.callOn(
      node,
      'function () { this.scrollIntoView({ block: "center" }); this.click() }',
    )
  }

  /**
   * Type into a field, the caret put first (`setSelectionRange`): at the END of the value (a
   * wrapped textarea's `End` key stops at the line), or replacing it all.
   */
  async type(target: Target, text: string, at: 'end' | 'replace' = 'end'): Promise<void> {
    const objectId = await this.field(target)
    await this.send('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: `function (at) {
        this.scrollIntoView({ block: 'center' })
        this.focus()
        const length = this.value.length
        if (at === 'replace') this.setSelectionRange(0, length)
        else this.setSelectionRange(length, length)
      }`,
      arguments: [{ value: at }],
    })
    await this.send('Input.insertText', { text })
  }

  /**
   * Tab from the top until the focus reaches the control Chrome names `name`: how many
   * presses, and the focus ring it shows (`''` when none). Undefined when the focus leaves
   * the page's controls first. The focused control is matched by its accessible name, never
   * by `activeElement.textContent`: past the last control the focus is `<body>`, whose text
   * holds every hidden word, so a hidden control seems "reached" there with no ring (F4a's
   * walk read the folded rail's Sign out that way, `16a79b1`).
   */
  async tabTo(
    name: string | RegExp,
    max = 40,
  ): Promise<{ presses: number; ring: string } | undefined> {
    // From the top: `blur()` leaves Tab's starting point where the focus was, so a stand-in is
    // focused at the top of the page, and taken away.
    await this.evaluate(`(() => {
      const top = document.createElement('span')
      top.tabIndex = -1
      document.body.prepend(top)
      top.focus()
      top.remove()
      window.scrollTo(0, 0)
      return true
    })()`)
    for (let presses = 1; presses <= max; presses++) {
      await this.key('Tab')
      const { result } = await this.send<{ result: { objectId?: string } }>(
        'Runtime.evaluate',
        {
          expression:
            'document.activeElement === document.body ? null : document.activeElement',
        },
      )
      if (!result.objectId) return undefined
      const { nodes } = await this.send<{ nodes: AxNode[] }>(
        'Accessibility.getPartialAXTree',
        { objectId: result.objectId, fetchRelatives: false },
      )
      const node = nodes.find((n) => !n.ignored)
      if (!node || !matches(name, node.name?.value ?? '')) continue
      const ring = await this.send<{ result: { value: string } }>(
        'Runtime.callFunctionOn',
        {
          objectId: result.objectId,
          returnByValue: true,
          functionDeclaration: `function () {
          const s = getComputedStyle(this)
          if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
            return 'outline ' + s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor
          return s.boxShadow !== 'none' ? 'shadow ' + s.boxShadow : ''
        }`,
        },
      )
      return { presses, ring: ring.result.value }
    }
    return undefined
  }

  /** A key, pressed and let go (`Tab`, `Enter`, `Escape`…). */
  async key(key: string, code = key, keyCode = 0): Promise<void> {
    const codes: Record<string, number> = { Tab: 9, Enter: 13, Escape: 27, ' ': 32 }
    const windowsVirtualKeyCode = keyCode || codes[key] || 0
    for (const type of ['keyDown', 'keyUp'])
      await this.send('Input.dispatchKeyEvent', {
        type,
        key,
        code,
        windowsVirtualKeyCode,
      })
  }

  /** A cookie for `base` (mock mode's `manifest_session=mock-session`). */
  async cookie(name: string, value: string): Promise<void> {
    await this.send('Network.setCookie', {
      name,
      value,
      url: this.options.base,
      path: '/',
    })
  }

  /** A person signed in by Node (`sign-in.ts`), handed to this page: their cookies, by host. */
  async adopt(cookies: { host: string; name: string; value: string; secure: boolean }[]) {
    for (const cookie of cookies)
      await this.send('Network.setCookie', {
        name: cookie.name,
        value: cookie.value,
        url: `${cookie.secure ? 'https' : 'http'}://${cookie.host}/`,
        path: '/',
        secure: cookie.secure,
        httpOnly: true,
      })
  }

  // ---- what the page asks of the platform ----

  /** Answer requests the walk names with its own answer (a mock-mode gap: FE-27). */
  async rewrite(rule: Rewrite): Promise<void> {
    this.rewrites.push(rule)
    await this.intercept()
  }

  clearRewrites(): void {
    this.rewrites = []
  }

  // ---- inside ----

  private async axNodes(): Promise<AxNode[]> {
    const { nodes } = await this.send<{ nodes: AxNode[] }>('Accessibility.getFullAXTree')
    return nodes.filter((node) => !node.ignored)
  }

  private async find(
    pattern: string | RegExp,
    roles: string[],
    nth?: number,
  ): Promise<AxNode> {
    const nodes = await this.axNodes()
    const found = nodes.filter(
      (node) =>
        roles.includes(node.role?.value ?? '') &&
        matches(pattern, node.name?.value ?? ''),
    )
    if (found.length === 0 || (found.length > 1 && nth === undefined)) {
      const named = nodes
        .filter((node) => roles.includes(node.role?.value ?? ''))
        .map((node) => `${node.role?.value} "${node.name?.value ?? ''}"`)
      throw new Error(
        `${found.length === 0 ? 'nothing' : `${found.length} controls`} named ${String(pattern)} (${roles.join('/')}); the page has: ${named.join(', ') || 'none'}`,
      )
    }
    const node = found[nth ?? 0]
    if (!node)
      throw new Error(`no control ${nth} named ${String(pattern)}: ${found.length} found`)
    return node
  }

  private async callOn(node: AxNode, functionDeclaration: string): Promise<void> {
    if (node.backendDOMNodeId === undefined)
      throw new Error('that control has no element')
    const { object } = await this.send<{ object: { objectId: string } }>(
      'DOM.resolveNode',
      {
        backendNodeId: node.backendDOMNodeId,
      },
    )
    await this.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration,
    })
  }

  /** A field, found by its id (`getElementById`: a React id's `:`), selector or name. */
  private async field(target: Target): Promise<string> {
    if ('label' in target || 'name' in target) {
      const pattern = 'label' in target ? target.label : target.name
      const node = await this.find(pattern, target.role ? [target.role] : TEXTBOX)
      const { object } = await this.send<{ object: { objectId: string } }>(
        'DOM.resolveNode',
        {
          backendNodeId: node.backendDOMNodeId,
        },
      )
      return object.objectId
    }
    const expression =
      'id' in target
        ? `document.getElementById(${JSON.stringify(target.id)})`
        : `document.querySelector(${JSON.stringify(target.selector)})`
    const { result } = await this.send<{
      result: { objectId?: string; subtype?: string }
    }>('Runtime.evaluate', { expression })
    if (!result.objectId || result.subtype === 'null')
      throw new Error(`no field at ${JSON.stringify(target)}`)
    return result.objectId
  }

  private async intercept(): Promise<void> {
    if (this.fetchOn) return
    this.fetchOn = true
    await this.send('Fetch.enable', {
      patterns: [{ urlPattern: '*/api/*' }, { urlPattern: '*/v1/*' }],
    })
  }

  private async onEvent(event: CdpEvent): Promise<void> {
    const p = event.params
    const id = String(p['requestId'] ?? '')
    switch (event.method) {
      case 'Runtime.exceptionThrown': {
        const details = p['exceptionDetails'] as {
          text: string
          exception?: { description?: string }
        }
        this.trouble.exceptions.push(details.exception?.description ?? details.text)
        return
      }
      case 'Runtime.consoleAPICalled': {
        if (p['type'] !== 'error') return
        const args = p['args'] as { value?: unknown; description?: string }[]
        this.trouble.consoleErrors.push(
          args.map((a) => String(a.value ?? a.description ?? '')).join(' '),
        )
        return
      }
      case 'Log.entryAdded': {
        const entry = p['entry'] as {
          level: string
          source: string
          text: string
          url?: string
        }
        // A failed load is a failed request (below), and one we blocked is listed as blocked.
        if (entry.level === 'error' && entry.source !== 'network')
          this.trouble.consoleErrors.push(
            `${entry.text}${entry.url ? ` (${entry.url})` : ''}`,
          )
        return
      }
      case 'Network.requestWillBeSent': {
        const request = p['request'] as { method: string; url: string }
        this.requests.set(id, `${request.method} ${request.url}`)
        return
      }
      case 'Network.responseReceived': {
        const response = p['response'] as { status: number; url: string }
        if (response.status >= 400)
          this.trouble.failedRequests.push(
            `${response.status} ${this.requests.get(id) ?? response.url}`,
          )
        return
      }
      case 'Network.loadingFailed': {
        if (
          p['canceled'] ||
          p['blockedReason'] ||
          p['errorText'] === 'net::ERR_BLOCKED_BY_CLIENT'
        )
          return
        this.trouble.failedRequests.push(
          `failed (${p['errorText']}) ${this.requests.get(id) ?? ''}`,
        )
        return
      }
      case 'Fetch.requestPaused':
        await this.paused(id, p['request'] as { method: string; url: string })
        return
    }
  }

  private async paused(requestId: string, request: { method: string; url: string }) {
    const path = new URL(request.url).pathname
    const said = `${request.method} ${path}`
    try {
      const rule = this.rewrites.find(
        (r) =>
          (r.method === undefined || r.method === request.method) &&
          (typeof r.path === 'string' ? path.endsWith(r.path) : r.path.test(path)),
      )
      if (rule) {
        await this.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: rule.status ?? 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(rule.body === null ? '' : JSON.stringify(rule.body)).toString(
            'base64',
          ),
        })
        return
      }
      const reads = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
      const allowed = ['POST /api/problems', ...(this.options.allowed ?? [])].some((a) =>
        said.startsWith(a),
      )
      if (!this.options.allowWrites && !reads && !allowed) {
        this.trouble.blocked.push(said)
        await this.send('Fetch.failRequest', {
          requestId,
          errorReason: 'BlockedByClient',
        })
        return
      }
      await this.send('Fetch.continueRequest', { requestId })
    } catch {
      // The page moved on, and the request with it.
    }
  }
}
