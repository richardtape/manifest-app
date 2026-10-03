import type { DatabaseSync } from 'node:sqlite'

/**
 * THE FILE'S VERSION (`pragma user_version`), and how an older one is brought up to it.
 *
 * - 0: F2 never set one, so every file it left is at 0. Its schema counts as version 1.
 * - 2: F3 Decision 12. `conversations` gains `building` and `built`. SQLite cannot alter a
 *   `check`, so the table is rebuilt.
 * - 3: F3 Task 8. `runs` gains `detail`, the round's own facts; `questions` is a new table,
 *   which `schema.sql` makes.
 * - 4: F4 Decision 14. `conversations` gains `waiting` and `set-aside`, and `waiting_since`, its
 *   place in the app's line. Rebuilt again, as for 2: one rebuild brings 0, 2 or 3 up to it.
 * - 5: F6 Decision 3. `persons` gains `email`, `here_at` and `last_here`; `apps`, `members`,
 *   `watch_tokens`, `history` and `emails` are new tables, which `schema.sql` makes.
 * - 6: F6b D5. `minted`, the ids of the tokens our page mints, is a new table, which
 *   `schema.sql` makes.
 * - 7: F6b sitting 5 (the review's I2). `watched`, the id of every watch token we were handed, is a
 *   new table, which `schema.sql` makes: the current one is still `watch_tokens`'.
 * - 8: the adoption note's question 10 (`EventFrame.actor`). `history` gains `actor`, who acted, as
 *   the platform sent it; an event kept before names nobody.
 *
 * `schema.sql` runs first, and makes a new file's tables as they are now. Only an existing
 * table keeps the definition it was made with, which is what this corrects.
 */
export const VERSION = 8

/**
 * The one definition of `conversations`, read out of `schema.sql` itself, so the rebuild can
 * never disagree with it.
 */
function conversationsColumns(schema: string): string {
  const found = /create table if not exists conversations \(([\s\S]*?)\n\);/.exec(schema)
  if (found?.[1] === undefined)
    throw new Error('schema.sql defines no conversations table')
  return found[1]
}

/** The columns every version has: a later one's (`waiting_since`) starts null. */
const COLUMNS =
  'id, person_id, project_id, title, state, description, created_at, updated_at'

export function migrate(db: DatabaseSync, schema: string): void {
  const { user_version: version } = db.prepare('pragma user_version').get() as {
    user_version: number
  }
  if (version < 4) rebuildConversations(db, schema)
  if (version < 3) {
    // A new file's runs already have it (schema.sql); sitting 2's do not.
    const columns = db.prepare('pragma table_info(runs)').all() as { name: string }[]
    if (!columns.some((column) => column.name === 'detail'))
      db.exec('alter table runs add column detail text')
  }
  if (version < 5) {
    // A new file's persons already have them (schema.sql); F5's do not.
    const columns = db.prepare('pragma table_info(persons)').all() as { name: string }[]
    for (const column of ['email', 'here_at', 'last_here'])
      if (!columns.some((has) => has.name === column))
        db.exec(`alter table persons add column ${column} text`)
  }
  if (version < 8) {
    // A new file's history already has it (schema.sql); version 7's does not.
    const columns = db.prepare('pragma table_info(history)').all() as { name: string }[]
    if (!columns.some((column) => column.name === 'actor'))
      db.exec('alter table history add column actor text')
  }
  if (version < VERSION) db.exec(`pragma user_version = ${VERSION}`)
}

function rebuildConversations(db: DatabaseSync, schema: string): void {
  // SQLITE'S OWN TWELVE STEPS (its "Making Other Kinds Of Table Schema Changes"). Foreign keys
  // off, OUTSIDE the transaction, where the pragma is a no-op: `messages`, `plans` and `runs`
  // reference `conversations`, and name it, so they reach the new table once it is renamed.
  db.exec('pragma foreign_keys = off')
  try {
    db.exec('begin')
    try {
      db.exec(`create table conversations_next (${conversationsColumns(schema)}\n)`)
      db.exec(
        `insert into conversations_next (${COLUMNS}) select ${COLUMNS} from conversations`,
      )
      db.exec('drop table conversations')
      db.exec('alter table conversations_next rename to conversations')
      db.exec(
        'create index if not exists conversations_by_person on conversations (person_id)',
      )
      db.exec(
        'create index if not exists conversations_by_project on conversations (project_id, state)',
      )
      const broken = db.prepare('pragma foreign_key_check').all()
      if (broken.length > 0)
        throw new Error('the rebuilt conversations broke a reference')
      db.exec('commit')
    } catch (error) {
      db.exec('rollback')
      throw error
    }
  } finally {
    db.exec('pragma foreign_keys = on')
  }
}
