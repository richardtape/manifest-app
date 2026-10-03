import { createHash } from 'node:crypto'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { Duplex } from 'node:stream'
import type { StreamFrame, subscribe } from '@manifest/contract'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { platformStream, type ProjectEvent, type Replay } from './stream.js'

/**
 * F3 TASK 5: THE PROJECT'S EVENT STREAM ON OUR SERVER (Decision 15), over the contract's own
 * `subscribe()`. Most cases script `subscribe` itself, with fake timers for the waits; one
 * runs the real thing against a real upgrade, so the socket, its headers and the `GET` that
 * explains a `1006` are proved too (M1, M3).
 */
const TOKEN = 'mft_test_x_the_conversations_token'
const PROJECT = '6af9d7e5-2aa5-48fd-a1c8-85a6800cc687'

afterEach(() => {
  vi.useRealTimers()
})

const event = (n: number, type = 'agent_session.started'): StreamFrame =>
  ({
    kind: 'event',
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    projectId: PROJECT,
    subject: `agent_session:${n}`,
    type,
    humanMessage: 'for a person',
    machineDetail: { n },
    createdAt: '2026-09-28T20:24:21.643Z',
  }) as unknown as StreamFrame
const READY = {
  kind: 'control',
  id: 'ready',
  projectId: PROJECT,
  type: 'manifest.stream.ready',
} as StreamFrame

/** A scripted `subscribe`: each connection is driven by hand. */
function scriptedSubscribe() {
  const connections: {
    options: Parameters<typeof subscribe>[0]
    replay: (frames: StreamFrame[]) => void
    drop: (code: number) => void
    closedByUs: boolean
  }[] = []
  const open: typeof subscribe = (options) => {
    let markReady: () => void = () => undefined
    let refuse: (e: Error) => void = () => undefined
    let end: (c: { code: number; reason: string }) => void = () => undefined
    const ready = new Promise<void>((resolve, reject) => {
      markReady = resolve
      refuse = reject
    })
    ready.catch(() => undefined)
    const closed = new Promise<{ code: number; reason: string }>(
      (resolve) => (end = resolve),
    )
    const connection = {
      options,
      closedByUs: false,
      replay(frames: StreamFrame[]) {
        for (const frame of frames) {
          options.onFrame(frame)
          if (frame.kind === 'control') markReady()
        }
      },
      drop(code: number) {
        refuse(new Error(`closed ${code}`))
        end({ code, reason: '' })
      },
    }
    connections.push(connection)
    return {
      ready,
      closed,
      close() {
        connection.closedByUs = true
        refuse(new Error('closed 1005'))
        end({ code: 1005, reason: '' })
      },
    }
  }
  return { open, connections }
}

function watching(probeStatus: number | (() => number) = 426) {
  const { open, connections } = scriptedSubscribe()
  const probes: { url: string; token: string }[] = []
  const probe = async (url: string, token: string) => {
    probes.push({ url, token })
    return typeof probeStatus === 'number' ? probeStatus : probeStatus()
  }
  const events: ProjectEvent[] = []
  const replays: Replay[] = []
  /** What the handlers were told, in order. */
  const told: string[] = []
  let reconnected = 0
  let refused = 0
  const watch = platformStream('http://127.0.0.1:7100', open, probe).watch(
    TOKEN,
    PROJECT,
    {
      event: (e) => events.push(e),
      reconnected: () => {
        reconnected++
        told.push('reconnected')
      },
      refused: () => refused++,
      replayed: (replay) => {
        replays.push(replay)
        told.push('replayed')
      },
    },
  )
  return {
    watch,
    connections,
    probes,
    events,
    replays,
    told,
    counts: () => ({ reconnected, refused, connections: connections.length }),
  }
}

