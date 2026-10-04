// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { NewVersion } from './new-version.js'

/**
 * F6b TASK 10: WAITING TO REACH YOUR STUDENTS (moment 17; design §1; Decision 11). On a launched app,
 * while the version on trying-out is not the one the live address serves: the two facts; an owner's
 * press when it is self-serve (F5's, after a launch: back to `?then=new-version`), a helper told an
 * owner does it; re-escalated, the fields in words and F5b's ask, never a deploy; another item unmet,
 * its words and [Going live]; a failed press, the students' version still theirs.
 */
const TZ = 'America/Vancouver'
const NOW = new Date('2026-10-03T19:00:00.000Z')
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: '2026-09-18T22:30:00.000Z',
}
/** The students' version, from 18 September at 3:12pm in Vancouver. */
const OLD: Schemas['Release'] = {
  ...fixtures.RELEASE,
  id: '88888888-8888-4888-8888-888888888881',
  createdAt: '2026-09-18T22:12:00.000Z',
}
/** The version on trying-out, from today at 9:00am in Vancouver. */
const NEW: Schemas['Release'] = {
  ...fixtures.RELEASE,
  id: '88888888-8888-4888-8888-888888888882',
  createdAt: '2026-10-03T16:00:00.000Z',
}
const PRODUCTION: Schemas['Environment'] = {
  ...fixtures.ENVIRONMENTS.find((e) => e.kind === 'production')!,
  hostname: `${SLUG}.manifest.internal`,
  url: `https://${SLUG}.manifest.internal`,
  instance: {
    ...fixtures.INSTANCE,
    id: '99999999-9999-4999-8999-999999999991',
    releaseId: OLD.id,
    state: 'healthy',
  },
}
const SELF_SERVE: Schemas['LaunchReadiness'] = {
  ...fixtures.SELF_SERVE_READINESS,
  candidateReleaseId: NEW.id,
  baselineReleaseId: OLD.id,
}
const item = (
  readiness: Schemas['LaunchReadiness'],
  id: string,
  patch: Partial<Schemas['LaunchReadinessItem']>,
) => readiness.items.map((i) => (i.id === id ? { ...i, ...patch } : i))
const REESCALATED: Schemas['LaunchReadiness'] = {
  ...SELF_SERVE,
  ready: false,
  reescalated: true,
  sensitiveFields: ['egress.allow'],
  items: item(SELF_SERVE, 'admin-approval', { state: 'unmet', since: null }),
}
const SCANS_UNMET: Schemas['LaunchReadiness'] = {
  ...SELF_SERVE,
  ready: false,
  items: item(SELF_SERVE, 'scans', { state: 'unmet' }),
}

const FACTS =
  'The version from today, 9:00am is on your trying-out address. Your students have the version from 18 September, 3:12pm.'
const PRESS = 'Let your students have this version'
const HELPER = 'An owner lets your students have it.'
const never = () => new Promise<never>(() => undefined)
const refused = (status: number, code: string) =>
  new ManifestApiError(
    status,
    { error: { code, message: 'x', hint: null } } as never,
    'test',
  )

function stage(
  readiness: Schemas['LaunchReadiness'] | (() => Schemas['LaunchReadiness']),
  over: Partial<Platform> = {},
) {
  const calls: [string, ...unknown[]][] = []
  const read = () => (typeof readiness === 'function' ? readiness() : readiness)
  const base: Partial<Platform> = {
    getLaunchReadiness: (...args) => {
      calls.push(['getLaunchReadiness', ...args])
      return Promise.resolve(read())
    },
    getRelease: (id) => Promise.resolve(id === NEW.id ? NEW : OLD),
    getApproval: () => Promise.reject(refused(404, 'NOT_FOUND')),
    listInstances: (environmentId) =>
      Promise.resolve({ environmentId, instances: [], truncated: false }),
    ...over,
  }
  const platform = new Proxy(base, {
    get: (target, key: string) => target[key as keyof Platform] ?? never,
  }) as Platform
  const ours = new Proxy({} as Partial<Ours>, {
    get: (target, key: string) => target[key as keyof Ours] ?? never,
  }) as Ours
  return { platform, ours, calls }
}

