/**
 * DECISION 9: THE WORDS A FACULTY MEMBER IS NEVER SHOWN (C3; manifest's 10-language.md has
 * the table). Checked as whole words, case-insensitively, over a screen's text with its
 * hostnames (mono) removed: hostnames are allowed, and they are not words.
 */
export const MACHINERY = [
  'provisioning',
  'healthy',
  'container',
  'yaml',
  'digest',
  'sha256',
  'exit code',
  'port',
  'instance',
  'environment',
  'sandbox',
  'staging',
  'production',
] as const

/** The machinery words `text` contains. */
export function machineryIn(text: string): string[] {
  return MACHINERY.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text))
}
