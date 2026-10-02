/**
 * HEADLESS CHROME OVER THE DEVTOOLS PROTOCOL, with Node 24's own WebSocket and no dependency.
 *
 * Every walk since F1's wrote this again in its scratchpad and met the same traps
 * (ORIENTATION §7). Here they are solved once:
 * - a FRESH PROFILE every launch, removed at exit: the IdP remembers who signed in;
 * - `--remote-debugging-port=0`, read back from the profile's `DevToolsActivePort`: the OS
 *   picks a free port (never one of the platform's 7100–7199), so two walks never meet on
 *   one port, and a walk never talks to an old Chrome;
 * - Chrome STOPPED in `process.on('exit')`, and on SIGINT, SIGTERM, SIGHUP and a throw: a
 *   walk that threw used to leave Chrome holding its port (sitting 5 found two on 9334);
 * - Chrome in a PROCESS GROUP of its own, stopped whole: its helpers outlive it otherwise,
 *   and write into the profile after it is removed (measured);
 * - an orphan of a walk that was killed outright (`kill -9` runs no handler) is stopped at
 *   the next launch, found by its profile's prefix with launchd for a parent, and any walk
 *   profile no process names is removed.
 *
 * Every page is its own session on one browser connection (`Target.attachToTarget`,
 * flatten), so a walk can hold two people at once, each in their own cookie jar
 * (`newPage({ isolated: true })`).
 */
import { spawn, execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_APP = '/Applications/Google Chrome.app/'
export const CHROME = `${CHROME_APP}Contents/MacOS/Google Chrome`
/** Every walk's profile starts with this, under the system's temporary directory. */
const PROFILE_PREFIX = 'walk-chrome-'

export interface CdpEvent {
  method: string
  params: Record<string, unknown>
  sessionId?: string
}

export interface Chrome {
  /** One DevTools command; `sessionId` names a page, none means the browser. */
  send<T = Record<string, unknown>>(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string,
  ): Promise<T>
  /** Every event, from every page; answers a function that stops listening. */
  on(listener: (event: CdpEvent) => void): () => void
  /** A new tab, attached. `isolated` gives it its own cookies (one person per context). */
  newPage(options?: {
    isolated?: boolean
  }): Promise<{ sessionId: string; targetId: string }>
  /** Chrome's process id and profile, for a check that it is gone. */
  readonly pid: number
  readonly profile: string
  readonly port: number
  stop(): void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A profile removed, though a dying Chrome may still be writing into it. */
function removeProfile(profile: string): void {
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  } catch {
    // The next launch sweeps what is left.
  }
}

/**
 * What a walk killed outright left behind: its Chrome and helpers (parent 1, launchd, and a
 * walk's profile on their command line), stopped; then every walk profile no process names,
 * removed (older than a minute, so a walk that has only just made one keeps it).
 */
function sweepOrphans(): number {
  let lines: string[]
  try {
    lines = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], {
      encoding: 'utf8',
    }).split('\n')
  } catch {
    return 0
  }
  let stopped = 0
  for (const line of lines) {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line)
    if (!match || match[2] !== '1') continue
    const command = match[3] ?? ''
    if (!command.startsWith(CHROME_APP) || !command.includes(PROFILE_PREFIX)) continue
    // A walk's Chrome leads its own group (`detached`): the group goes with it.
    let hit = false
    for (const target of [-Number(match[1]), Number(match[1])])
      try {
        process.kill(target, 'SIGKILL')
        hit = true
      } catch {
        // Gone already, or no group of its own (a helper).
      }
    if (hit) stopped++
    // Its profile is no one's now.
    const profile = /--user-data-dir=(\S+)/.exec(command)?.[1]
    if (profile?.includes(PROFILE_PREFIX)) removeProfile(profile)
  }
  const named = lines.join('\n')
  for (const entry of readdirSync(tmpdir())) {
    if (!entry.startsWith(PROFILE_PREFIX) || named.includes(entry)) continue
    const profile = join(tmpdir(), entry)
    try {
      if (Date.now() - statSync(profile).mtimeMs > 60_000) removeProfile(profile)
    } catch {
      // Gone already.
    }
  }
  return stopped
}

