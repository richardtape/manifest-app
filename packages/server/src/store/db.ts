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
  Conversation,
  ConversationState,
  Problem,
  Run,
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
      const before = conversation(id)
      if (before === undefined) throw new Error(`no conversation ${id}`)
      db.prepare(
        'update conversations set state = ?, project_id = ?, title = ?, updated_at = ? where id = ?',
      ).run(
        state,
        patch.projectId !== undefined ? patch.projectId : before.projectId,
        patch.title ?? before.title,
        now(),
        id,
      )
      return conversation(id)!
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
