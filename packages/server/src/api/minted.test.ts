import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app.js'
import type { Config } from '../config.js'
import { openStore } from '../store/db.js'
import { dumpAll, scratchDir } from '../store/testing.js'
import type { KeptTokens } from './progress.js'
import {
  ALICE,
  AS_ALICE,
  AS_BOB,
  AS_DANA,
  BOB,
  DANA,
  fakeControlPlane,
} from './testing.js'

/**
 * F6b TASK 3 (D5): WHICH TOKENS ON AN APP ARE OURS. Our page mints every token, in the person's
 * session, and hands our server the id beside a conversation's secret, or the id alone for an agent
 * of their own (`POST …/agents`): never a secret. *Agents* reads them back here, for the app's kept
 * members alone. Who made one is the platform's `Token.mintedBy` (FE-49), never answered here.
 */
const ORIGIN = 'https://app.manifest.internal'
const STUDENT_APP = 'https://reading-responses.staging.manifest.internal'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const WATCH_ID = '0f000000-0000-4000-8000-00000000000a'
const CONVERSATION_ID = '0f000000-0000-4000-8000-00000000000b'
const AGENT_ID = '0f000000-0000-4000-8000-00000000000c'
const AGENT = {
  tokenId: AGENT_ID,
  name: 'Claude Code',
  expiresAt: '2026-11-01T21:00:00.000Z',
}

let platform: Awaited<ReturnType<typeof fakeControlPlane>>
beforeAll(async () => {
  platform = await fakeControlPlane()
})
afterAll(() => platform.close())

