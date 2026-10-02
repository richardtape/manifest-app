// @vitest-environment jsdom
import type { Line } from '@manifest-app/server/progress'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OurRefusal, type Ours } from '../../ours/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { History } from './history.js'

/**
 * F6 TASK 9: AN APP'S HISTORY (design §2, *[Everything]*): every line we kept, newest first,
 * grouped by the person's day; each gap where it happened; *"From 18 September."* at its foot. Our
 * server answers a member alone: anyone else is the page's *"There's nothing here."*
 */
afterEach(cleanup)
const TZ = 'America/Vancouver'
const project = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'reading-responses',
  name: 'Reading responses',
}
const h = words.keeping.history
const line = (id: string, at: string): Line => ({
  id,
  at,
  happening: { kind: 'signed-off', releaseId: 'r' },
  who: null,
  whom: null,
})
const oursWith = (history: Ours['history']) => ({ history }) as unknown as Ours

describe('the history page', () => {
  it('its title, every line by day, each gap in its place, and From at its foot', async () => {
    const answer = {
      from: '2026-09-18T16:00:00.000Z',
      gaps: [{ from: '2026-10-02T16:00:00.000Z', to: '2026-10-05T16:00:00.000Z' }],
      lines: [
        line('c', '2026-10-06T18:00:00.000Z'),
        line('b', '2026-10-01T18:00:00.000Z'),
        line('a', '2026-09-18T18:00:00.000Z'),
      ],
    }
    render(
      <History ours={oursWith(async () => answer)} project={project} timeZone={TZ} />,
    )
    expect(await screen.findByRole('heading', { level: 1, name: h.title })).toBeTruthy()
    const days = screen.getAllByRole('heading', { level: 2 }).map((d) => d.textContent)
    expect(days).toEqual(['6 October', '1 October', '18 September'])
    const page = document.body.textContent ?? ''
    const gap = h.gap('2 October', '5 October')
    expect(page).toContain(gap)
    // The gap sits between the lines it parts: after 6 October's, before 1 October's.
    expect(page.indexOf('6 October')).toBeLessThan(page.indexOf(gap))
    expect(page.indexOf(gap)).toBeLessThan(page.indexOf('1 October'))
    expect(page.trim().endsWith(h.from('18 September'))).toBe(true)
    expect(machineryIn(page)).toEqual([])
  })

  it('nothing held yet: it says so, with no From', async () => {
    render(
      <History
        ours={oursWith(async () => ({ from: null, gaps: [], lines: [] }))}
        project={project}
        timeZone={TZ}
      />,
    )
    expect(await screen.findByText(h.empty)).toBeTruthy()
    expect(document.body.textContent).not.toContain('From ')
  })

  it('a read that fails: we cannot reach Manifest, nothing of theirs changed, and Try again', async () => {
    let tries = 0
    render(
      <History
        ours={oursWith(async () => {
          tries++
          throw new OurRefusal('UNREACHABLE', null)
        })}
        project={project}
        timeZone={TZ}
      />,
    )
    const notice = await screen.findByText(h.cantReach)
    const again = within(notice.closest('[role="alert"]')!).getByRole('button', {
      name: h.retry,
    })
    again.click()
    await screen.findByText(h.cantReach)
    expect(tries).toBe(2)
  })

  it('not theirs (404): there is nothing here', async () => {
    render(
      <History
        ours={oursWith(async () => {
          throw new OurRefusal('NOT_FOUND', 404)
        })}
        project={project}
        timeZone={TZ}
      />,
    )
    expect(await screen.findByText(words.notFound.body, { exact: false })).toBeTruthy()
  })
})
