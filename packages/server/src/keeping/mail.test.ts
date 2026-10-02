import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { openStore, type Store } from '../store/db.js'
import type { EmailKey, Outgoing } from '../store/keeping.js'
import { deliver, deliverUnfinished, smtpMailer, type Mailer } from './mail.js'

/**
 * F6 TASK 5: EACH EMAIL ONCE (D3, Review Focus 1), and how it leaves (D5: nodemailer over SMTP).
 * `deliver` claims a row before it sends, so a replay, a reconnect or a restart sends nothing
 * twice; a send that fails is tried again at 1, 2, 4… minutes for an hour, then recorded as not
 * sent; it never throws, so it never holds up the keeper.
 */
const P = '11111111-1111-4111-8111-111111111111'
const MINUTE = 60_000
const outgoing = (happening = `${P}:e1`, recipient = 'alice@ubc.ca'): Outgoing => ({
  key: { kind: 'over', happening, recipient },
  subject: 'Reading responses: signed off',
  text: 'A Manifest administrator signed it off.',
})

const stores: Store[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

/** The real store, in memory, with each `emailDone` recorded. */
function setUp() {
  const store = openStore(':memory:')
  stores.push(store)
  const done: [EmailKey, string, number][] = []
  const emailDone = store.emailDone.bind(store)
  store.emailDone = (key, state, tries) => {
    done.push([key, state, tries])
    emailDone(key, state, tries)
  }
  return { store, done }
}

/** A mailer that fails its first `failures` sends, and records every one. */
function fakeMailer(failures = 0) {
  const sent: { to: string; subject: string; text: string }[] = []
  let tries = 0
  const mailer: Mailer = {
    async send(message) {
      tries++
      if (tries <= failures) throw new Error('connection refused')
      sent.push(message)
    },
  }
  return { mailer, sent, tries: () => tries }
}

/** Waits that pass at once, each recorded. */
function fakeWait() {
  const waits: number[] = []
  return { waits, wait: async (ms: number) => void waits.push(ms) }
}

describe('deliver: claimed, sent, and tried again', () => {
  it('sends once to the recipient, and a second deliver of the same key sends nothing', async () => {
    const { store, done } = setUp()
    const m = fakeMailer()
    await deliver(store, m.mailer, outgoing())
    await deliver(store, m.mailer, outgoing())
    expect(m.sent).toEqual([
      {
        to: 'alice@ubc.ca',
        subject: 'Reading responses: signed off',
        text: 'A Manifest administrator signed it off.',
      },
    ])
    expect(done).toEqual([[outgoing().key, 'sent', 1]])
    expect(store.emailsUnfinished()).toEqual([])
  })

  it('another recipient of the same happening is their own email', async () => {
    const { store } = setUp()
    const m = fakeMailer()
    await deliver(store, m.mailer, outgoing())
    await deliver(store, m.mailer, outgoing(`${P}:e1`, 'carol@ubc.ca'))
    expect(m.sent.map((one) => one.to)).toEqual(['alice@ubc.ca', 'carol@ubc.ca'])
  })

  it('a send that fails twice and then works is sent, tries 3, after 1 and 2 minutes', async () => {
    const { store, done } = setUp()
    const m = fakeMailer(2)
    const w = fakeWait()
    await deliver(store, m.mailer, outgoing(), w.wait)
    expect(w.waits).toEqual([MINUTE, 2 * MINUTE])
    expect(done).toEqual([[outgoing().key, 'sent', 3]])
    expect(m.sent).toHaveLength(1)
  })

  it('one that never works is tried for an hour, then recorded as not sent', async () => {
    const { store, done } = setUp()
    const m = fakeMailer(Infinity)
    const w = fakeWait()
    await deliver(store, m.mailer, outgoing(), w.wait)
    expect(w.waits).toEqual([1, 2, 4, 8, 16, 29].map((n) => n * MINUTE))
    expect(w.waits.reduce((a, b) => a + b)).toBe(60 * MINUTE)
    expect(done).toEqual([[outgoing().key, 'failed', 7]])
    expect(store.emailsUnfinished()).toEqual([])
  })

  it('never throws: a store that refuses is swallowed, and nothing is sent', async () => {
    const { store } = setUp()
    const m = fakeMailer()
    store.claimEmail = () => {
      throw new Error('database is not open')
    }
    await expect(deliver(store, m.mailer, outgoing())).resolves.toBeUndefined()
    expect(m.sent).toEqual([])
  })
})

describe('deliverUnfinished: a restart finishes what was claimed (Review Focus 1)', () => {
  it('each email claimed and never finished is sent, words and all, and never twice', async () => {
    const { store, done } = setUp()
    store.claimEmail(outgoing())
    store.claimEmail(outgoing(`${P}:e2`))
    store.emailDone(outgoing(`${P}:e2`).key, 'sent', 1)
    done.length = 0
    const m = fakeMailer()
    await deliverUnfinished(store, m.mailer)
    await deliverUnfinished(store, m.mailer)
    await deliver(store, m.mailer, outgoing())
    expect(m.sent).toEqual([
      {
        to: 'alice@ubc.ca',
        subject: 'Reading responses: signed off',
        text: 'A Manifest administrator signed it off.',
      },
    ])
    expect(done).toEqual([[outgoing().key, 'sent', 1]])
  })
})

/**
 * A ONE-CONNECTION SMTP LISTENER, as Mailpit answers (no authentication, no TLS): it records
 * every command, and the message between DATA and its dot.
 */
async function smtpListener() {
  const commands: string[] = []
  let data = ''
  const sockets: Socket[] = []
  const server: Server = createServer((socket) => {
    sockets.push(socket)
    let buffer = ''
    let inData = false
    socket.write('220 test ESMTP\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n')
          if (end === -1) return
          data = buffer.slice(0, end)
          buffer = buffer.slice(end + 5)
          inData = false
          socket.write('250 2.0.0 queued\r\n')
          continue
        }
        const line = buffer.indexOf('\r\n')
        if (line === -1) return
        const command = buffer.slice(0, line)
        buffer = buffer.slice(line + 2)
        commands.push(command)
        const verb = command.slice(0, 4).toUpperCase()
        if (verb === 'EHLO') socket.write('250-test\r\n250 8BITMIME\r\n')
        else if (verb === 'DATA') {
          inData = true
          socket.write('354 go ahead\r\n')
        } else if (verb === 'QUIT') socket.end('221 bye\r\n')
        else socket.write('250 ok\r\n')
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  return {
    url: `smtp://127.0.0.1:${port}`,
    commands,
    data: () => data,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resolve())
      }),
  }
}

