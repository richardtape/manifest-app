import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Rounds } from '../build/round.js'
import type { Config } from '../config.js'
import type { Person } from '../identity.js'
import { fromOf, gapsOf, linesOf } from '../keeping/happenings.js'
import type { Handed, Keeper } from '../keeping/keeper.js'
import { PlatformRefusal } from '../platform/refusal.js'
import type { Store } from '../store/db.js'
import type { KeptApp } from '../store/keeping.js'
import { chipOf } from './apps.js'
import type { Hub } from './events.js'
import { guard } from './guard.js'
import type { AppRef, Line, Need, SinceLine } from './progress.js'

/**
 * THE KEEPING WATCH TOKEN, HANDED OVER (F6 design §1). The page mints it in the person's session
 * (no step-up; any member may) and hands it here whenever we are not watching the app, or our
 * token has under 30 days left. Guarded as every change is (`Origin`, the person). **An app's
 * keeping is its members' alone**, by the members the keeper keeps: anyone else is `404`, as the
 * platform answers a stranger (Review Focus 5). An app we keep nothing for answers *not watching*,
 * so its page mints; the token it hands proves it can read the project, or nothing is kept.
 */
const refuse = (reply: FastifyReply, status: number, code: string) =>
  reply.code(status).send({ error: { code } })

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN = /^\S{1,512}$/
const KEYS = ['expiresAt', 'token', 'tokenId']

function handedOf(body: unknown): Handed | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined
  const b = body as Record<string, unknown>
  if (Object.keys(b).sort().join() !== KEYS.join()) return undefined
  const { token, tokenId, expiresAt } = b
  if (typeof token !== 'string' || !TOKEN.test(token)) return undefined
  if (typeof tokenId !== 'string' || !ID.test(tokenId)) return undefined
  if (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt)))
    return undefined
  return { token, tokenId, expiresAt }
}

/** What the platform refused, as the page is told: the token's, or the platform's absence. */
const NOT_THE_TOKENS = new Set([401, 403, 404])

/** *Answering again* is a need for a day after the recovery (design §4). */
const A_DAY_MS = 86_400_000
/** *Since you were last here*: at most this many lines (design §2). */
const SINCE_LINES = 5

const refOf = ({ projectId, name, slug }: KeptApp): AppRef => ({ projectId, name, slug })

const newestFirst = (a: { at: string }, b: { at: string }) =>
  Date.parse(b.at) - Date.parse(a.at)

