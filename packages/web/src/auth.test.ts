import { afterEach, describe, expect, it, vi } from 'vitest'
import { signInHref, signOut } from './auth.js'

/**
 * SIGN-OUT ASSERTS THE SHAPE OF ITS ANSWER, NOT THAT AN ANSWER ARRIVED (the console's
 * auth.ts has the history). A sign-out that did not happen must never reload the page
 * into a session that is still live, with nothing saying so.
 */
afterEach(() => vi.unstubAllGlobals())

function answering(status: number, body: string) {
  const calls: [string, RequestInit | undefined][] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push([url, init])
    return new Response(body, { status, headers: { 'content-type': 'application/json' } })
  })
  return calls
}

describe('signInHref', () => {
  it('sends the path and query back, encoded', () =>
    expect(signInHref('/apps?tab=people')).toBe(
      '/auth/login?returnTo=%2Fapps%3Ftab%3Dpeople',
    ))
})

describe('signOut', () => {
  it('POSTs /auth/logout and goes where it is told: a same-origin path', async () => {
    const calls = answering(200, JSON.stringify({ redirectTo: '/' }))
    const went: string[] = []
    await signOut((url) => went.push(url))
    expect(calls).toEqual([['/auth/logout', { method: 'POST' }]])
    expect(went).toEqual(['/'])
  })

  it('or an https URL: the IdP’s single logout', async () => {
    answering(
      200,
      JSON.stringify({ redirectTo: 'https://idp.manifest.internal/slo?SAMLRequest=x' }),
    )
    const went: string[] = []
    await signOut((url) => went.push(url))
    expect(went).toEqual(['https://idp.manifest.internal/slo?SAMLRequest=x'])
  })

  it.each([
    ['a 204', 204, ''],
    ['a 404 from a server that is not the platform', 404, ''],
    ['a 200 with no redirectTo', 200, '{}'],
    ['a 200 that is not JSON', 200, '<!doctype html>'],
    [
      'a protocol-relative redirectTo',
      200,
      JSON.stringify({ redirectTo: '//evil.example/x' }),
    ],
    [
      'a javascript: redirectTo',
      200,
      JSON.stringify({ redirectTo: 'javascript:alert(1)' }),
    ],
    [
      'an http: redirectTo',
      200,
      JSON.stringify({ redirectTo: 'http://idp.example/slo' }),
    ],
    // A browser reads the backslash as a slash: this is `//evil.example`, another host.
    ['a backslashed redirectTo', 200, JSON.stringify({ redirectTo: '/\\evil.example' })],
    ['a tab-split redirectTo', 200, JSON.stringify({ redirectTo: '/\t/evil.example' })],
  ])('refuses %s, and goes nowhere', async (_, status, body) => {
    answering(status, body)
    const went: string[] = []
    // On the origin it runs on in production, where `//x` resolves to `https://x`.
    await expect(
      signOut((url) => went.push(url), 'https://app.manifest.internal'),
    ).rejects.toThrow()
    expect(went).toEqual([])
  })
})