describe('smtpMailer: nodemailer, over SMTP (D5)', () => {
  it('sends from us, to them, with the subject and the words; no authentication to a URL without any', async () => {
    const listener = await smtpListener()
    try {
      const mailer = smtpMailer(listener.url, 'Manifest <manifest@app.manifest.internal>')
      await mailer.send({
        to: 'alice@ubc.ca',
        subject: 'Reading responses: signed off',
        text: 'A Manifest administrator signed it off.',
      })
      expect(listener.commands).toContain('MAIL FROM:<manifest@app.manifest.internal>')
      expect(listener.commands).toContain('RCPT TO:<alice@ubc.ca>')
      expect(listener.commands.some((command) => /^AUTH/i.test(command))).toBe(false)
      expect(listener.data()).toContain('Subject: Reading responses: signed off')
      expect(listener.data()).toContain('A Manifest administrator signed it off.')
    } finally {
      await listener.close()
    }
  })

  it('a refused connection rejects, for deliver to try again', async () => {
    const listener = await smtpListener()
    const url = listener.url
    await listener.close()
    const mailer = smtpMailer(url, 'Manifest <manifest@app.manifest.internal>')
    await expect(
      mailer.send({ to: 'alice@ubc.ca', subject: 's', text: 't' }),
    ).rejects.toThrow()
  })
})
