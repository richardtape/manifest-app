import { describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { refusalWords, whoOf } from './model.js'

/** F6b TASK 6: PEOPLE's two pure rules (design §2). */
describe('whoOf: what they typed, as the platform names someone', () => {
  it.each([
    ['sam@ubc.ca', { email: 'sam@ubc.ca' }],
    ['  Sam.Helper@UBC.ca ', { email: 'Sam.Helper@UBC.ca' }],
    ['sam', { cwlLogin: 'sam' }],
    ['  shelper01  ', { cwlLogin: 'shelper01' }],
  ])('%j is %j: an @ makes it an email, anything else a CWL login', (typed, who) =>
    expect(whoOf(typed)).toEqual(who),
  )
})

describe('refusalWords: the four the design words (§2), and nothing else', () => {
  it.each([
    'MEMBER_USER_NOT_FOUND',
    'MEMBER_USER_AMBIGUOUS',
    'MEMBER_MAY_NOT_BUILD',
    'PROJECT_LAST_OWNER',
  ])('%s has its own words, with no machinery in them', (code) => {
    const said = refusalWords(code)
    expect(said).toBe(words.people.refused[code as keyof typeof words.people.refused])
    expect(machineryIn(said ?? '')).toEqual([])
  })

  it.each(['FORBIDDEN', 'PROJECT_ARCHIVED', 'REQUEST_INVALID', 'SOMETHING_NEW'])(
    '%s is none of them: the page says its general words',
    (code) => expect(refusalWords(code)).toBeNull(),
  )
})