export function registerKeeping(
  app: FastifyInstance,
  {
    config,
    store,
    keeper,
    hub,
    rounds,
  }: {
    config: Config
    store: Store
    keeper: Keeper
    hub: Pick<Hub, 'busy'>
    rounds: Pick<Rounds, 'stop'>
  },
): void {
  const check = guard(config)
  /** A stranger to an app we keep members for; an app we keep none for is anyone's to mint. */
  const stranger = (projectId: string, personId: string) => {
    const members = store.members(projectId)
    return members.length > 0 && !members.some((member) => member.userId === personId)
  }
  /**
   * The whole-branch review's I2: our kept members are the truth only while we watch. A watch that
   * closed (`4401`: a switch-off, an expiry, its minter taken off the app, FE-48) heard no
   * `member.*` after it, so an app we no longer watch is anyone's to mint for, as one we keep
   * nothing for: the token handed over decides, by the members it reads (`hand`'s `stranger`).
   */
  const strangerWhileWatched = (projectId: string, personId: string) =>
    keeper.status(projectId).watching && stranger(projectId, personId)
  /** Review Focus 5: their role on the app, by the kept members; none for anyone else. */
  const roleOf = (projectId: string, personId: string) =>
    store.members(projectId).find((member) => member.userId === personId)?.role

  /**
   * Decision 7: this page load is a visit. Their row first (S2: a visit of a person never
   * remembered writes nothing), then when their previous visit ended.
   */
  function visited(person: Person): string | null {
    store.rememberPerson(person)
    return store.visit(person.id, new Date().toISOString()).lastHere
  }

  /**
   * The apps a request is about: theirs by the kept members, or `?projectId=`'s alone. Another
   * person's app is `404` (Review Focus 5), as the platform answers a stranger.
   */
  function appsAsked(projectId: unknown, personId: string): KeptApp[] | undefined {
    const theirs = store.appsOf(personId)
    if (projectId === undefined) return theirs
    if (
      typeof projectId !== 'string' ||
      !ID.test(projectId) ||
      stranger(projectId, personId)
    )
      return undefined
    return theirs.filter((kept) => kept.projectId === projectId)
  }

  const linesOn = (kept: KeptApp): Line[] =>
    linesOf(
      store.historyOf(kept.projectId),
      store.members(kept.projectId),
      kept.launchedAt,
    )

  /**
   * Design §2, source 3: the newest production change that didn't go live, unless a version has
   * reached the students since, or anyone's fix for it is under way (Decision 15).
   */
  function changeFailed(kept: KeptApp): { incidentId: string; at: string } | undefined {
    for (const { happening, at } of linesOn(kept)) {
      if (happening.kind === 'reached-students' || happening.kind === 'went-live') return
      if (happening.kind === 'change-failed')
        return store.fixUnderWay(kept.projectId, happening.incidentId)
          ? undefined
          : { incidentId: happening.incidentId, at }
    }
    return undefined
  }

  /** Design §2's band, for one of their apps. */
  function needsOn(kept: KeptApp, personId: string, now: number): Need[] {
    const app = refOf(kept)
    const needs: Need[] = []
    for (const conversation of store.listConversationsOn(kept.projectId, personId)) {
      const chip = chipOf(
        conversation,
        store.latestRun(conversation.id),
        hub.busy(conversation.id),
      )
      if (chip === 'attention')
        needs.push({
          kind: 'question',
          app,
          conversationId: conversation.id,
          title: conversation.title,
          since: conversation.updatedAt,
        })
    }
    // Switched off, nothing is live: no fall, and nobody's students missing a change. Known here
    // only when the kept app says so: a switch-off closes the watch `4401` before `project.archived`
    // reaches it (S1, M4), so the page drops the rest by the platform's state (`needsStillTrue`,
    // the whole-branch review's I1).
    if (kept.state !== 'active') return needs
    const owner = roleOf(kept.projectId, personId) === 'owner'
    const outage = keeper.outage(kept.projectId)
    if (outage.state === 'down')
      needs.push({ kind: 'down', app, from: outage.from, owner })
    else if (
      outage.state !== 'off' &&
      outage.recovered !== null &&
      now - Date.parse(outage.recovered.to) < A_DAY_MS
    )
      needs.push({ kind: 'answering-again', app, ...outage.recovered })
    const failed = changeFailed(kept)
    if (failed !== undefined) needs.push({ kind: 'change-failed', app, ...failed, owner })
    return needs
  }

  // DESIGN §2: WHAT NEEDS THEM, across their apps or on one.
  app.get<{ Querystring: { projectId?: unknown } }>(
    '/api/needs',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const apps = appsAsked(request.query.projectId, who.person.id)
      if (apps === undefined) return refuse(reply, 404, 'NOT_FOUND')
      visited(who.person)
      const now = Date.now()
      return { needs: apps.flatMap((kept) => needsOn(kept, who.person.id, now)) }
    },
  )

  // DESIGN §2: SINCE YOU WERE LAST HERE, at most five lines, newest first, each naming its app.
  app.get<{ Querystring: { projectId?: unknown } }>(
    '/api/since',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const apps = appsAsked(request.query.projectId, who.person.id)
      if (apps === undefined) return refuse(reply, 404, 'NOT_FOUND')
      const lastHere = visited(who.person)
      if (lastHere === null) return { lastHere, lines: [] }
      const after = Date.parse(lastHere)
      const lines: SinceLine[] = apps
        .flatMap((kept) =>
          linesOn(kept)
            .filter((line) => Date.parse(line.at) > after)
            .map((line) => ({ ...line, app: refOf(kept) })),
        )
        .sort(newestFirst)
        .slice(0, SINCE_LINES)
      return { lastHere, lines }
    },
  )

  // DESIGN §2: [EVERYTHING]. A member's alone, by the kept members (an archived app's too).
  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/history',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || roleOf(projectId, who.person.id) === undefined)
        return refuse(reply, 404, 'NOT_FOUND')
      const entries = store.historyOf(projectId)
      return {
        from: fromOf(entries),
        gaps: gapsOf(entries),
        lines: linesOf(
          entries,
          store.members(projectId),
          store.app(projectId)?.launchedAt ?? null,
        ),
      }
    },
  )

  // DECISION 11: A DRAFT ITS OWNER DELETED, forgotten. The page calls this only after the
  // platform's deleteProject succeeded; an owner's alone, by the kept members. A round working
  // on any of its conversations, anyone's, is stopped first, as Stop stops one.
  app.delete<{ Params: { projectId: string } }>(
    '/api/apps/:projectId',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || roleOf(projectId, who.person.id) !== 'owner')
        return refuse(reply, 404, 'NOT_FOUND')
      for (const conversation of store.conversationsOn(projectId))
        if (conversation.state === 'building' || conversation.state === 'paused')
          rounds.stop(conversation)
      keeper.forget(projectId)
      return reply.code(204).send()
    },
  )

  app.get<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/keeping',
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || strangerWhileWatched(projectId, who.person.id))
        return refuse(reply, 404, 'NOT_FOUND')
      const status = keeper.status(projectId)
      return {
        watching: status.watching,
        until: status.until,
        tokenId: status.tokenId,
        mine: status.mintedBy === who.person.id,
      }
    },
  )

  app.post<{ Params: { projectId: string } }>(
    '/api/apps/:projectId/keeping',
    { errorHandler: (_error, _request, reply) => refuse(reply, 400, 'KEEPING_INVALID') },
    async (request, reply) => {
      const who = await check(request, reply)
      if (who === undefined) return reply
      const { projectId } = request.params
      if (!ID.test(projectId) || strangerWhileWatched(projectId, who.person.id))
        return refuse(reply, 404, 'NOT_FOUND')
      const handed = handedOf(request.body)
      if (handed === undefined) return refuse(reply, 400, 'KEEPING_INVALID')
      let kept: 'kept' | 'current' | 'stranger'
      try {
        kept = await keeper.hand(projectId, handed, who.person.id)
      } catch (error) {
        const refusal =
          error instanceof PlatformRefusal ? error : new PlatformRefusal('INTERNAL', null)
        if (
          refusal.code === 'TOKEN_NOT_FOR_PROJECT' ||
          (refusal.status !== null && NOT_THE_TOKENS.has(refusal.status))
        )
          return refuse(reply, 400, 'TOKEN_NOT_FOR_PROJECT')
        return refuse(reply, 502, 'PLATFORM_UNAVAILABLE')
      }
      if (kept === 'stranger') return refuse(reply, 404, 'NOT_FOUND')
      const { until } = keeper.status(projectId)
      return kept === 'kept'
        ? reply.code(201).send({ watching: true, until })
        : reply.code(200).send({ kept: 'current', until })
    },
  )
}
