import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { migrate } from './migrate.js'
import { runStatements } from './runs.js'
import type {
  Conversation,
  ConversationState,
  Problem,
  Sender,
  Store,
} from './conversations.js'

export type {
  AskedQuestion,
  Conversation,
  ConversationState,
  Problem,
  Run,
  RunDetail,
  RunStatus,
  Store,
} from './conversations.js'

/**
 * `node:sqlite` BY `createRequire`, NOT `import` (F2 sitting 1, M4). Vitest 2.1.9 cannot
 * import it: `sqlite` exists only with the `node:` prefix, so its loader asks Vite for a file
 * called `sqlite`, statically, dynamically, and even with `server.deps.external`. Node runs
 * this line the same under tsx and under Vitest. Its ExperimentalWarning, one line per
 * process, is left alone: the flag that hides it hides every experimental warning (M4).
 */
const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite')

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

interface ConversationRow {
  id: string
  person_id: string
  project_id: string | null
  title: string
  state: ConversationState
  description: string
  created_at: string
  updated_at: string
  waiting_since: string | null
}

function conversationOf(row: ConversationRow): Conversation {
  return {
    id: row.id,
    personId: row.person_id,
    projectId: row.project_id,
    title: row.title,
    state: row.state,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** The store over one SQLite file (Decision 2), its schema applied, idempotently. */
export function openStore(file: string): Store {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('pragma journal_mode = wal')
  db.exec('pragma foreign_keys = on')
  db.exec('pragma busy_timeout = 5000')
  db.exec(SCHEMA)
  migrate(db, SCHEMA)

  const now = () => new Date().toISOString()
  const readConversation = db.prepare('select * from conversations where id = ?')

  function conversation(id: string): Conversation | undefined {
    const row = readConversation.get(id) as ConversationRow | undefined
    return row === undefined ? undefined : conversationOf(row)
  }

  return {
    ...runStatements(db, now),
    rememberPerson(person) {
      db.prepare(
        `insert into persons (id, display_name, seen_at) values (?, ?, ?)
         on conflict (id) do update set display_name = excluded.display_name, seen_at = excluded.seen_at`,
      ).run(person.id, person.displayName, now())
    },

    createConversation(personId, description) {
      const id = randomUUID()
      const at = now()
      db.prepare(
        `insert into conversations
           (id, person_id, project_id, title, state, description, created_at, updated_at)
         values (?, ?, null, 'First build', 'describing', ?, ?, ?)`,
      ).run(id, personId, description, at, at)
      return conversation(id)!
    },

    getConversation(id, personId) {
      const found = conversation(id)
      return found?.personId === personId ? found : undefined
    },

    setState(id, state, patch = {}) {
      const before = readConversation.get(id) as ConversationRow | undefined
      if (before === undefined) throw new Error(`no conversation ${id}`)
      const at = now()
      db.prepare(
        `update conversations set state = ?, project_id = ?, title = ?, updated_at = ?, waiting_since = ?
         where id = ?`,
      ).run(
        state,
        patch.projectId !== undefined ? patch.projectId : before.project_id,
        patch.title ?? before.title,
        at,
        state === 'waiting' ? (patch.waitingSince ?? before.waiting_since ?? at) : null,
        id,
      )
      return conversation(id)!
    },

    createChange(personId, projectId, title, description) {
      const id = randomUUID()
      const at = now()
      db.prepare(
        `insert into conversations
           (id, person_id, project_id, title, state, description, created_at, updated_at, waiting_since)
         values (?, ?, ?, ?, 'waiting', ?, ?, ?, ?)`,
      ).run(id, personId, projectId, title, description, at, at, at)
      return conversation(id)!
    },

    listConversationsOn(projectId, personId) {
      const rows = db
        .prepare(
          `select * from conversations where project_id = ? and person_id = ?
           order by created_at desc, rowid desc`,
        )
        .all(projectId, personId) as unknown as ConversationRow[]
      return rows.map(conversationOf)
    },

    conversationsOn(projectId) {
      const rows = db
        .prepare('select * from conversations where project_id = ? order by created_at')
        .all(projectId) as unknown as ConversationRow[]
      return rows.map(conversationOf)
    },

    waitingOn(projectId) {
      const rows = db
        .prepare(
          `select * from conversations where project_id = ? and state = 'waiting'
           order by waiting_since, rowid`,
        )
        .all(projectId) as unknown as ConversationRow[]
      return rows.map(conversationOf)
    },

    waitingProjects() {
      const rows = db
        .prepare(
          `select distinct project_id from conversations
           where state = 'waiting' and project_id is not null order by project_id`,
        )
        .all() as { project_id: string }[]
      return rows.map((row) => row.project_id)
    },

    conversationForInstance(projectId, instanceId, personId) {
      const row = db
        .prepare(
          `select conversations.id from runs join conversations on conversations.id = runs.conversation_id
           where conversations.project_id = ? and conversations.person_id = ?
             and json_extract(runs.detail, '$.instanceId') = ?
           order by runs.updated_at desc limit 1`,
        )
        .get(projectId, personId, instanceId) as { id: string } | undefined
      return row?.id
    },

    fixFor(projectId, incidentId, personId) {
      const row = db
        .prepare(
          `select conversations.id from messages join conversations on conversations.id = messages.conversation_id
           where conversations.project_id = ? and conversations.person_id = ?
             and conversations.state != 'set-aside'
             and json_extract(messages.body, '$.kind') = 'asked'
             and json_extract(messages.body, '$.fix.incidentId') = ?
           order by conversations.created_at desc, conversations.rowid desc limit 1`,
        )
        .get(projectId, personId, incidentId) as { id: string } | undefined
      return row?.id
    },

    changeForRefusal(projectId, approvalId, personId) {
      const row = db
        .prepare(
          `select conversations.id from messages join conversations on conversations.id = messages.conversation_id
           where conversations.project_id = ? and conversations.person_id = ?
             and conversations.state != 'set-aside'
             and json_extract(messages.body, '$.kind') = 'asked'
             and json_extract(messages.body, '$.refusal.approvalId') = ?
           order by conversations.created_at desc, conversations.rowid desc limit 1`,
        )
        .get(projectId, personId, approvalId) as { id: string } | undefined
      return row?.id
    },

    addMessage(conversationId, from, body) {
      db.prepare(
        `insert into messages (conversation_id, seq, sender, body, at)
         select ?, coalesce(max(seq), 0) + 1, ?, ?, ? from messages where conversation_id = ?`,
      ).run(conversationId, from, JSON.stringify(body), now(), conversationId)
    },

    listMessages(conversationId) {
      const rows = db
        .prepare(
          'select sender, body, at from messages where conversation_id = ? order by seq',
        )
        .all(conversationId) as { sender: Sender; body: string; at: string }[]
      return rows.map((row) => ({
        from: row.sender,
        body: JSON.parse(row.body),
        at: row.at,
      }))
    },

    savePlan(conversationId, plan) {
      const row = db
        .prepare(
          `insert into plans (conversation_id, version, body, at)
           select ?, coalesce(max(version), 0) + 1, ?, ? from plans where conversation_id = ?
           returning version`,
        )
        .get(conversationId, JSON.stringify(plan), now(), conversationId) as {
        version: number
      }
      return row.version
    },

    latestPlan(conversationId) {
      const row = db
        .prepare(
          'select version, body from plans where conversation_id = ? order by version desc limit 1',
        )
        .get(conversationId) as { version: number; body: string } | undefined
      return row === undefined
        ? undefined
        : { version: row.version, plan: JSON.parse(row.body) }
    },

    agreedPlanOn(projectId, personId, before) {
      const row = db
        .prepare(
          `select plans.body from messages
           join conversations on conversations.id = messages.conversation_id
           join plans on plans.conversation_id = messages.conversation_id
             and plans.version = json_extract(messages.body, '$.version')
           where conversations.project_id = ? and conversations.person_id = ?
             and json_extract(messages.body, '$.kind') = 'agreed'
             and (? is null or messages.at <= ?)
           order by messages.at desc, conversations.created_at desc, conversations.rowid desc,
             messages.seq desc
           limit 1`,
        )
        .get(projectId, personId, before ?? null, before ?? null) as
        { body: string } | undefined
      return row === undefined ? undefined : JSON.parse(row.body)
    },

    recordProblem(problem: Problem) {
      const { changes } = db
        .prepare(
          `insert into problems
           (reference, code, at, place, operation, status, person_id, conversation_id, platform_request_id)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (reference) do nothing`,
        )
        .run(
          problem.reference,
          problem.code,
          problem.at,
          problem.where,
          problem.operation,
          problem.status,
          problem.personId,
          problem.conversationId,
          problem.platformRequestId,
        )
      return changes === 1
    },

    close() {
      db.close()
    },
  }
}
