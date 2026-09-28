import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { openStore, type Store } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import { createHub, publishRefusal, publishState, type Hub } from './events.js'
import type { Progress } from './progress.js'
import { ALICE, AS_ALICE, AS_BOB, fakeControlPlane } from './testing.js'

const NOTHING_YET = {
  round: null,
  understood: null,
  answers: {},
  skipped: [],
  names: null,
  namesAsked: 0,
  blueprint: null,
}

/**
 * DECISION 4: ONE STREAM PER CONVERSATION, the whole state first, then each change. Over
 * real HTTP, read as it arrives, because buffering is exactly what could break it.
 */
let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const ORIGIN = 'https://app.manifest.internal'
const WORDS = "A page where students post a response to the week's reading."
const closers: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close()
})

function storeAt(file: string): Store {
  const store = openStore(file)
  return store
}

async function serve(
  file: string,
  heartbeatMs = 25_000,
): Promise<{ base: string; store: Store; hub: Hub; app: FastifyInstance }> {
  const store = storeAt(file)
  const hub = createHub()
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
    modelGateway: 'http://127.0.0.1:7106/v1',
  }
  const app = buildServer(config, (_, response) => response.end(), {
    store,
    hub,
    heartbeatMs,
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  return {
    base: `http://127.0.0.1:${(app.server.address() as { port: number }).port}`,
    store,
    hub,
    app,
  }
}

function file(): string {
  const { dir, remove } = scratchDir()
  closers.push(remove)
  return join(dir, 'app.sqlite')
}

/** A stream, read as it arrives: its frames, its comments, and a way to wait for more. */
async function open(base: string, id: string, cookie = AS_ALICE) {
  const abort = new AbortController()
  const response = await fetch(`${base}/api/conversations/${id}/events`, {
    headers: { cookie, accept: 'text/event-stream' },
    signal: abort.signal,
  })
  const frames: Progress[] = []
  const comments: string[] = []
  const waiters: (() => void)[] = []
  if (response.ok) {
    void (async () => {
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        for await (const chunk of response.body!) {
          buffer += decoder.decode(chunk as Uint8Array, { stream: true })
          let end: number
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, end)
            buffer = buffer.slice(end + 2)
            if (block.startsWith(':')) comments.push(block)
            const data = block.split('\n').find((line) => line.startsWith('data: '))
            if (data !== undefined) frames.push(JSON.parse(data.slice(6)) as Progress)
            for (const wake of waiters.splice(0)) wake()
          }
        }
      } catch {
        // aborted by the test
      }
    })()
  }
  const until = async (done: () => boolean, ms = 2000) => {
    const deadline = Date.now() + ms
    while (!done()) {
      if (Date.now() > deadline)
        throw new Error(`waited ${ms} ms; frames: ${JSON.stringify(frames)}`)
      await new Promise<void>((resolve) => {
        waiters.push(resolve)
        setTimeout(resolve, 20)
      })
    }
  }
  closers.push(() => abort.abort())
  return { response, frames, comments, until, abort }
}

