import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { scratchDir } from '../store/testing.js'
import { KEY_BYTES, keyFrom, seal, unseal } from './seal.js'

/**
 * D2 (RICH): THE WATCH TOKEN IS KEPT ON DISK, SEALED. The one credential our server keeps at
 * rest, so the seal is proved on its own: a round trip, and every way a sealed value can fail
 * to open answers *no token*, never a crash and never the ciphertext.
 */
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function dir(): string {
  const { dir, remove } = scratchDir()
  cleanups.push(remove)
  return dir
}

const KEY = randomBytes(KEY_BYTES)
const SECRET = 'mft_9d1c2f0e7b6a5d4c3b2a1f0e9d8c7b6a'

describe('seal and unseal (Decision 4)', () => {
  it('a round trip gives the secret back, and the sealed value names its version and holds no secret', () => {
    const sealed = seal(KEY, SECRET)
    expect(sealed).toMatch(/^v1\.[A-Za-z0-9_-]+$/)
    expect(sealed).not.toContain('mft_')
    expect(unseal(KEY, sealed)).toBe(SECRET)
  })

  it('two seals of one secret differ (a nonce of its own each time)', () => {
    expect(seal(KEY, SECRET)).not.toBe(seal(KEY, SECRET))
  })

  it('another key, a flipped byte anywhere, another version or nothing: no token, and nothing thrown', () => {
    const sealed = seal(KEY, SECRET)
    expect(unseal(randomBytes(KEY_BYTES), sealed)).toBeUndefined()
    const bytes = Buffer.from(sealed.slice(3), 'base64url')
    // The nonce, the ciphertext and the tag, each in turn.
    for (const at of [0, 12, bytes.length - 1]) {
      const flipped = Buffer.from(bytes)
      flipped[at] = flipped[at]! ^ 0x01
      expect(unseal(KEY, `v1.${flipped.toString('base64url')}`)).toBeUndefined()
    }
    expect(unseal(KEY, `v2.${sealed.slice(3)}`)).toBeUndefined()
    expect(unseal(KEY, '')).toBeUndefined()
    expect(unseal(KEY, 'v1.')).toBeUndefined()
    expect(unseal(KEY, 'v1.!!!')).toBeUndefined()
  })
})

describe('keyFrom: the key (Decision 4)', () => {
  it('takes MANIFEST_APP_KEEPING_KEY when it is set, and never writes the file', () => {
    const file = join(dir(), '.keys', 'keeping.key')
    const given = randomBytes(KEY_BYTES)
    const key = keyFrom({ MANIFEST_APP_KEEPING_KEY: given.toString('base64') }, file)
    expect(key.equals(given)).toBe(true)
    expect(() => statSync(file)).toThrow()
  })

  it('refuses a key of the wrong length, and its error never carries the key', () => {
    const file = join(dir(), '.keys', 'keeping.key')
    const short = randomBytes(31).toString('base64')
    let thrown: unknown
    try {
      keyFrom({ MANIFEST_APP_KEEPING_KEY: short }, file)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect(String((thrown as Error).message)).not.toContain(short)
  })

  it('without it, makes the file once, 0600 in a 0700 directory, and reads the same key back', () => {
    const keys = join(dir(), '.keys')
    const file = join(keys, 'keeping.key')
    const first = keyFrom({}, file)
    expect(first).toHaveLength(KEY_BYTES)
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(statSync(keys).mode & 0o777).toBe(0o700)
    const written = readFileSync(file, 'utf8')
    const second = keyFrom({}, file)
    expect(second.equals(first)).toBe(true)
    expect(readFileSync(file, 'utf8')).toBe(written)
    // What it seals, the next start opens.
    expect(unseal(second, seal(first, SECRET))).toBe(SECRET)
  })

  it('an empty variable is no variable: the file', () => {
    const file = join(dir(), '.keys', 'keeping.key')
    const key = keyFrom({ MANIFEST_APP_KEEPING_KEY: '' }, file)
    expect(key.equals(keyFrom({}, file))).toBe(true)
  })

  it('refuses a key file of the wrong length rather than sealing with it', () => {
    const keys = join(dir(), '.keys')
    mkdirSync(keys, { mode: 0o700 })
    const file = join(keys, 'keeping.key')
    writeFileSync(file, randomBytes(16).toString('base64'), { mode: 0o600 })
    expect(() => keyFrom({}, file)).toThrow()
  })
})