const cleanups: (() => Promise<unknown> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

function setUp({ kept = true }: { kept?: boolean } = {}) {
  const { dir, remove } = scratchDir()
  const file = join(dir, 'app.sqlite')
  const store = openStore(file)
  const config: Config = {
    mode: 'edge',
    port: 7105,
    origin: ORIGIN,
    platformOrigin: platform.origin,
    sessionOrigin: platform.origin,
    modelGateway: 'http://127.0.0.1:7106/v1',
    planModel: 'default-chat',
    smtpUrl: 'smtp://127.0.0.1:7111',
    mailFrom: 'Manifest <manifest@app.manifest.internal>',
  }
  const app = buildServer(config, () => undefined, { store })
  cleanups.push(
    () => app.close(),
    () => store.close(),
    remove,
  )
  for (const person of [ALICE, BOB, DANA]) store.rememberPerson(person)
  if (kept)
    store.putMembers(PROJECT, [
      {
        userId: ALICE.id,
        role: 'owner',
        displayName: ALICE.displayName,
        email: ALICE.email,
      },
      {
        userId: BOB.id,
        role: 'collaborator',
        displayName: BOB.displayName,
        email: BOB.email,
      },
    ])
  const get = (cookie: string) =>
    app.inject({
      method: 'GET',
      url: `/api/apps/${PROJECT}/minted`,
      headers: { cookie },
    })
  const keepAgent = (body: unknown, cookie = AS_BOB, origin = ORIGIN) =>
    app.inject({
      method: 'POST',
      url: `/api/apps/${PROJECT}/agents`,
      headers: { cookie, origin, 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    })
  return { store, file, get, keepAgent }
}

/** Alice's change, with its token's id kept, and our watch of the app. */
function ours(s: ReturnType<typeof setUp>) {
  const change = s.store.createChange(
    ALICE.id,
    PROJECT,
    'Word count',
    'Also a word count.',
  )
  s.store.keepMinted({
    tokenId: CONVERSATION_ID,
    projectId: PROJECT,
    personId: ALICE.id,
    purpose: 'conversation',
    conversationId: change.id,
    name: null,
    expiresAt: null,
    mintedAt: '2026-10-02T21:00:00.000Z',
  })
  s.store.putWatch({
    projectId: PROJECT,
    tokenId: WATCH_ID,
    sealed: 'v1.AAAA',
    expiresAt: '2026-12-31T00:00:00.000Z',
    mintedBy: ALICE.id,
    mintedAt: '2026-10-02T20:00:00.000Z',
  })
  return change
}

describe('GET /api/apps/:projectId/minted: ours, and the agents let in (F6b D5)', () => {
  it('to a kept member: our watch, each conversation’s token with its title, and each agent’s id alone (its maker is the platform’s mintedBy, FE-49)', async () => {
    const s = setUp()
    const change = ours(s)
    expect((await s.keepAgent(AGENT)).statusCode).toBe(201)
    const answer = await s.get(AS_BOB)
    expect(answer.statusCode).toBe(200)
    expect(answer.json() as KeptTokens).toEqual({
      ours: [
        { tokenId: WATCH_ID, purpose: 'watch', conversationId: null, title: null },
        {
          tokenId: CONVERSATION_ID,
          purpose: 'conversation',
          conversationId: change.id,
          title: 'Word count',
        },
      ],
      agents: [{ tokenId: AGENT_ID }],
    } satisfies KeptTokens)
    // Nobody named as its maker: a member's word is no maker (minors m122).
    expect(JSON.stringify(answer.json())).not.toContain(BOB.id)
  })

  it('a watch replaced (the review’s I2): every watch we were handed is ours until it expires, the current one once', async () => {
    const s = setUp()
    ours(s)
    const watch = (tokenId: string, expiresAt: string) =>
      s.store.putWatch({
        projectId: PROJECT,
        tokenId,
        sealed: 'v1.AAAA',
        expiresAt,
        mintedBy: ALICE.id,
        mintedAt: '2026-10-02T22:00:00.000Z',
      })
    const OLDER = '0f000000-0000-4000-8000-0000000000a1'
    const LAPSED = '0f000000-0000-4000-8000-0000000000a2'
    const NEWER = '0f000000-0000-4000-8000-0000000000a3'
    watch(LAPSED, '2026-01-01T00:00:00.000Z')
    watch(OLDER, '2027-01-01T00:00:00.000Z')
    watch(NEWER, '2027-10-01T00:00:00.000Z')
    const watches = ((await s.get(AS_BOB)).json() as KeptTokens).ours
      .filter((one) => one.purpose === 'watch')
      .map((one) => one.tokenId)
      .sort()
    expect(watches).toEqual([WATCH_ID, OLDER, NEWER].sort())
  })

  it('nothing kept yet: two empty lists', async () => {
    const s = setUp()
    expect((await s.get(AS_ALICE)).json()).toEqual({ ours: [], agents: [] })
  })

  it('to someone not kept on the app, or on an app with no kept members: 404', async () => {
    const s = setUp()
    ours(s)
    expect((await s.get(AS_DANA)).statusCode).toBe(404)
    const t = setUp({ kept: false })
    expect((await t.get(AS_ALICE)).statusCode).toBe(404)
  })
})

describe('POST /api/apps/:projectId/agents: an agent of their own, its id alone (Review Focus 4)', () => {
  it('kept as an agent’s, made by the person who sent it: 201', async () => {
    const s = setUp()
    const answer = await s.keepAgent(AGENT)
    expect(answer.statusCode).toBe(201)
    expect(s.store.mintedOn(PROJECT)).toEqual([
      expect.objectContaining({
        tokenId: AGENT_ID,
        personId: BOB.id,
        purpose: 'agent',
        conversationId: null,
        name: 'Claude Code',
        expiresAt: AGENT.expiresAt,
      }),
    ])
  })

  it.each([
    ['a secret', { ...AGENT, secret: 'mft_0123_abcd' }],
    ['a token', { ...AGENT, token: 'mft_0123_abcd' }],
    ['no id', { name: AGENT.name, expiresAt: AGENT.expiresAt }],
    ['an id that is not one', { ...AGENT, tokenId: 'mft_0123' }],
    ['no name', { tokenId: AGENT_ID, expiresAt: AGENT.expiresAt }],
    ['a name shaped like a credential', { ...AGENT, name: 'mft_0123_abcd' }],
    ['an expiry that is no moment', { ...AGENT, expiresAt: 'next month' }],
  ])('with %s is 400 AGENT_INVALID, and nothing is kept', async (_, body) => {
    const s = setUp()
    const answer = await s.keepAgent(body)
    expect(answer.statusCode).toBe(400)
    expect(answer.json()).toEqual({ error: { code: 'AGENT_INVALID' } })
    expect(s.store.mintedOn(PROJECT)).toEqual([])
    expect(JSON.stringify(dumpAll(s.file))).not.toContain('mft_')
  })

  it('from someone not kept on the app: 404, and nothing is kept', async () => {
    const s = setUp()
    expect((await s.keepAgent(AGENT, AS_DANA)).statusCode).toBe(404)
    expect(s.store.mintedOn(PROJECT)).toEqual([])
  })

  it('from a student app: 403 ORIGIN_REFUSED, and nothing is kept', async () => {
    const s = setUp()
    const answer = await s.keepAgent(AGENT, AS_BOB, STUDENT_APP)
    expect(answer.statusCode).toBe(403)
    expect(answer.json()).toEqual({ error: { code: 'ORIGIN_REFUSED' } })
    expect(s.store.mintedOn(PROJECT)).toEqual([])
  })
})
