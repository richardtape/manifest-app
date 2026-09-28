import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * THE DESIGN SYSTEM'S CSS, READ AS TEXT: what jsdom cannot see, because it applies no
 * stylesheet (the final review). Each case names a rule a person depends on.
 */
const CSS = readFileSync(new URL('./components.css', import.meta.url), 'utf8')

/** The body of the first `@media <query>` block. */
function media(query: string): string {
  const at = CSS.indexOf(`@media ${query}`)
  if (at === -1) return ''
  let depth = 0
  const open = CSS.indexOf('{', at)
  for (let i = open; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++
    if (CSS[i] === '}' && --depth === 0) return CSS.slice(open + 1, i)
  }
  return ''
}

/** The declarations of every rule in `block` whose selectors include `selector`. */
function declarationsFor(block: string, selector: string): string {
  return [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => (m[1] ?? '').split(',').some((s) => s.trim() === selector))
    .map((m) => m[2] ?? '')
    .join(';')
}

describe('the rail folded to icons (below 900px)', () => {
  it('hides a label visually and keeps it for a screen reader: clipped, never display:none', () => {
    const hidden = declarationsFor(
      media('(max-width: 899px)'),
      '.mf-rail--collapsible .mf-rail__label',
    )
    expect(hidden).toMatch(/clip-path:\s*inset\(50%\)/)
    expect(hidden).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })
})

describe('motion, for a person who asks for less (prefers-reduced-motion)', () => {
  // A media query adds no specificity: a rule that sets an animation AFTER the block would
  // win over it, and the test above would still pass. So the block comes after every one.
  it('comes after every animation it overrides, so it wins', () => {
    const block = CSS.indexOf('@media (prefers-reduced-motion: reduce)')
    const animations = [...CSS.matchAll(/animation:\s*mf-/g)].map((m) => m.index ?? 0)
    expect(block).toBeGreaterThan(-1)
    expect(Math.max(...animations)).toBeLessThan(block)
  })

  it.each(['.mf-pulse', '.mf-bar__fill--working'])('%s stops moving', (selector) =>
    expect(declarationsFor(media('(prefers-reduced-motion: reduce)'), selector)).toMatch(
      /animation:\s*none/,
    ),
  )
})

describe('machine text at a phone’s width (F3 Task 10)', () => {
  // A log line is one long word as often as not (a path, a hash): unwrapped, it widens the
  // whole page at 375px, since the pane sits inside a step inside a list.
  it('a log line wraps anywhere rather than widen what holds it', () =>
    expect(declarationsFor(CSS, '.mf-log')).toMatch(/overflow-wrap:\s*anywhere/))

  it('a step holding a disclosure may shrink below its content’s width', () =>
    expect(declarationsFor(CSS, '.mf-step__body')).toMatch(/min-width:\s*0/))
})
