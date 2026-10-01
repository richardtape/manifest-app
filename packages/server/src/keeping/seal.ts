import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * D2 (RICH): THE WATCH TOKEN IS KEPT ON DISK, SEALED, the one credential our server keeps at
 * rest (F2's Decision 1 amended for it alone). AES-256-GCM with Node's own `crypto`: a random
 * 12-byte nonce each time, the ciphertext and its 16-byte tag, written
 * `v1.<base64url(nonce ‖ ciphertext ‖ tag)>` (Decision 4).
 *
 * The key is never in `.data/`, never logged, never in a row: a copy of the database carries no
 * usable token. A key that cannot open a row makes it *no token*, and the next visit mints.
 */
export const KEY_BYTES = 32
const NONCE_BYTES = 12
const TAG_BYTES = 16
const VERSION = 'v1.'

function keyOf(base64: string, from: string): Buffer {
  const key = Buffer.from(base64.trim(), 'base64')
  // Never the value in the message: it is the key.
  if (key.length !== KEY_BYTES)
    throw new Error(`${from} must hold ${KEY_BYTES} bytes in base64`)
  return key
}

/**
 * `MANIFEST_APP_KEEPING_KEY` (base64, 32 bytes) in production; else the file, made at the first
 * start, mode 0600 in a 0700 directory, and read back at every start after. Base64 in the file
 * too, so it can be moved into the variable as it is.
 */
export function keyFrom(env: NodeJS.ProcessEnv, file: string): Buffer {
  const given = env['MANIFEST_APP_KEEPING_KEY']
  if (given !== undefined && given !== '') return keyOf(given, 'MANIFEST_APP_KEEPING_KEY')
  try {
    return keyOf(readFileSync(file, 'utf8'), 'the keeping key file')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const directory = dirname(file)
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  chmodSync(directory, 0o700)
  const key = randomBytes(KEY_BYTES)
  try {
    // `wx`: a second process starting at the same moment reads the first one's key.
    writeFileSync(file, key.toString('base64'), { mode: 0o600, flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    return keyOf(readFileSync(file, 'utf8'), 'the keeping key file')
  }
  chmodSync(file, 0o600)
  return key
}

export function seal(key: Buffer, secret: string): string {
  const nonce = randomBytes(NONCE_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return (
    VERSION +
    Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]).toString('base64url')
  )
}

/** `undefined` for another key, a value tampered with, or one that is not `v1`: never a throw. */
export function unseal(key: Buffer, sealed: string): string | undefined {
  if (!sealed.startsWith(VERSION)) return undefined
  const bytes = Buffer.from(sealed.slice(VERSION.length), 'base64url')
  if (bytes.length < NONCE_BYTES + TAG_BYTES) return undefined
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, NONCE_BYTES))
    decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES))
    return Buffer.concat([
      decipher.update(bytes.subarray(NONCE_BYTES, bytes.length - TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return undefined
  }
}