describe('each event once (Decision 15)', () => {
  it('a replay of 50 that overlaps what was seen delivers only the new ones, as ProjectEvents', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([event(1), event(2), event(3), READY])
    await w.watch.ready
    w.connections[0]!.drop(1001)
    await vi.advanceTimersByTimeAsync(200)
    w.connections[1]!.replay([
      ...Array.from({ length: 50 }, (_, i) => event(i + 1)),
      READY,
    ])
    await vi.advanceTimersByTimeAsync(0)
    expect(w.events.map((e) => e.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => event(i + 1)).map(
        (f) => (f as { id: string }).id,
      ),
    )
    expect(w.events[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      type: 'agent_session.started',
      subject: 'agent_session:1',
      detail: { n: 1 },
      // F6: when the platform recorded it, so a replay's history keeps its own times.
      at: '2026-09-28T20:24:21.643Z',
    })
    expect(w.counts().reconnected).toBe(1)
  })

  it('hands over who acted as the platform sent it (EventFrame.actor; the adoption note’s question 10), and nothing when a frame names nobody', async () => {
    vi.useFakeTimers()
    const w = watching()
    const actor = {
      name: 'Operator One',
      asAdministrator: true,
      reason: 'Rotating a key that leaked',
      token: null,
    }
    w.connections[0]!.replay([
      { ...(event(1) as object), actor } as unknown as StreamFrame,
      { ...(event(2) as object), actor: null } as unknown as StreamFrame,
      READY,
    ])
    await w.watch.ready
    expect(w.events.map((e) => e.actor)).toEqual([actor, null])
  })

  it('each replay is reported once handed over (F6): every event it carried, in order, and whether this watch had handed any over already', async () => {
    vi.useFakeTimers()
    const w = watching()
    const id = (n: number) => (event(n) as { id: string }).id
    w.connections[0]!.replay([event(1), event(2), event(3), READY])
    await w.watch.ready
    expect(w.replays).toEqual([{ ids: [id(1), id(2), id(3)], overlapped: false }])
    // Live, after the replay: no replay of its own.
    w.connections[0]!.options.onFrame(event(4))
    expect(w.replays).toHaveLength(1)
    // A reconnect whose replay reaches back to what it saw.
    w.connections[0]!.drop(1001)
    await vi.advanceTimersByTimeAsync(200)
    w.connections[1]!.replay([event(3), event(4), event(5), READY])
    await vi.advanceTimersByTimeAsync(0)
    expect(w.replays[1]).toEqual({ ids: [id(3), id(4), id(5)], overlapped: true })
    // One that does not: everything in it is newer than what this watch saw.
    w.connections[1]!.drop(1001)
    await vi.advanceTimersByTimeAsync(200)
    w.connections[2]!.replay([event(9), event(10), READY])
    await vi.advanceTimersByTimeAsync(0)
    expect(w.replays[2]).toEqual({ ids: [id(9), id(10)], overlapped: false })
    expect(w.events.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 9, 10].map(id))
    // Told the replay first, then that it reconnected: what was missed is known before the re-read.
    expect(w.told).toEqual([
      'replayed',
      'replayed',
      'reconnected',
      'replayed',
      'reconnected',
    ])
  })

  it('an empty replay is reported empty', async () => {
    const w = watching()
    w.connections[0]!.replay([READY])
    await w.watch.ready
    expect(w.replays).toEqual([{ ids: [], overlapped: false }])
  })

  it('log and control frames are never events', async () => {
    const w = watching()
    const log = {
      kind: 'log',
      id: 'b:1',
      buildId: 'b',
      seq: 1,
      text: 'npm ci',
    } as unknown as StreamFrame
    w.connections[0]!.replay([log, READY, log])
    await w.watch.ready
    expect(w.events).toEqual([])
  })
})

describe('a drop reconnects, after a growing wait (Decision 15)', () => {
  it.each([1001, 1011, 1013])(
    '%i: waits 200 ms, then connects again and says it reconnected',
    async (code) => {
      vi.useFakeTimers()
      const w = watching()
      w.connections[0]!.replay([READY])
      await w.watch.ready
      w.connections[0]!.drop(code)
      await vi.advanceTimersByTimeAsync(199)
      expect(w.counts().connections).toBe(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(w.counts().connections).toBe(2)
      expect(w.counts().reconnected).toBe(0)
      w.connections[1]!.replay([READY])
      await vi.advanceTimersByTimeAsync(0)
      expect(w.counts().reconnected).toBe(1)
      expect(w.probes).toEqual([])
    },
  )

  it('doubles the wait while it cannot connect, caps it, and starts again at 200 ms once connected', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([READY])
    await w.watch.ready
    const waits: number[] = []
    for (let drop = 0; drop < 8; drop++) {
      w.connections.at(-1)!.drop(1011)
      const before = w.counts().connections
      let waited = 0
      while (w.counts().connections === before) {
        await vi.advanceTimersByTimeAsync(100)
        waited += 100
      }
      waits.push(waited)
    }
    expect(waits).toEqual([200, 400, 800, 1600, 3200, 6400, 10000, 10000])
    w.connections.at(-1)!.replay([READY])
    await vi.advanceTimersByTimeAsync(0)
    w.connections.at(-1)!.drop(1001)
    await vi.advanceTimersByTimeAsync(200)
    expect(w.counts().connections).toBe(10)
  })

  it('Review Focus 5: an event that fell outside the replay is not invented; the round is told to re-read', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([event(1, 'build.started'), READY])
    await w.watch.ready
    w.connections[0]!.drop(1001)
    await vi.advanceTimersByTimeAsync(200)
    // The build ended while we were away, and 50 newer events pushed build.succeeded out of the replay.
    w.connections[1]!.replay([
      ...Array.from({ length: 50 }, (_, i) => event(i + 100)),
      READY,
    ])
    await vi.advanceTimersByTimeAsync(0)
    expect(w.events.some((e) => e.type === 'build.succeeded')).toBe(false)
    expect(w.counts().reconnected).toBe(1)
  })
})