describe('GET /api/conversations/:id/events', () => {
  it('connecting gets the state frame first: the whole conversation', async () => {
    const f = file()
    const { base, store, app } = await serve(f)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)

    const stream = await open(base, made.id)
    expect(stream.response.status).toBe(200)
    expect(stream.response.headers.get('content-type')).toBe('text/event-stream')
    expect(stream.response.headers.get('cache-control')).toBe('no-cache')
    await stream.until(() => stream.frames.length >= 1)
    expect(stream.frames[0]).toEqual({
      kind: 'state',
      conversation: made,
      intake: NOTHING_YET,
    })
  })

  it('a publish reaches two connected clients, in order', async () => {
    const f = file()
    const { base, store, hub, app } = await serve(f)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    const [one, two] = [await open(base, made.id), await open(base, made.id)]
    await one.until(() => one.frames.length >= 1)
    await two.until(() => two.frames.length >= 1)

    hub.publish(made.id, { kind: 'step', step: 'understanding', state: 'now' })
    publishState(hub, store, store.setState(made.id, 'questions'))
    for (const s of [one, two]) {
      await s.until(() => s.frames.length >= 3)
      expect(s.frames.slice(1)).toEqual([
        { kind: 'step', step: 'understanding', state: 'now' },
        {
          kind: 'state',
          conversation: expect.objectContaining({ state: 'questions' }),
          intake: NOTHING_YET,
        },
      ])
    }
  })

  it('a frame for another conversation never reaches this one', async () => {
    const f = file()
    const { base, store, hub, app } = await serve(f)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const mine = store.createConversation(ALICE.id, WORDS)
    const other = store.createConversation(ALICE.id, 'Something else')
    const stream = await open(base, mine.id)
    await stream.until(() => stream.frames.length >= 1)
    hub.publish(other.id, { kind: 'step', step: 'understanding', state: 'now' })
    hub.publish(mine.id, { kind: 'step', step: 'naming', state: 'done' })
    await stream.until(() => stream.frames.length >= 2)
    expect(stream.frames.slice(1)).toEqual([
      { kind: 'step', step: 'naming', state: 'done' },
    ])
  })

  it("another person's connection is 404, with no frame; no person is 401", async () => {
    const f = file()
    const { base, store, app } = await serve(f)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)

    const bob = await open(base, made.id, AS_BOB)
    expect([bob.response.status, await bob.response.json()]).toEqual([
      404,
      { error: { code: 'NOT_FOUND' } },
    ])
    const nobody = await open(base, made.id, '')
    expect(nobody.response.status).toBe(401)
  })

  it('a refusal carries its reference, and its problems row exists when the frame arrives (Decision 11)', async () => {
    const f = file()
    const { base, store, hub, app } = await serve(f)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    const stream = await open(base, made.id)
    await stream.until(() => stream.frames.length >= 1)

    let rowsWhenSent: unknown[] = []
    const unsubscribe = hub.subscribe(made.id, () => {
      rowsWhenSent = JSON.parse(dumpAll(f)['problems'] ?? '[]') as unknown[]
    })
    const reference = publishRefusal(
      hub,
      store,
      {
        conversation: made,
        code: 'MODEL_ANSWER_INVALID',
        operation: 'intake',
      },
      () => undefined,
    )
    unsubscribe()
    await stream.until(() => stream.frames.length >= 2)
    expect(stream.frames[1]).toEqual({
      kind: 'refusal',
      code: 'MODEL_ANSWER_INVALID',
      reference,
    })
    expect(rowsWhenSent).toEqual([
      expect.objectContaining({
        reference,
        code: 'MODEL_ANSWER_INVALID',
        person_id: ALICE.id,
        conversation_id: made.id,
      }),
    ])
  })

  it('an idle stream carries a comment line on the heartbeat, and is never ended', async () => {
    const f = file()
    const { base, store, app } = await serve(f, 40)
    closers.push(
      () => app.close(),
      () => store.close(),
    )
    store.rememberPerson(ALICE)
    const made = store.createConversation(ALICE.id, WORDS)
    const stream = await open(base, made.id)
    await stream.until(() => stream.comments.length >= 3)
    expect(stream.comments.every((c) => /^: /.test(c))).toBe(true)
    expect(stream.frames).toHaveLength(1)
  })
})

describe('Review Focus 5, the stream’s half: our server restarts', () => {
  it('a reconnect after a restart gets the stored state, not an empty stream', async () => {
    const f = file()
    const first = await serve(f)
    first.store.rememberPerson(ALICE)
    const made = first.store.createConversation(ALICE.id, WORDS)
    const before = await open(first.base, made.id)
    await before.until(() => before.frames.length >= 1)
    publishState(first.hub, first.store, first.store.setState(made.id, 'planning'))
    await before.until(() => before.frames.length >= 2)

    // The restart: the server closes (ending its streams) and a new one opens the same file.
    await first.app.close()
    first.store.close()
    const second = await serve(f)
    closers.push(
      () => second.app.close(),
      () => second.store.close(),
    )

    const after = await open(second.base, made.id)
    await after.until(() => after.frames.length >= 1)
    expect(after.frames[0]).toEqual({
      kind: 'state',
      conversation: expect.objectContaining({ id: made.id, state: 'planning' }),
      intake: NOTHING_YET,
    })
  })
})