function draw(
  s: ReturnType<typeof stage>,
  props: Partial<Parameters<typeof NewVersion>[0]> = {},
) {
  let changed = 0
  const view = render(
    <NewVersion
      platform={s.platform}
      ours={s.ours}
      project={PROJECT}
      production={PRODUCTION}
      role="owner"
      arrived={false}
      expire={() => undefined}
      now={() => NOW}
      timeZone={TZ}
      onChanged={() => void changed++}
      {...props}
    />,
  )
  return { ...view, changed: () => changed }
}
const shown = () => document.body.textContent ?? ''

afterEach(() => cleanup())

describe('Waiting to reach your students (F6b Task 10)', () => {
  it('says nothing while the students have the version on trying-out, nor before a launch', async () => {
    const same = stage({ ...SELF_SERVE, candidateReleaseId: OLD.id })
    const a = draw(same)
    await waitFor(() => expect(same.calls).toHaveLength(1))
    expect(a.container.textContent).toBe('')
    cleanup()
    const before = stage({ ...fixtures.LAUNCH_READINESS, candidateReleaseId: NEW.id })
    const b = draw(before)
    await waitFor(() => expect(before.calls).toHaveLength(1))
    expect(b.container.textContent).toBe('')
  })

  it('names the two versions, and offers an owner the press when it can go straight to them', async () => {
    draw(stage(SELF_SERVE))
    expect(
      await screen.findByRole('heading', { name: 'Waiting to reach your students' }),
    ).toBeTruthy()
    expect(screen.getByText(FACTS)).toBeTruthy()
    expect(screen.getByRole('button', { name: PRESS })).toBeTruthy()
    expect(machineryIn(shown())).toEqual([])
  })

  it('a helper is told an owner lets the students have it, and has no press', async () => {
    draw(stage(SELF_SERVE), { role: 'helper' })
    expect(await screen.findByText(HELPER)).toBeTruthy()
    expect(screen.getByText(FACTS)).toBeTruthy()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })

  it('the press: exactly the candidate to the live address; landed, the students have it', async () => {
    const deployed: unknown[] = []
    const s = stage(SELF_SERVE, {
      deploy: (environmentId, releaseId) => {
        deployed.push([environmentId, releaseId])
        return Promise.resolve({
          ...fixtures.INSTANCE,
          id: '99999999-9999-4999-8999-999999999992',
          releaseId,
          state: 'healthy',
        } as Schemas['Instance'])
      },
    })
    const view = draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(
      await screen.findByText('Your students have the version from today, 9:00am.'),
    ).toBeTruthy()
    expect(deployed).toEqual([[PRODUCTION.id, NEW.id]])
    expect(view.changed()).toBeGreaterThan(0)
    expect(machineryIn(shown())).toEqual([])
  })

  it("the press asks the second sign-in, which comes back to the Overview's ?then=new-version, said so", async () => {
    const s = stage(SELF_SERVE, {
      deploy: () => Promise.reject(refused(403, 'STEP_UP_REQUIRED')),
    })
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    const again = await screen.findByRole('link', { name: words.tryingOut.stepUp.again })
    expect(again.getAttribute('href')).toContain(
      encodeURIComponent(`/apps/${SLUG}?then=new-version`),
    )
    cleanup()
    draw(stage(SELF_SERVE), { arrived: true })
    expect(await screen.findByText(words.goingLive.letIn.again)).toBeTruthy()
    expect(screen.getByRole('button', { name: PRESS })).toBeTruthy()
  })

  it('a failed start: the students still have their version, and what went wrong', async () => {
    const s = stage(SELF_SERVE, {
      deploy: (_environmentId, releaseId) =>
        Promise.resolve({
          ...fixtures.INSTANCE,
          id: '99999999-9999-4999-8999-999999999993',
          releaseId,
          state: 'failed',
        } as Schemas['Instance']),
      listEnvironments: () => Promise.resolve([PRODUCTION] as Schemas['EnvironmentList']),
      listIncidents: (environmentId) => Promise.resolve({ environmentId, incidents: [] }),
    })
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(
      await screen.findByText(
        'Your students still have the version from 18 September, 3:12pm.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(words.goingLive.letIn.nothingReached)).toBeNull()
  })

  it("re-escalated: what changed in words, and F5b's ask; never the press", async () => {
    draw(stage(REESCALATED))
    expect(
      await screen.findByText(
        "This change needs a Manifest administrator's look before it reaches your students, because it changes what it can reach.",
      ),
    ).toBeTruthy()
    expect(
      await screen.findByRole('button', {
        name: words.goingLive.rows.approval.ask,
      }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
    expect(machineryIn(shown())).toEqual([])
  })

  it.each(['helper', 'unknown'] as const)(
    're-escalated, read by a %s (minors m120, Rich: "Yes, any member"): the same sign-off and its ask, as before a launch; never "An owner lets…"',
    async (role) => {
      draw(stage(REESCALATED), { role })
      expect(
        await screen.findByRole('button', {
          name: words.goingLive.rows.approval.ask,
        }),
      ).toBeTruthy()
      expect(screen.queryByText(HELPER)).toBeNull()
      expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
    },
  )

  it('minors m98: re-escalated, its sign-off row is drawn in Going live’s list, and says nothing its chip says (no lone “you”)', async () => {
    draw(stage(REESCALATED))
    const name = await screen.findByText(words.goingLive.rows.approval.name)
    const row = name.closest('li')!
    expect(row.parentElement?.tagName).toBe('UL')
    expect(within(row).getByText(words.goingLive.state.attention)).toBeTruthy()
    expect(
      within(row).queryByText(words.goingLive.owners.you, { exact: true }),
    ).toBeNull()
  })

  it('minors m98: asked, the row still names who has it (a wait on someone else)', async () => {
    draw(
      stage({
        ...REESCALATED,
        items: item(REESCALATED, 'admin-approval', {
          state: 'unmet',
          since: '2026-10-02T17:00:00.000Z',
        }),
      }),
    )
    const row = (await screen.findByText(words.goingLive.rows.approval.asked)).closest(
      'li',
    )!
    expect(row.parentElement?.tagName).toBe('UL')
    expect(within(row).getByText(words.goingLive.owners.admin)).toBeTruthy()
  })

  it('re-escalated and already asked: waiting on a Manifest administrator, no ask again', async () => {
    draw(
      stage({
        ...REESCALATED,
        items: item(REESCALATED, 'admin-approval', {
          state: 'unmet',
          since: '2026-10-02T17:00:00.000Z',
        }),
      }),
    )
    expect(await screen.findByText(words.goingLive.rows.approval.asked)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: words.goingLive.rows.approval.ask }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })

  it('another item unmet: said, its row in F5’s words, and no press; never a link to Going live, which says only that it is live (the review’s I2)', async () => {
    draw(stage(SCANS_UNMET))
    expect(
      await screen.findByText(
        'Before your students can have it, this needs doing first.',
      ),
    ).toBeTruthy()
    expect(screen.getByText(words.goingLive.rows.scans.name)).toBeTruthy()
    // m98: its rows in Going live's list too.
    expect(
      screen.getByText(words.goingLive.rows.scans.name).closest('li')!.parentElement
        ?.tagName,
    ).toBe('UL')
    expect(screen.queryByRole('link', { name: 'Going live' })).toBeNull()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
    expect(machineryIn(shown())).toEqual([])
  })

  it("UBC's registration, or the privacy assessment, unmet: named in our words (the review's I2)", async () => {
    draw(
      stage({
        ...SELF_SERVE,
        ready: false,
        items: item(SELF_SERVE, 'iam-registration', { state: 'unmet' }),
      }),
    )
    expect(
      await screen.findByText(
        "UBC's identity team registers what this version asks for.",
      ),
    ).toBeTruthy()
    cleanup()
    draw(
      stage({
        ...SELF_SERVE,
        ready: false,
        items: item(SELF_SERVE, 'privacy-assessment', { state: 'unmet' }),
      }),
    )
    expect(
      await screen.findByText("UBC's Privacy Office approves its privacy assessment."),
    ).toBeTruthy()
  })

  it('a sign-off that cannot be read: we can’t tell, with a reference reported once as getApproval (m11, as Going live)', async () => {
    const reports: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/problems')
          reports.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return new Response(null, { status: 204 })
      }),
    )
    try {
      const UNREAD = {
        ...SELF_SERVE,
        ready: false,
        reescalated: false,
        items: item(SELF_SERVE, 'admin-approval', { state: 'unmet', since: null }),
      }
      draw(stage(UNREAD, { getApproval: () => Promise.reject(refused(500, 'INTERNAL')) }))
      expect(await screen.findByText(words.goingLive.rows.approval.cantTell)).toBeTruthy()
      const reference = /quote ([0-9A-F]{4}-[0-9A-F]{4})\./.exec(
        document.body.textContent ?? '',
      )?.[1]
      expect(reference).toBeDefined()
      await waitFor(() =>
        expect(reports).toEqual([
          expect.objectContaining({
            reference,
            code: 'INTERNAL',
            operation: 'getApproval',
          }),
        ]),
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('a sign-off refused: its reason, and Talk it through; never an undecided ask (the review’s I2)', async () => {
    const REFUSED = {
      ...SELF_SERVE,
      ready: false,
      reescalated: false,
      items: item(SELF_SERVE, 'admin-approval', { state: 'unmet', since: null }),
    }
    draw(
      stage(REFUSED, {
        getApproval: () =>
          Promise.resolve({
            id: 'a-1',
            releaseId: NEW.id,
            projectId: PROJECT.id,
            decision: 'rejected',
            decidedBy: 'u-admin',
            decidedByName: 'Pat Admin',
            decidedAt: '2026-10-03T17:00:00.000Z',
            imageDigest: 'x',
            reason: 'It reaches a host we have not reviewed.',
            diff: null,
            previewId: null,
          } as never),
      }),
    )
    expect(
      await screen.findByText(
        'Not signed off: ‘It reaches a host we have not reviewed.’ A new version is needed, and it’s looked at afresh.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Talk it through' })).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: words.goingLive.rows.approval.ask }),
    ).toBeNull()
    expect(screen.queryByText(/something on Going live/)).toBeNull()
  })

  it('re-escalated with no field named: something reviewed at launch, never "straight to your students" (the review’s M9)', async () => {
    draw(stage({ ...REESCALATED, sensitiveFields: [] }))
    expect(
      await screen.findByText(
        "This change needs a Manifest administrator's look before it reaches your students, because it changes something reviewed at launch.",
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/straight to your students/)).toBeNull()
  })

  it('while we do not know whether they own it: the facts alone, never "An owner lets…" to an owner (the review’s M6)', async () => {
    draw(stage(SELF_SERVE), { role: 'unknown' })
    expect(await screen.findByText(FACTS)).toBeTruthy()
    expect(screen.queryByText(HELPER)).toBeNull()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })

  it("after a launch, the press never speaks of going live: its stations, and a version changed under it (the review's M5)", async () => {
    const NEWER = { ...NEW, id: '88888888-8888-4888-8888-888888888883' }
    let reads = 0
    const s = stage(
      () => (++reads <= 2 ? SELF_SERVE : { ...SELF_SERVE, candidateReleaseId: NEWER.id }),
      {
        deploy: () => Promise.reject(refused(409, 'RELEASE_NOT_STAGED')),
        getRelease: (id) =>
          Promise.resolve(id === NEWER.id ? NEWER : id === NEW.id ? NEW : OLD),
      },
    )
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(
      await screen.findByText(
        'The version on your trying-out address changed a moment ago. Let your students have the new one?',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/Go live/)).toBeNull()
    cleanup()
    draw(stage(SELF_SERVE, { deploy: () => never() }))
    const again = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(again)
    })
    expect(
      await screen.findByRole('region', { name: 'Letting your students have it' }),
    ).toBeTruthy()
  })

  it('m10: back from the second sign-in, then the gate refused: the press drawn again never says "signed in again" again', async () => {
    const s = stage(SELF_SERVE, {
      deploy: () => Promise.reject(refused(409, 'RELEASE_REESCALATED')),
    })
    draw(s, { arrived: true })
    expect(await screen.findByText(words.goingLive.letIn.again)).toBeTruthy()
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    // Read again after the gate, ready again: the press is back.
    expect(await screen.findByRole('button', { name: PRESS })).toBeTruthy()
    expect(screen.queryByText(words.goingLive.letIn.again)).toBeNull()
  })

  it('the gate refuses the press: no press offered again while the panel reads again (minors m102)', async () => {
    let reads = 0
    const s = stage(SELF_SERVE, {
      getLaunchReadiness: () =>
        ++reads <= 2 ? Promise.resolve(SELF_SERVE) : new Promise(() => undefined),
      deploy: () => Promise.reject(refused(409, 'RELEASE_REESCALATED')),
    })
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    await waitFor(() => expect(reads).toBe(3))
    await act(async () => undefined)
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
    // Nor "needs doing first" with nothing under it (the review of m102).
    expect(screen.queryByText(words.overview.newVersion.unmet)).toBeNull()
  })

  it('the gate refuses, and the read after it fails: still no press, and nothing said to be undone (the review of m102)', async () => {
    let reads = 0
    const s = stage(SELF_SERVE, {
      getLaunchReadiness: () =>
        ++reads <= 2
          ? Promise.resolve(SELF_SERVE)
          : Promise.reject(refused(503, 'UNAVAILABLE')),
      deploy: () => Promise.reject(refused(409, 'RELEASE_REESCALATED')),
    })
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    await waitFor(() => expect(reads).toBe(3))
    await act(async () => undefined)
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
    expect(screen.queryByText(words.overview.newVersion.unmet)).toBeNull()
  })

  it('the gate refuses the press (RELEASE_REESCALATED): the panel reads again, and asks instead', async () => {
    let reads = 0
    const s = stage(() => (++reads <= 2 ? SELF_SERVE : REESCALATED), {
      deploy: () => Promise.reject(refused(409, 'RELEASE_REESCALATED')),
    })
    draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(
      await screen.findByRole('button', { name: words.goingLive.rows.approval.ask }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })
})

describe('minors m99 (Rich, 22:55 PDT: “Drop the press’s line after launch”)', () => {
  it('the version on trying-out is named once, by the facts: never the press’s “goes to” line', async () => {
    draw(stage(SELF_SERVE))
    expect(await screen.findByText(FACTS)).toBeTruthy()
    expect(screen.getByRole('button', { name: PRESS })).toBeTruthy()
    expect(shown()).not.toContain('goes to')
    expect(shown()).not.toContain('Your trying-out address stays as it is.')
    expect(shown().split('The version from today, 9:00am').length - 1).toBe(1)
  })

  it('while it works: its stations, and still no “goes to” line', async () => {
    draw(stage(SELF_SERVE, { deploy: never }))
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(
      await screen.findByRole('region', {
        name: words.overview.newVersion.stationsLabel,
      }),
    ).toBeTruthy()
    expect(shown()).not.toContain('goes to')
  })
})

describe('minors m103: a version we cannot date is never said to be newer or earlier', () => {
  const unread = () => Promise.reject(refused(500, 'INTERNAL'))
  it.each([
    [
      'the one on trying-out',
      [NEW.id],
      'A different version is on your trying-out address. Your students have the version from 18 September, 3:12pm.',
    ],
    [
      'the students’',
      [OLD.id],
      'The version from today, 9:00am is on your trying-out address. Your students have a different one.',
    ],
    [
      'neither',
      [NEW.id, OLD.id],
      'Your trying-out address has a different version from the one your students have.',
    ],
  ])('%s undated: only what we know', async (_, undated, facts) => {
    draw(
      stage(SELF_SERVE, {
        getRelease: (id) =>
          undated.includes(id) ? unread() : Promise.resolve(id === NEW.id ? NEW : OLD),
      }),
    )
    expect(await screen.findByText(facts)).toBeTruthy()
    expect(shown()).not.toMatch(/newer|earlier/i)
  })
})

describe('minors m101: after a launch, the landed moment gives way to a later version', () => {
  /** The version a colleague put on trying-out meanwhile, from today at 11:00am in Vancouver. */
  const NEWER: Schemas['Release'] = {
    ...fixtures.RELEASE,
    id: '88888888-8888-4888-8888-888888888883',
    createdAt: '2026-10-03T18:00:00.000Z',
  }
  const LANDED = 'Your students have the version from today, 9:00am.'

  /** Pressed and landed; then the Overview reads its addresses again, the students on NEW. */
  async function landedThenRead(
    after: Schemas['LaunchReadiness'],
    whileLanded: () => void = () => undefined,
  ) {
    let readiness = SELF_SERVE
    const s = stage(() => readiness, {
      getRelease: (id) =>
        Promise.resolve(id === NEWER.id ? NEWER : id === NEW.id ? NEW : OLD),
      deploy: (_environmentId, releaseId) =>
        Promise.resolve({
          ...fixtures.INSTANCE,
          id: '99999999-9999-4999-8999-999999999992',
          releaseId,
          state: 'healthy',
        } as Schemas['Instance']),
    })
    const view = draw(s)
    const pressed = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(pressed)
    })
    expect(await screen.findByText(LANDED)).toBeTruthy()
    whileLanded()
    readiness = after
    const reads = s.calls.length
    view.rerender(
      <NewVersion
        platform={s.platform}
        ours={s.ours}
        project={PROJECT}
        production={{
          ...PRODUCTION,
          instance: { ...PRODUCTION.instance!, releaseId: NEW.id },
        }}
        role="owner"
        arrived={false}
        expire={() => undefined}
        now={() => NOW}
        timeZone={TZ}
        onChanged={() => undefined}
      />,
    )
    await waitFor(() => expect(s.calls.length).toBeGreaterThan(reads))
    await act(async () => undefined)
  }

  it('a reading older than the press names its own candidate: the moment stays (the review)', async () => {
    // Trying-out changed under the button (NEWER), and the reading that should have followed failed,
    // so the panel still names NEW; the second press sends NEWER, and it lands.
    const answers: (Schemas['LaunchReadiness'] | Error)[] = [
      SELF_SERVE,
      { ...SELF_SERVE, candidateReleaseId: NEWER.id },
      refused(500, 'INTERNAL'),
      { ...SELF_SERVE, candidateReleaseId: NEWER.id },
    ]
    const s = stage(
      () => {
        const next = answers.length > 1 ? answers.shift()! : answers[0]!
        if (next instanceof Error) throw next
        return next
      },
      {
        getRelease: (id) =>
          Promise.resolve(id === NEWER.id ? NEWER : id === NEW.id ? NEW : OLD),
        deploy: (_environmentId, releaseId) =>
          Promise.resolve({
            ...fixtures.INSTANCE,
            id: '99999999-9999-4999-8999-999999999992',
            releaseId,
            state: 'healthy',
          } as Schemas['Instance']),
      },
    )
    const view = draw(s)
    const first = await screen.findByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(first)
    })
    // m136: the facts are a status region too, so the changed words are found by their own.
    await screen.findByText(words.overview.newVersion.changed)
    const again = screen.getByRole('button', { name: PRESS })
    await act(async () => {
      fireEvent.click(again)
    })
    const landed = 'Your students have the version from today, 11:00am.'
    expect(await screen.findByText(landed)).toBeTruthy()
    // The Overview draws the panel again (its quiet read): the reading still names NEW.
    view.rerender(
      <NewVersion
        platform={s.platform}
        ours={s.ours}
        project={PROJECT}
        production={PRODUCTION}
        role="owner"
        arrived={false}
        expire={() => undefined}
        now={() => NOW}
        timeZone={TZ}
        onChanged={() => undefined}
      />,
    )
    await act(async () => undefined)
    expect(screen.getByText(landed)).toBeTruthy()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })

  it('the reading after it names the version that landed: the moment stays', async () => {
    await landedThenRead({ ...SELF_SERVE, baselineReleaseId: NEW.id })
    expect(screen.getByText(LANDED)).toBeTruthy()
    expect(screen.queryByRole('button', { name: PRESS })).toBeNull()
  })

  it('it names a later one on trying-out: that one’s facts, and the press again', async () => {
    await landedThenRead({
      ...SELF_SERVE,
      candidateReleaseId: NEWER.id,
      baselineReleaseId: NEW.id,
    })
    expect(
      await screen.findByText(
        'The version from today, 11:00am is on your trying-out address. Your students have the version from today, 9:00am.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(LANDED)).toBeNull()
    expect(screen.getByRole('button', { name: PRESS })).toBeTruthy()
  })

  it('minors m136: the give-way is said to a screen reader, the later one’s facts in a live region the panel already held', async () => {
    let region: HTMLElement | undefined
    await landedThenRead(
      { ...SELF_SERVE, candidateReleaseId: NEWER.id, baselineReleaseId: NEW.id },
      () => {
        // While the moment holds, the facts' region stays, empty: their return is a change in it.
        region = screen.getAllByRole('status').find((el) => el.textContent === '')
        expect(region).toBeDefined()
      },
    )
    await waitFor(() =>
      expect(region!.textContent).toBe(
        'The version from today, 11:00am is on your trying-out address. Your students have the version from today, 9:00am.',
      ),
    )
    expect(region!.isConnected).toBe(true)
  })
})

