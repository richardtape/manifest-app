import { createTransport } from 'nodemailer'
import type { Store } from '../store/db.js'
import type { Outgoing } from '../store/keeping.js'

/**
 * F6 TASK 5: HOW AN EMAIL LEAVES, AND ONLY ONCE (D3, D5). `deliver` claims a row before it sends
 * (the `emails` table is unique on kind, happening and recipient), so a replay, a reconnect or a
 * restart sends nothing twice; a send that fails is tried again after 1, 2, 4… minutes for an
 * hour, then recorded as not sent. It never throws, so it never holds up the keeper.
 */
export interface Mailer {
  /** `to` is the recipient's address (an email key's `recipient`). */
  send(message: { to: string; subject: string; text: string }): Promise<void>
}

/** D5: nodemailer, over SMTP to `url` (Mailpit on the laptop: no authentication, no TLS). */
export function smtpMailer(url: string, from: string): Mailer {
  const transport = createTransport(url)
  return {
    async send(message) {
      await transport.sendMail({ ...message, from })
    },
  }
}

const MINUTE = 60_000
/** How long a failing email is tried for, before it is recorded as not sent. */
const TRYING_MS = 60 * MINUTE

const waitMs = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms).unref())

/** Sends one claimed email, and tries again until it goes or the hour is up. */
async function send(
  store: Pick<Store, 'emailDone'>,
  mailer: Mailer,
  outgoing: Outgoing,
  wait: (ms: number) => Promise<void>,
): Promise<void> {
  const message = {
    to: outgoing.key.recipient,
    subject: outgoing.subject,
    text: outgoing.text,
  }
  let waited = 0
  for (let tries = 1; ; tries++) {
    try {
      await mailer.send(message)
      return store.emailDone(outgoing.key, 'sent', tries)
    } catch {
      // Never logged: an address and its words are the person's.
    }
    if (waited >= TRYING_MS) return store.emailDone(outgoing.key, 'failed', tries)
    const next = Math.min(2 ** (tries - 1) * MINUTE, TRYING_MS - waited)
    await wait(next)
    waited += next
  }
}

/** Claims, sends, and tries again for an hour, then `failed`. Never throws. */
export async function deliver(
  store: Pick<Store, 'claimEmail' | 'emailDone'>,
  mailer: Mailer,
  outgoing: Outgoing,
  wait: (ms: number) => Promise<void> = waitMs,
): Promise<void> {
  try {
    if (!store.claimEmail(outgoing)) return
    await send(store, mailer, outgoing, wait)
  } catch {
    // The store is closing (a stop, a test's end): what was claimed is a restart's to finish.
  }
}

/** Review Focus 1: at boot, each email claimed and never finished is sent, words and all. */
export async function deliverUnfinished(
  store: Pick<Store, 'emailsUnfinished' | 'emailDone'>,
  mailer: Mailer,
  wait: (ms: number) => Promise<void> = waitMs,
): Promise<void> {
  try {
    await Promise.all(
      store.emailsUnfinished().map((outgoing) => send(store, mailer, outgoing, wait)),
    )
  } catch {
    // As deliver.
  }
}
