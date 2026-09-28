import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * FOR TESTS ONLY: nothing outside a test file imports this. It reads the database file
 * behind the store's back, so a check of "no credential anywhere" sees every row the store
 * wrote, including the ones no method of the store would ever answer.
 */
const { DatabaseSync } = createRequire(import.meta.url)(
  'node:sqlite',
) as typeof import('node:sqlite')

/** Every row of every table, as one string per table. */
export function dumpAll(file: string): Record<string, string> {
  const db = new DatabaseSync(file, { readOnly: true })
  try {
    const tables = db
      .prepare("select name from sqlite_master where type = 'table'")
      .all() as { name: string }[]
    return Object.fromEntries(
      tables.map(({ name }) => [
        name,
        JSON.stringify(db.prepare(`select * from "${name}"`).all()),
      ]),
    )
  } finally {
    db.close()
  }
}

/** A directory of its own, and a way to remove it. */
export function scratchDir(): { dir: string; remove: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-app-store-'))
  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) }
}