describe('minors m136: shown again, the panel reads again', () => {
  /** The version a colleague put on trying-out while they were away, from today at 11:00am. */
  const NEWER: Schemas['Release'] = {
    ...fixtures.RELEASE,
    id: '88888888-8888-4888-8888-888888888883',
    createdAt: '2026-10-03T18:00:00.000Z',
  }
  const visibility = (state: 'visible' | 'hidden') =>
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    })
  const showAgain = async (state: 'visible' | 'hidden' = 'visible') => {
    visibility(state)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }
  afterEach(() => Reflect.deleteProperty(document, 'visibilityState'))

  it('a version put on trying-out while they were away: its facts once the page is shown again, never while hidden', async () => {
    let readiness = SELF_SERVE
    const s = stage(() => readiness, {
      getRelease: (id) =>
        Promise.resolve(id === NEWER.id ? NEWER : id === NEW.id ? NEW : OLD),
    })
    draw(s)
    expect(await screen.findByText(FACTS)).toBeTruthy()
    readiness = { ...SELF_SERVE, candidateReleaseId: NEWER.id }
    await showAgain('hidden')
    expect(s.calls).toHaveLength(1)
    await showAgain()
    expect(
      await screen.findByText(
        'The version from today, 11:00am is on your trying-out address. Your students have the version from 18 September, 3:12pm.',
      ),
    ).toBeTruthy()
    expect(s.calls).toHaveLength(2)
  })

  it('shown again and the read refused: the panel stands as it was, its press with it', async () => {
    let failing = false
    const s = stage(() => {
      if (failing) throw refused(500, 'INTERNAL')
      return SELF_SERVE
    })
    draw(s)
    expect(await screen.findByText(FACTS)).toBeTruthy()
    failing = true
    await showAgain()
    await waitFor(() => expect(s.calls).toHaveLength(2))
    await act(async () => undefined)
    expect(screen.getByText(FACTS)).toBeTruthy()
    expect(screen.getByRole('button', { name: PRESS })).toBeTruthy()
  })

  it('a panel no longer drawn reads nothing when the page is shown again', async () => {
    const s = stage(SELF_SERVE)
    const view = draw(s)
    expect(await screen.findByText(FACTS)).toBeTruthy()
    view.unmount()
    await showAgain()
    expect(s.calls).toHaveLength(1)
  })
})
