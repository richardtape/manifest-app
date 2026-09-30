// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LiveAddress } from './your-apps.js'

/**
 * THE LIVE ADDRESS, LARGE (Rich, 2026-09-30: "wrap only after :// and before a dot, never at the
 * slug's hyphen"; display only, Copy unchanged). Where a line may break is the markup's: a piece
 * kept whole is one `nowrap` span, and a `<wbr>` between pieces is where it may.
 */
afterEach(cleanup)

function pieces(url: string) {
  const { container } = render(<LiveAddress url={url} />)
  return {
    text: container.textContent,
    kept: [...container.querySelectorAll('.address__piece')].map((p) => p.textContent),
    breaks: container.querySelectorAll('wbr').length,
  }
}

describe('the live address: where it may wrap', () => {
  it('after :// and before each dot, and never inside the slug, hyphen and all', () =>
    expect(pieces('https://reading-responses.manifest.internal')).toEqual({
      text: 'https://reading-responses.manifest.internal',
      kept: ['https://', 'reading-responses', '.manifest', '.internal'],
      breaks: 3,
    }))

  it('the words read and selected are the address exactly: nothing added, nothing swapped', () => {
    const url = 'https://a-b-c.apps.example.ubc.ca'
    expect(pieces(url).text).toBe(url)
    expect(pieces(url).text).not.toMatch(/‑|­/)
  })

  it('an address with no scheme keeps its hostname’s rule', () =>
    expect(pieces('mock-app.manifest.internal').kept).toEqual([
      'mock-app',
      '.manifest',
      '.internal',
    ]))
})
