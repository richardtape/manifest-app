import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * THE APP'S CSS, READ AS TEXT (as the design system's `styles.test.ts` reads its own): what jsdom
 * cannot see, because it applies no stylesheet. Each case names a rule a person depends on.
 */
const CSS = readFileSync(new URL('./app.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

/** The declarations of every top-level rule whose selectors include `selector`. */
function declarationsFor(selector: string): string {
  return [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => (m[1] ?? '').split(',').some((s) => s.trim() === selector))
    .map((m) => m[2] ?? '')
    .join(';')
}

describe('app.css', () => {
  it('a support reference is kept whole, never broken at its hyphen (minors m6)', () => {
    expect(declarationsFor('.support-ref__code')).toMatch(/white-space:\s*nowrap/)
  })
})
