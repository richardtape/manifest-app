// @vitest-environment jsdom
import type { SinceLine } from '@manifest-app/server/progress'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { HowWeKeepWatch } from './how.js'
import type { PageNeed } from './lines.js'
import { NeedsBand } from './needs.js'
import { Since } from './since.js'

/**
 * F6 TASK 9: COMING BACK (moment 16, design §2). The band, only when something needs them, each
 * line naming its app and carrying its button; *Since you were last here*, at most five lines,
 * only when there are some; *How we keep watch*, closed, what the watch cannot do.
 */
afterEach(cleanup)
const TZ = 'America/Vancouver'
const AT = '2026-10-01T17:03:00.000Z'
const app = { projectId: 'p', name: 'Reading responses', slug: 'reading-responses' }
const other = { projectId: 'q', name: 'Class check-ins', slug: 'class-check-ins' }
const b = words.keeping.band
const text = () => document.body.textContent ?? ''

describe('the band (NeedsBand)', () => {
  it('nothing needs them: not drawn at all', () => {
    const { container } = render(<NeedsBand needs={[]} timeZone={TZ} />)
    expect(container.innerHTML).toBe('')
  })

  it('each need is a line naming its app, with its button', () => {
    const needs: PageNeed[] = [
      { kind: 'question', app, conversationId: 'c-1', title: 'Word count', since: AT },
      { kind: 'down', app: other, from: AT, owner: true },
      { kind: 'answering-again', app, from: AT, to: '2026-10-01T17:07:00.000Z' },
      { kind: 'change-failed', app, incidentId: 'n', at: AT, owner: true },
      { kind: 'going-live', app: other },
    ]
    render(<NeedsBand needs={needs} timeZone={TZ} />)
    const band = screen.getByRole('region', { name: b.label })
    const items = within(band).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    const link = (item: HTMLElement) => within(item).getByRole('link')
    expect(items[0]!.textContent).toContain(b.question('Reading responses'))
    expect([link(items[0]!).textContent, link(items[0]!).getAttribute('href')]).toEqual([
      b.open,
      '/apps/reading-responses/conversations/c-1',
    ])
    expect(items[1]!.textContent).toContain(b.down('Class check-ins', '10:03am'))
    expect(link(items[1]!).textContent).toBe(b.startAgain)
    expect(link(items[2]!).textContent).toBe(b.whatHappened)
    expect(link(items[3]!).textContent).toBe(b.giveIt)
    expect([link(items[4]!).textContent, link(items[4]!).getAttribute('href')]).toEqual([
      b.goingLiveButton,
      '/apps/class-check-ins/going-live',
    ])
    expect(machineryIn(text())).toEqual([])
  })

  it('a helper sees the same words, who can start it again, and no button (Review Focus 5)', () => {
    render(
      <NeedsBand needs={[{ kind: 'down', app, from: AT, owner: false }]} timeZone={TZ} />,
    )
    const band = screen.getByRole('region', { name: b.label })
    expect(band.textContent).toContain(b.downHelper)
    expect(within(band).queryByRole('link')).toBeNull()
    expect(within(band).queryByRole('button')).toBeNull()
  })
})

describe('Since you were last here (Since)', () => {
  const lineOf = (n: number, on = app): SinceLine => ({
    id: `e${n}`,
    at: new Date(Date.parse(AT) - n * 3_600_000).toISOString(),
    happening: { kind: 'signed-off', releaseId: 'r' },
    who: null,
    whom: null,
    administrator: null,
    app: on,
  })

  it('never here before (lastHere null): not drawn', () => {
    const { container } = render(
      <Since lastHere={null} lines={[lineOf(1)]} timeZone={TZ} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('nothing since: not drawn', () => {
    const { container } = render(<Since lastHere={AT} lines={[]} timeZone={TZ} />)
    expect(container.innerHTML).toBe('')
  })

  it('on Your apps: each line names its app, a link to its history; at most five', () => {
    const lines = [
      lineOf(1),
      lineOf(2, other),
      lineOf(3),
      lineOf(4),
      lineOf(5),
      lineOf(6),
    ]
    render(<Since lastHere={AT} lines={lines} timeZone={TZ} />)
    const section = screen.getByRole('region', { name: words.keeping.since.title })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]!.textContent).toContain(words.keeping.lines.signedOff)
    const named = within(items[1]!).getByRole('link', { name: 'Class check-ins' })
    expect(named.getAttribute('href')).toBe('/apps/class-check-ins/history')
    expect(
      within(section).queryByRole('link', { name: words.keeping.since.everything }),
    ).toBeNull()
  })

  it('on the Overview: its own lines, no app named, and [Everything]', () => {
    render(<Since lastHere={AT} lines={[lineOf(1)]} timeZone={TZ} app={app} />)
    const section = screen.getByRole('region', { name: words.keeping.since.title })
    expect(within(section).queryByRole('link', { name: 'Reading responses' })).toBeNull()
    const everything = within(section).getByRole('link', {
      name: words.keeping.since.everything,
    })
    expect(everything.getAttribute('href')).toBe('/apps/reading-responses/history')
    expect(machineryIn(text())).toEqual([])
  })
})

describe('How we keep watch (HowWeKeepWatch)', () => {
  it('closed, and says what the watch cannot do, naming the app', () => {
    render(<HowWeKeepWatch name="Reading responses" />)
    const details = document.querySelector('details')!
    expect(details.open).toBe(false)
    expect(details.querySelector('summary')?.textContent).toBe(words.keeping.how.title)
    expect(details.textContent).toContain(words.keeping.how.body('Reading responses'))
  })
})
