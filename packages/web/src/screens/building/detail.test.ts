import { describe, expect, it } from 'vitest'
import { machineryIn } from '../machinery.js'
import { detailWords, leaveOutWords } from './detail.js'

/**
 * F6b TASK 9: A NEW DETAIL ABOUT THE PEOPLE WHO SIGN IN, IN WORDS (Decision 9; Words proposed, S1:
 * M1: only four can reach a build, the platform refusing the rest at the commit). An unknown one,
 * or none we could read, is said generically, never by its name.
 */
const GENERIC = 'a new detail about the people who sign in'

describe('detailWords', () => {
  it.each([
    [['sn'], 'their last name'],
    [['givenName'], 'their first name'],
    [['mail'], 'their email'],
    [['eduPersonAffiliation'], "whether they're a student or staff"],
    [['givenName', 'sn'], 'their first name and their last name'],
    [['mail', 'givenName', 'sn'], 'their email, their first name and their last name'],
  ])('%j is "%s"', (details, said) => {
    expect(detailWords(details)).toBe(said)
  })

  it('says one it does not know, or none read, generically and never by its name', () => {
    expect(detailWords(['uid'])).toBe(GENERIC)
    expect(detailWords([])).toBe(GENERIC)
    expect(detailWords(['sn', 'ubcEduStudentNumber', 'uid'])).toBe(
      `their last name and ${GENERIC}`,
    )
    expect(detailWords(['ubcEduStudentNumber'])).not.toMatch(/ubcEdu/)
  })

  it('shows no machinery', () => {
    for (const details of [
      ['sn'],
      ['givenName', 'sn', 'mail', 'eduPersonAffiliation'],
      ['x.y'],
      [],
    ])
      expect(machineryIn(detailWords(details))).toEqual([])
  })
})

describe('leaveOutWords: [Leave it out]’s change, its first words (Decision 10)', () => {
  it('names the detail and the change it leaves it out of, and why', () => {
    expect(leaveOutWords(['sn'], 'Greet people by name')).toBe(
      "Leave their last name out of ‘Greet people by name’: UBC's identity team hasn't agreed to share it.",
    )
  })

  it('none read: the new detail, generically', () => {
    expect(leaveOutWords([], 'Greet people by name')).toBe(
      "Leave the new detail about the people who sign in out of ‘Greet people by name’: UBC's identity team hasn't agreed to share it.",
    )
  })
})
