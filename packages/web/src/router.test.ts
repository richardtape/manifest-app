import { describe, expect, it } from 'vitest'
import { parse } from './router.js'

describe('the router', () => {
  it.each([
    ['/', { name: 'your-apps' }],
    ['/profile', { name: 'profile' }],
    ['/signed-out', { name: 'signed-out' }],
    ['/new', { name: 'new' }],
    ['/apps/mock-app', { name: 'app', slug: 'mock-app' }],
    ['/nowhere', { name: 'unknown' }],
  ])('%s', (path, route) => expect(parse(path)).toEqual(route))

  it('a malformed address is a page we do not have, never a crash (the final review)', () =>
    expect(parse('/apps/%E0')).toEqual({ name: 'unknown' }))
})
