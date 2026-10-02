import type { DatabaseSync } from 'node:sqlite'

/**
 * F6 DECISION 3: WHAT THE KEEPER KEEPS, over the store's one database (`db.ts`), as `runs.ts`
 * keeps a round's. Its apps and their members (an archived app has no token to ask with, and a
 * restart must not forget who owns what), the one credential at rest (D2: sealed), what it saw
 * (Decision 1: as the platform said it), and each email once (D3).
 */

/** The four kinds of email (D3): it's in trouble, your work is waiting, a long wait is over, who's on it changed. */
export type EmailKind = 'trouble' | 'waiting' | 'over' | 'people'

export interface KeptApp {
  projectId: string
  name: string
  slug: string
  state: 'active' | 'archived'
  launchedAt: string | null
  /** Production's `Environment.url`: the students' address. Null before a deploy. */
  studentsUrl: string | null
}

export interface KeptMember {
  userId: string
  role: 'owner' | 'collaborator'
  displayName: string
  /** An address is not a credential. */
  email: string
}

/** D2: the one credential at rest, its secret sealed (`keeping/seal.ts`). */
export interface KeptWatch {
  projectId: string
  /** The platform's id, never secret. */
  tokenId: string
  sealed: string
  expiresAt: string
  /** Our person id. */
  mintedBy: string
  mintedAt: string
}

/**
 * A platform event as sent (`id` its own), or ours: `keeping.gap`, `keeping.stopped`,
 * `keeping.unreachable`, `keeping.answering`.
 */
export interface HistoryEntry {
  id: string
  projectId: string
  at: string
  type: string
  detail: unknown
}

/** One email per happening and recipient (D3). A happening starts with its project id. */
export type EmailKey = { kind: EmailKind; happening: string; recipient: string }
/** One email: its key (the recipient is its address), and what it says. */
export type Outgoing = { key: EmailKey; subject: string; text: string }

export interface KeepingStatements {
  /** Their address, from `getMe` (design §3); none for a person not remembered since F6. */
  personEmail(personId: string): string | undefined
  /**
   * Decision 7: records this page load, and answers when their previous visit ended. A visit is
   * page loads an hour apart or less. A person never remembered answers null, and nothing is written.
   */
  visit(personId: string, at: string): { lastHere: string | null }
  putApp(app: KeptApp): void
  app(projectId: string): KeptApp | undefined
  /** Replaces the app's members whole. */
  putMembers(projectId: string, members: KeptMember[]): void
  members(projectId: string): KeptMember[]
  /** The apps whose kept members include this person. */
  appsOf(personId: string): KeptApp[]
  putWatch(watch: KeptWatch): void
  watchOf(projectId: string): KeptWatch | undefined
  watches(): KeptWatch[]
  /** Drops the row only while it still holds this token: a newer one handed meanwhile stays. */
  dropWatch(projectId: string, tokenId: string): void
  /** False, and nothing written, when the id is already held. */
  addHistory(entry: HistoryEntry): boolean
  /** Oldest first. */
  historyOf(projectId: string): HistoryEntry[]
  /** Which of these ids are held. */
  heldOf(projectId: string, ids: string[]): string[]
  /** True when this call claimed it (state `sending`, its words kept); false when it was ever claimed. */
  claimEmail(outgoing: Outgoing): boolean
  emailDone(key: EmailKey, state: 'sent' | 'failed', tries: number): void
  /** Claimed, never finished: a restart's to finish, words and all (Review Focus 1). */
  emailsUnfinished(): Outgoing[]
  /** Decision 11: every row of ours for the app, every person's. */
  forgetApp(projectId: string): void
}

const HOUR_MS = 3_600_000

interface AppRow {
  project_id: string
  name: string
  slug: string
  state: 'active' | 'archived'
  launched_at: string | null
  students_url: string | null
}

const appOf = (row: AppRow): KeptApp => ({
  projectId: row.project_id,
  name: row.name,
  slug: row.slug,
  state: row.state,
  launchedAt: row.launched_at,
  studentsUrl: row.students_url,
})

interface WatchRow {
  project_id: string
  token_id: string
  sealed: string
  expires_at: string
  minted_by: string
  minted_at: string
}

