import type { DatabaseSync } from 'node:sqlite'
import { CREDENTIAL } from './runs.js'

/**
 * F6b D5: THE IDS OF THE TOKENS OUR PAGE MINTS, over the store's one database (`db.ts`), as
 * `keeping.ts` keeps F6's. Never a secret: the page hands the id over beside a conversation's
 * secret, or alone for an agent of their own. *Agents* tells ours from theirs by them (D5), and an
 * agent's says who made it (FE-49).
 */
export interface Minted {
  /** The platform's id, never secret. */
  tokenId: string
  projectId: string
  /** Our person id: who minted it. */
  personId: string
  purpose: 'conversation' | 'privacy' | 'agent'
  /** A conversation's token: that conversation. */
  conversationId: string | null
  /** The token's own name, as minted: an agent's; ours are named by their conversation. */
  name: string | null
  /** When it stops working, when the page said: an agent's. */
  expiresAt: string | null
  mintedAt: string
}

export interface MintedStatements {
  /** Idempotent on the token id: the first kept stands. Anything shaped like a credential is refused. */
  keepMinted(row: Minted): void
  /** An app's, oldest first. */
  mintedOn(projectId: string): Minted[]
  /** One person's on one app (F6b Decision 5: taken off it). */
  forgetMintedOf(projectId: string, personId: string): void
}

interface MintedRow {
  token_id: string
  project_id: string
  person_id: string
  purpose: Minted['purpose']
  conversation_id: string | null
  name: string | null
  expires_at: string | null
  minted_at: string
}

const mintedOf = (row: MintedRow): Minted => ({
  tokenId: row.token_id,
  projectId: row.project_id,
  personId: row.person_id,
  purpose: row.purpose,
  conversationId: row.conversation_id,
  name: row.name,
  expiresAt: row.expires_at,
  mintedAt: row.minted_at,
})

export function mintedStatements(db: DatabaseSync): MintedStatements {
  return {
    keepMinted(row) {
      if (CREDENTIAL.test(JSON.stringify(row)))
        throw new Error('a kept token id may never carry a credential')
      db.prepare(
        `insert into minted (token_id, project_id, person_id, purpose, conversation_id, name,
                             expires_at, minted_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict (token_id) do nothing`,
      ).run(
        row.tokenId,
        row.projectId,
        row.personId,
        row.purpose,
        row.conversationId,
        row.name,
        row.expiresAt,
        row.mintedAt,
      )
    },

    mintedOn(projectId) {
      const rows = db
        .prepare('select * from minted where project_id = ? order by minted_at, rowid')
        .all(projectId) as unknown as MintedRow[]
      return rows.map(mintedOf)
    },

    forgetMintedOf(projectId, personId) {
      db.prepare('delete from minted where project_id = ? and person_id = ?').run(
        projectId,
        personId,
      )
    },
  }
}
