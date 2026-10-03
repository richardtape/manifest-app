import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import { kindWords, SENSITIVE_WORDS } from './kind.js'

/**
 * F6b TASK 8: THE KIND OF CHANGE, IN WORDS (design §1; Decision 8). Nothing sensitive goes straight to
 * the students once tried; anything else needs a Manifest administrator's look, the fields said in
 * our words, an unknown one generically and never by its name (Global Constraints).
 */
const LOOK =
  "This change needs a Manifest administrator's look before it reaches your students, because it changes"

describe('kindWords', () => {
  it('says nothing sensitive goes straight to the students, once tried', () => {
    expect(kindWords([])).toBe(
      "Once you've tried it, this can go straight to your students.",
    )
  })

  it('names one field in our words', () => {
    expect(kindWords(['egress.allow'])).toBe(`${LOOK} what it can reach.`)
  })

  it('names two, joined by "and", in the order given', () => {
    expect(kindWords(['services', 'egress.allow'])).toBe(
      `${LOOK} what it keeps and what it can reach.`,
    )
  })

  it('names all seven', () => {
    expect(
      kindWords([
        'services',
        'auth.attributes',
        'egress.allow',
        'resources',
        'data.classification',
        'ai.models',
        'blueprint',
      ]),
    ).toBe(
      `${LOOK} what it keeps, who it learns about, what it can reach, how much room it gets, how sensitive its data is, which AI it asks and what it's built on.`,
    )
  })

  it('says a field it does not know generically, once, and never by its name', () => {
    expect(kindWords(['quotas'])).toBe(`${LOOK} something reviewed at launch.`)
    const two = kindWords(['services', 'quotas', 'jobs.schedule'])
    expect(two).toBe(`${LOOK} what it keeps and something reviewed at launch.`)
    expect(two).not.toMatch(/quotas|jobs/)
  })

  it('shows no machinery, whatever the fields (every combination of the seven and an unknown)', () => {
    const fields = [...Object.keys(SENSITIVE_WORDS), 'resources.gpu']
    expect(fields).toHaveLength(8)
    for (let mask = 0; mask < 2 ** fields.length; mask++) {
      const some = fields.filter((_, i) => (mask >> i) & 1)
      const said = kindWords(some)
      expect(machineryIn(said), said).toEqual([])
      expect(said, said).not.toMatch(/\b[a-z]+\.[a-z]+\b|_/)
    }
  })
})