let handlersInstalled = false
const stops = new Set<() => void>()
/** Once per process: every launched Chrome is stopped however the walk ends. */
function installHandlers(): void {
  if (handlersInstalled) return
  handlersInstalled = true
  process.on('exit', () => {
    for (const stop of stops) stop()
  })
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGHUP', 129],
  ] as const)
    process.on(signal, () => process.exit(code))
  // A throw outside any await (an event handler's) still ends the walk, and still stops Chrome.
  process.on('uncaughtException', (error) => {
    console.error(`WALK FAILED: ${error.stack ?? error}`)
    process.exit(1)
  })
  process.on('unhandledRejection', (error) => {
    console.error(`WALK FAILED: ${error instanceof Error ? error.stack : String(error)}`)
    process.exit(1)
  })
}

export async function launchChrome(options: { args?: string[] } = {}): Promise<Chrome> {
  if (!existsSync(CHROME)) throw new Error(`no Chrome at ${CHROME}`)
  const swept = sweepOrphans()
  if (swept)
    console.error(`walk: stopped ${swept} headless Chrome(s) a killed walk left behind`)
  installHandlers()

  const profile = mkdtempSync(join(tmpdir(), PROFILE_PREFIX))
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--disable-background-networking',
      '--hide-scrollbars',
      '--mute-audio',
      ...(options.args ?? []),
      'about:blank',
    ],
    // Its own process group, with its helpers: stopped together, and never sent the walk's
    // own Ctrl-C (the walk stops it).
    { stdio: 'ignore', detached: true },
  )
  const pid = chrome.pid
  if (pid === undefined) throw new Error('Chrome did not start')
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    stops.delete(stop)
    // The whole group: killing Chrome alone leaves its helpers writing into the profile.
    for (const target of [-pid, pid])
      try {
        process.kill(target, 'SIGKILL')
      } catch {
        // Gone already.
      }
    removeProfile(profile)
  }
  stops.add(stop)

  // The port Chrome chose, from its own file: never a fixed one.
  const portFile = join(profile, 'DevToolsActivePort')
  let port = 0
  let browserPath = ''
  for (let i = 0; i < 150 && !port; i++) {
    if (existsSync(portFile)) {
      const [first, second] = readFileSync(portFile, 'utf8').split('\n')
      port = Number(first)
      browserPath = second ?? ''
    }
    if (!port) await sleep(100)
  }
  if (!port || !browserPath) {
    stop()
    throw new Error('Chrome never wrote its DevTools port')
  }
  if (port >= 7100 && port <= 7199) {
    stop()
    throw new Error(
      `Chrome took ${port}, one of the platform's ports: run the walk again`,
    )
  }

  const ws = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`)
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true })
    ws.addEventListener(
      'error',
      () => reject(new Error('the DevTools socket did not open')),
      {
        once: true,
      },
    )
  })
  let nextId = 0
  const pending = new Map<
    number,
    { resolve: (value: never) => void; reject: (error: Error) => void; method: string }
  >()
  const listeners = new Set<(event: CdpEvent) => void>()
  ws.addEventListener('message', (message) => {
    const data = JSON.parse(String(message.data)) as {
      id?: number
      result?: unknown
      error?: { message: string }
    } & Partial<CdpEvent>
    if (data.id !== undefined) {
      const waiting = pending.get(data.id)
      pending.delete(data.id)
      if (!waiting) return
      if (data.error)
        waiting.reject(new Error(`${waiting.method}: ${data.error.message}`))
      else waiting.resolve(data.result as never)
      return
    }
    if (data.method === undefined) return
    const event: CdpEvent = {
      method: data.method,
      params: data.params ?? {},
      ...(data.sessionId === undefined ? {} : { sessionId: data.sessionId }),
    }
    for (const listener of listeners) listener(event)
  })
  ws.addEventListener('close', () => {
    for (const { reject, method } of pending.values())
      reject(new Error(`${method}: Chrome closed the connection`))
    pending.clear()
  })

  const send = <T>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ) =>
    new Promise<T>((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve: resolve as (value: never) => void, reject, method })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  return {
    send,
    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async newPage({ isolated = false } = {}) {
      const context = isolated
        ? (await send<{ browserContextId: string }>('Target.createBrowserContext', {}))
            .browserContextId
        : undefined
      const { targetId } = await send<{ targetId: string }>('Target.createTarget', {
        url: 'about:blank',
        ...(context ? { browserContextId: context } : {}),
      })
      const { sessionId } = await send<{ sessionId: string }>('Target.attachToTarget', {
        targetId,
        flatten: true,
      })
      return { sessionId, targetId }
    },
    pid,
    profile,
    port,
    stop() {
      try {
        ws.close()
      } catch {
        // Closed already.
      }
      stop()
    },
  }
}