describe('a refused token stops (M1, M3: a 1006, then a GET says why)', () => {
  it('1006, then GET 401: refused once, never a reconnect, and ready rejects', async () => {
    vi.useFakeTimers()
    const w = watching(401)
    w.connections[0]!.drop(1006)
    await expect(w.watch.ready).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(w.counts()).toEqual({ reconnected: 0, refused: 1, connections: 1 })
    expect(w.probes).toEqual([
      { url: `http://127.0.0.1:7100/v1/projects/${PROJECT}/events`, token: TOKEN },
    ])
  })

  it('1006, then GET 404 (another project, or not ours): refused', async () => {
    vi.useFakeTimers()
    const w = watching(404)
    w.connections[0]!.drop(1006)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(w.counts()).toEqual({ reconnected: 0, refused: 1, connections: 1 })
  })

  it('1006, then GET 426 (the token is good; the network dropped it): a reconnect', async () => {
    vi.useFakeTimers()
    const w = watching(426)
    w.connections[0]!.replay([READY])
    await w.watch.ready
    w.connections[0]!.drop(1006)
    await vi.advanceTimersByTimeAsync(200)
    expect(w.counts()).toMatchObject({ refused: 0, connections: 2 })
  })

  it('4401, the token revoked or expired while its stream was open (FE-33, contract 1.5.0): refused without asking, never reopened', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([READY])
    await w.watch.ready
    w.connections[0]!.drop(4401)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(w.counts()).toEqual({ reconnected: 0, refused: 1, connections: 1 })
    expect(w.probes).toEqual([])
  })

  it('4404 and 4403 are refused without asking', async () => {
    for (const code of [4404, 4403]) {
      vi.useFakeTimers()
      const w = watching()
      w.connections[0]!.drop(code)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(w.counts()).toEqual({ reconnected: 0, refused: 1, connections: 1 })
      expect(w.probes).toEqual([])
      vi.useRealTimers()
    }
  })
})

describe('close()', () => {
  it('closes the socket, reconnects no more, and leaves no timer behind', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([READY])
    await w.watch.ready
    w.connections[0]!.drop(1001)
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)
    w.watch.close()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(w.counts().connections).toBe(1)
  })

  it('closing a live watch closes its subscription, and its close is not a drop', async () => {
    vi.useFakeTimers()
    const w = watching()
    w.connections[0]!.replay([READY])
    await w.watch.ready
    w.watch.close()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(w.connections[0]!.closedByUs).toBe(true)
    expect(w.counts()).toEqual({ reconnected: 0, refused: 0, connections: 1 })
  })
})

/** A real upgrade: a handshake written by hand, frames sent unmasked, and a drop with no close frame. */
async function realPlatform(
  onUpgrade: (headers: IncomingHttpHeaders, socket: Duplex) => void,
) {
  const gets: IncomingHttpHeaders[] = []
  const server: Server = createServer((request, response) => {
    gets.push(request.headers)
    response.writeHead(401, { 'content-type': 'application/json' })
    response.end(
      JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'revoked' } }),
    )
  })
  server.on('upgrade', (request, socket) => {
    const accept = createHash('sha1')
      .update(
        `${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`,
      )
      .digest('base64')
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    )
    onUpgrade(request.headers, socket)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    gets,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

function text(socket: Duplex, value: unknown) {
  const payload = Buffer.from(JSON.stringify(value))
  const header =
    payload.length < 126
      ? Buffer.from([0x81, payload.length])
      : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 0xff])
  socket.write(Buffer.concat([header, payload]))
}

describe('the real socket (M1, M3)', () => {
  it('sends the Bearer token and no Origin; hands over the replay; and a drop whose GET says 401 is refused', async () => {
    const upgrades: IncomingHttpHeaders[] = []
    const platform = await realPlatform((headers, socket) => {
      upgrades.push(headers)
      text(socket, event(1, 'build.started'))
      text(socket, READY)
      // Revoked: the socket is cut without a close frame, which a client sees as 1006.
      setTimeout(() => socket.destroy(), 50)
    })
    const events: ProjectEvent[] = []
    let refused = 0
    const watch = platformStream(platform.origin).watch(TOKEN, PROJECT, {
      event: (e) => events.push(e),
      reconnected: () => undefined,
      refused: () => refused++,
    })
    await watch.ready
    await vi.waitFor(() => expect(refused).toBe(1), { timeout: 5000 })
    watch.close()
    await platform.close()

    expect(upgrades).toHaveLength(1)
    expect(upgrades[0]?.authorization).toBe(`Bearer ${TOKEN}`)
    expect(upgrades[0]?.origin).toBeUndefined()
    expect(upgrades[0]?.cookie).toBeUndefined()
    expect(events.map((e) => e.type)).toEqual(['build.started'])
    expect(platform.gets).toHaveLength(1)
    expect(platform.gets[0]?.authorization).toBe(`Bearer ${TOKEN}`)
    expect(platform.gets[0]?.cookie).toBeUndefined()
  })
})
