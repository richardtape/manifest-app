import { describe, expect, it } from 'vitest'
import { addressOf, needAnotherRound, offerable, slugFor, type Offer } from './model.js'

/** MOMENT 4, PURE: an address from a name, and which suggestions may be offered. */
describe('slugFor', () => {
  it.each([
    ['Reading responses', 'reading-responses'],
    ['Week 3 — Reading!', 'week-3-reading'],
    ['  Seminar   reading log  ', 'seminar-reading-log'],
    ['Café crème', 'cafe-creme'],
    ['3D models', 'app-3d-models'],
    ['Qz', 'app-qz'],
    ['!!!', 'app'],
  ])('%j is %j', (name, slug) => expect(slugFor(name)).toBe(slug))

  it('starts with a letter, and is never longer than 39 characters, nor ends in a hyphen', () => {
    for (const name of [
      'a'.repeat(80),
      `${'word '.repeat(20)}`,
      `1${'x'.repeat(50)}`,
      'abc-'.repeat(12),
    ]) {
      const slug = slugFor(name)
      expect(slug).toMatch(/^[a-z][a-z0-9-]{2,38}$/)
      expect(slug.endsWith('-')).toBe(false)
    }
  })
})

describe('offerable and needAnotherRound (Review Focus 3)', () => {
  const free = (slug: string): Offer => ({ name: slug, slug, available: true })
  const taken = (slug: string): Offer => ({
    name: slug,
    slug,
    available: false,
    reasons: [{ code: 'SLUG_TAKEN', message: 'a project already has this name' }],
  })

  it('offers the available ones only, in order', () => {
    expect(offerable([free('a1'), taken('b1'), free('c1')]).map((o) => o.slug)).toEqual([
      'a1',
      'c1',
    ])
  })

  it.each([
    [[free('a1'), free('b1'), taken('c1')], false],
    [[free('a1'), taken('b1'), taken('c1')], true],
    [[taken('a1'), taken('b1'), taken('c1')], true],
    [[], true],
  ])('%# needs another round: %s', (offers, needs) =>
    expect(needAnotherRound(offers)).toBe(needs),
  )
})

describe('addressOf', () => {
  it('is the address a person will be given, in the laptop’s zone', () => {
    expect(addressOf('reading-responses')).toBe('reading-responses.manifest.internal')
  })
})