const watchOf = (row: WatchRow): KeptWatch => ({
  projectId: row.project_id,
  tokenId: row.token_id,
  sealed: row.sealed,
  expiresAt: row.expires_at,
  mintedBy: row.minted_by,
  mintedAt: row.minted_at,
})

interface EmailRow {
  kind: EmailKind
  happening: string
  recipient: string
  subject: string
  body: string
}

/** A conversation on the app, whoever's: the rows that hang on it are found through it. */
const ON_APP = 'select id from conversations where project_id = ?'
const RUNS_ON_APP = `select id from runs where conversation_id in (${ON_APP})`

export function keepingStatements(
  db: DatabaseSync,
  now: () => string,
): KeepingStatements {
  function inOneTransaction(work: () => void): void {
    db.exec('begin')
    try {
      work()
      db.exec('commit')
    } catch (error) {
      db.exec('rollback')
      throw error
    }
  }

  return {
    personEmail(personId) {
      const row = db.prepare('select email from persons where id = ?').get(personId) as
        { email: string | null } | undefined
      return row?.email ?? undefined
    },

    visit(personId, at) {
      const row = db
        .prepare('select here_at, last_here from persons where id = ?')
        .get(personId) as { here_at: string | null; last_here: string | null } | undefined
      if (row === undefined) return { lastHere: null }
      const ended =
        row.here_at !== null && Date.parse(at) - Date.parse(row.here_at) > HOUR_MS
      const lastHere = ended ? row.here_at : row.last_here
      db.prepare('update persons set here_at = ?, last_here = ? where id = ?').run(
        at,
        lastHere,
        personId,
      )
      return { lastHere }
    },

    putApp(app) {
      db.prepare(
        `insert into apps (project_id, name, slug, state, launched_at, students_url, read_at)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict (project_id) do update set
           name = excluded.name, slug = excluded.slug, state = excluded.state,
           launched_at = excluded.launched_at, students_url = excluded.students_url,
           read_at = excluded.read_at`,
      ).run(
        app.projectId,
        app.name,
        app.slug,
        app.state,
        app.launchedAt,
        app.studentsUrl,
        now(),
      )
    },

    app(projectId) {
      const row = db.prepare('select * from apps where project_id = ?').get(projectId) as
        AppRow | undefined
      return row === undefined ? undefined : appOf(row)
    },

    putMembers(projectId, members) {
      inOneTransaction(() => {
        db.prepare('delete from members where project_id = ?').run(projectId)
        const insert = db.prepare(
          `insert into members (project_id, user_id, role, display_name, email)
           values (?, ?, ?, ?, ?)`,
        )
        for (const member of members)
          insert.run(
            projectId,
            member.userId,
            member.role,
            member.displayName,
            member.email,
          )
      })
    },

    members(projectId) {
      const rows = db
        .prepare(
          `select user_id, role, display_name, email from members where project_id = ?
           order by rowid`,
        )
        .all(projectId) as {
        user_id: string
        role: KeptMember['role']
        display_name: string
        email: string
      }[]
      return rows.map((row) => ({
        userId: row.user_id,
        role: row.role,
        displayName: row.display_name,
        email: row.email,
      }))
    },

    appsOf(personId) {
      const rows = db
        .prepare(
          `select apps.* from apps join members on members.project_id = apps.project_id
           where members.user_id = ? order by apps.name, apps.project_id`,
        )
        .all(personId) as unknown as AppRow[]
      return rows.map(appOf)
    },

    putWatch(watch) {
      db.prepare(
        `insert into watch_tokens (project_id, token_id, sealed, expires_at, minted_by, minted_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict (project_id) do update set
           token_id = excluded.token_id, sealed = excluded.sealed, expires_at = excluded.expires_at,
           minted_by = excluded.minted_by, minted_at = excluded.minted_at`,
      ).run(
        watch.projectId,
        watch.tokenId,
        watch.sealed,
        watch.expiresAt,
        watch.mintedBy,
        watch.mintedAt,
      )
    },

    watchOf(projectId) {
      const row = db
        .prepare('select * from watch_tokens where project_id = ?')
        .get(projectId) as WatchRow | undefined
      return row === undefined ? undefined : watchOf(row)
    },

    watches() {
      const rows = db
        .prepare('select * from watch_tokens order by project_id')
        .all() as unknown as WatchRow[]
      return rows.map(watchOf)
    },

    dropWatch(projectId, tokenId) {
      db.prepare('delete from watch_tokens where project_id = ? and token_id = ?').run(
        projectId,
        tokenId,
      )
    },

    addHistory(entry) {
      const { changes } = db
        .prepare(
          `insert into history (id, project_id, at, type, detail) values (?, ?, ?, ?, ?)
           on conflict (id) do nothing`,
        )
        .run(
          entry.id,
          entry.projectId,
          entry.at,
          entry.type,
          JSON.stringify(entry.detail),
        )
      return changes === 1
    },

    historyOf(projectId) {
      const rows = db
        .prepare(
          'select id, project_id, at, type, detail from history where project_id = ? order by at, rowid',
        )
        .all(projectId) as {
        id: string
        project_id: string
        at: string
        type: string
        detail: string
      }[]
      return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        at: row.at,
        type: row.type,
        detail: JSON.parse(row.detail) as unknown,
      }))
    },

    heldOf(projectId, ids) {
      if (ids.length === 0) return []
      const rows = db
        .prepare(
          `select id from history where project_id = ? and id in (${ids.map(() => '?').join(', ')})`,
        )
        .all(projectId, ...ids) as { id: string }[]
      const held = new Set(rows.map((row) => row.id))
      return ids.filter((id) => held.has(id))
    },

    claimEmail(outgoing) {
      const { changes } = db
        .prepare(
          `insert into emails (kind, happening, recipient, subject, body, state, tries, at)
           values (?, ?, ?, ?, ?, 'sending', 0, ?)
           on conflict (kind, happening, recipient) do nothing`,
        )
        .run(
          outgoing.key.kind,
          outgoing.key.happening,
          outgoing.key.recipient,
          outgoing.subject,
          outgoing.text,
          now(),
        )
      return changes === 1
    },

    emailDone(key, state, tries) {
      db.prepare(
        `update emails set state = ?, tries = ?, at = ?
         where kind = ? and happening = ? and recipient = ?`,
      ).run(state, tries, now(), key.kind, key.happening, key.recipient)
    },

    emailsUnfinished() {
      const rows = db
        .prepare(
          `select kind, happening, recipient, subject, body from emails where state = 'sending'
           order by at, rowid`,
        )
        .all() as unknown as EmailRow[]
      return rows.map((row) => ({
        key: { kind: row.kind, happening: row.happening, recipient: row.recipient },
        subject: row.subject,
        text: row.body,
      }))
    },

    forgetApp(projectId) {
      inOneTransaction(() => {
        // Children first: what hangs on a run, the runs, what hangs on a conversation, then it.
        db.prepare(`delete from trace where run_id in (${RUNS_ON_APP})`).run(projectId)
        db.prepare(`delete from questions where conversation_id in (${ON_APP})`).run(
          projectId,
        )
        db.prepare(`delete from runs where conversation_id in (${ON_APP})`).run(projectId)
        db.prepare(`delete from messages where conversation_id in (${ON_APP})`).run(
          projectId,
        )
        db.prepare(`delete from plans where conversation_id in (${ON_APP})`).run(
          projectId,
        )
        // F6b D5: the token ids, before the conversations they name.
        db.prepare('delete from minted where project_id = ?').run(projectId)
        db.prepare('delete from conversations where project_id = ?').run(projectId)
        db.prepare('delete from history where project_id = ?').run(projectId)
        // An email's happening starts with its project id (`<projectId>:<what>`, Task 5).
        db.prepare(
          'delete from emails where substr(happening, 1, length(?) + 1) = ? || ?',
        ).run(projectId, projectId, ':')
        db.prepare('delete from members where project_id = ?').run(projectId)
        db.prepare('delete from watch_tokens where project_id = ?').run(projectId)
        db.prepare('delete from apps where project_id = ?').run(projectId)
      })
    },
  }
}
