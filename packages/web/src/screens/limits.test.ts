import { LIMITS as OURS } from '@manifest-app/server/progress'
import { describe, expect, it } from 'vitest'
import { words } from '../words.js'
import { countOf, LIMITS } from './limits.js'

/**
 * HOW MUCH WE READ AT ONCE, SAID BEFORE IT IS SENT (F2's deferred Minor, Rich: say the
 * limits). Past a limit our server refuses, which the page once said as "Something went
 * wrong". The page never imports the server's source, so it keeps a copy, held equal here.
 */
describe('the limits', () => {
  it('are our server’s, exactly', () => {
    expect(LIMITS).toEqual(OURS)
  })

  it('say nothing until the words come near one: a quiet count from nine tenths', () => {
    expect(countOf('x'.repeat(449), 500)).toBeUndefined()
    expect(countOf('x'.repeat(450), 500)).toEqual({
      text: words.limits.count('450', '500'),
      over: false,
    })
    expect(countOf('x'.repeat(500), 500)).toEqual({
      text: words.limits.count('500', '500'),
      over: false,
    })
  })

  it('past one, say so in words, with the numbers as a person reads them', () => {
    expect(countOf('x'.repeat(4001), 4000)).toEqual({
      text: words.limits.over('4,001', '4,000'),
      over: true,
    })
    expect(words.limits.over('4,001', '4,000')).toBe(
      '4,001 of 4,000 characters: more than we can read at once. Could you shorten it a little?',
    )
  })
})
