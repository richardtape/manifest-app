import { describe, expect, it } from 'vitest'
import { ModelError } from '../model/client.js'
import { scripted } from '../model/scripted.js'
import { NAMING_PROMPT, slugOf, suggestNames } from './naming.js'

/**
 * NAMES PEOPLE READ (F4 Task 4; Rich, F3's sitting 7). The real intake model offered addresses as
 * names in every walk (`reading-responses`, `Course-questions`…). So the model writes names only,
 * and our code makes each address from its name; a name that reads like an address is refused,
 * and the model asked again.
 */
const refusedWith = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ModelError)
  return (error as ModelError).code
}
const named = (...names: string[]) => ({ names: names.map((name) => ({ name })) })

describe('slugOf: the address a name makes, ours', () => {
  it.each([
    ['Reading responses', 'reading-responses'],
    ['Week 3: responses!', 'week-3-responses'],
    ['Q&A for the course', 'q-a-for-the-course'],
    ['  Seminar   reading log  ', 'seminar-reading-log'],
    ['Café notes', 'cafe-notes'],
  ])('%s is %s', (name, slug) => {
    expect(slugOf(name)).toBe(slug)
  })

  it('is null for a name with no letter first, or too short to be an address', () => {
    expect(slugOf('3 things to read')).toBeNull()
    expect(slugOf('!!!')).toBeNull()
    expect(slugOf('Go')).toBeNull()
  })

  it('trims a long one to 39 characters at a hyphen, never mid-word', () => {
    const slug = slugOf(
      'Responses to the weekly readings for the seminar in modern poetry',
    )
    expect(slug).toBe('responses-to-the-weekly-readings-for')
    expect(slug!.length).toBeLessThanOrEqual(39)
    expect(slug).toMatch(/^[a-z][a-z0-9-]{2,38}$/)
    expect(slug).not.toMatch(/-$/)
  })
})

describe('suggestNames: names only, each address ours', () => {
  it('the model writes names; the page is given each with the address we made', async () => {
    const model = scripted({
      naming: [named('Reading responses', 'Weekly responses', 'Seminar reading log')],
    })
    expect(await suggestNames(model, 'A page for responses.', [])).toEqual({
      names: [
        { name: 'Reading responses', slug: 'reading-responses' },
        { name: 'Weekly responses', slug: 'weekly-responses' },
        { name: 'Seminar reading log', slug: 'seminar-reading-log' },
      ],
    })
  })

  it('a slug the model sends anyway is never taken: the address is made from the name', async () => {
    const model = scripted({
      naming: [
        {
          names: [
            { name: 'Reading responses', slug: 'something-else' },
            { name: 'Weekly responses', slug: 'x' },
            { name: 'Seminar reading log', slug: 'y' },
          ],
        },
      ],
    })
    const { names } = await suggestNames(model, 'A page for responses.', [])
    expect(names.map((n) => n.slug)).toEqual([
      'reading-responses',
      'weekly-responses',
      'seminar-reading-log',
    ])
  })

  it('its prompt asks for words people read, never an address', () => {
    expect(NAMING_PROMPT).toContain(
      "A name is words people read, with spaces: 'Reading responses'. Never write an address: we make it.",
    )
  })

  it.each([
    'reading-responses',
    'Course-questions',
    'class-responses',
    'Reading-responses',
    'student-q-and-a',
  ])(
    // The names returned are the second answer's: the first was refused.
    'refuses %s, which reads like an address, asks again, and takes the names that read',
    async (address) => {
      const model = scripted({
        naming: [
          named(address, 'Weekly responses', 'Seminar reading log'),
          named(
            'Reading responses',
            'Q&A for the course',
            'Sign-up sheet for office hours',
          ),
        ],
      })
      const { names } = await suggestNames(model, 'A page for responses.', [])
      expect(names.map((n) => n.name)).toEqual([
        'Reading responses',
        'Q&A for the course',
        'Sign-up sheet for office hours',
      ])
    },
  )

  it.each([
    [
      'two names that make one address',
      named('Reading responses', 'Reading responses!', 'Seminar reading log'),
    ],
    [
      'a name that makes no address',
      named('Reading responses', '3 things', 'Seminar log'),
    ],
    ['a taken address', named('Reading log', 'Weekly responses', 'Seminar reading log')],
  ])('refuses %s, twice, as MODEL_ANSWER_INVALID', async (_, bad) => {
    const model = scripted({ naming: [bad, bad] })
    expect(await refusedWith(suggestNames(model, 'x', ['reading-log']))).toBe(
      'MODEL_ANSWER_INVALID',
    )
  })
})
