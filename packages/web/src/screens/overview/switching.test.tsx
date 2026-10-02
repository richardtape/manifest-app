// @vitest-environment jsdom
import { ManifestApiError, type Schemas } from '@manifest/contract'
import { fixtures } from '@manifest/mock'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stepUpHref } from '../../auth.js'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import type { Then } from '../../router.js'
import { words } from '../../words.js'
import type { Role } from '../keeping/role.js'
import { machineryIn } from '../machinery.js'
import { StartForStudents, SwitchBackOn, Switching } from './switching.js'

/**
 * F6 TASK 11: END OF TERM (moment 20, design §5), against a recording `Platform` and `Ours`.
 * **Every action is the person's own session**; an owner's alone (Review Focus 5). Switching off
 * asks the second sign-in and repeats a teardown that did not finish once by itself; switching back
 * on asks none and mints our server's watch at once; *Start it for your students* puts production's
 * own last version back through trying-out; a draft that never went live can be deleted.
 */
const w = words.keeping.switching
const t = words.tryingOut
const TZ = 'America/Vancouver'
const NOW = new Date('2026-10-01T19:00:00.000Z')
const SLUG = 'reading-responses'
const LIVE: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
  launchedAt: '2026-09-20T17:00:00.000Z',
}
const DRAFT: Schemas['Project'] = { ...LIVE, launchedAt: null }
const ARCHIVED: Schemas['Project'] = {
  ...LIVE,
  state: 'archived',
  archivedAt: '2026-12-12T18:00:00.000Z',
}
const ID = {
  sandbox: '33333333-3333-4333-8333-333333333331',
  staging: '33333333-3333-4333-8333-333333333332',
  production: '33333333-3333-4333-8333-333333333333',
} as const
/** The version the students' address last served, still named after a switch-off (S1: M4). */
const LAST = '55555555-5555-4555-8555-555555555551'
const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

type Answer = 'ok' | 'never' | { status: number; code: string }

function stage(answers: Partial<Record<string, Answer[]>> = {}) {
  const calls: [string, ...unknown[]][] = []
  const turns: Record<string, number> = {}
  /** Each call's answer, in turn; the last stands for any after it; `ok` when none is told. */
  const next = (name: string): Answer => {
    const list = answers[name] ?? ['ok']
    const turn = turns[name] ?? 0
    turns[name] = turn + 1
    return list[Math.min(turn, list.length - 1)]!
  }
  const answer =
    <A extends unknown[], T>(name: string, value: (...args: A) => T) =>
    (...args: A): Promise<T> => {
      calls.push([name, ...args])
      const said = next(name)
      if (said === 'never') return never()
      if (typeof said === 'object') return Promise.reject(refused(said.status, said.code))
      return Promise.resolve(value(...args))
    }
  const instance = (
    kind: 'staging' | 'production',
    state: Schemas['Instance']['state'],
    id = `i-${kind}`,
  ): Schemas['Instance'] => ({
    id,
    environmentId: ID[kind],
    releaseId: LAST,
    kind: 'web',
    state,
    lastSeenAt: null,
    createdAt: '2026-09-20T17:00:00.000Z',
  })
  const environment = (
    kind: keyof typeof ID,
    serving: Schemas['Instance'] | null,
  ): Schemas['Environment'] => ({
    id: ID[kind],
    projectId: LIVE.id,
    kind,
    hostname: `${SLUG}.${kind}.manifest.internal`,
    url: `https://${SLUG}.${kind}.manifest.internal`,
    instance: serving,
  })
  const platform: Platform = {
    getMe: () => Promise.resolve(fixtures.ME),
    listProjects: never,
    getProject: never,
    getRelease: never,
    listEnvironments: answer('listEnvironments', () => [
      environment('sandbox', null),
      environment('staging', null),
      // Switched off, then back on: production still names the one it served, gone (M4).
      environment('production', instance('production', 'gone')),
    ]),
    getEnvironment: never,
    listInstances: answer('listInstances', (environmentId: string) => ({
      environmentId,
      instances: [],
      truncated: false,
    })),
    listIncidents: never,
    deploy: answer('deploy', (environmentId: string, releaseId: string) => ({
      ...instance(
        environmentId === ID.production ? 'production' : 'staging',
        'healthy',
        `i-new-${environmentId}`,
      ),
      releaseId,
    })),
    archiveProject: answer('archiveProject', () => ARCHIVED),
    restoreProject: answer('restoreProject', () => ({
      ...ARCHIVED,
      state: 'active' as const,
    })),
    deleteProject: answer('deleteProject', () => ({
      id: DRAFT.id,
      slug: DRAFT.slug,
      state: 'deleted' as const,
      deletedAt: '2026-10-01T19:00:00.000Z',
    })),
    mintToken: answer('mintToken', () => fixtures.MINTED_TOKEN),
    revokeToken: never,
    listMembers: never,
    runRehearsal: never,
    getLaunchReadiness: never,
    getLaunchRecords: never,
    getApproval: never,
    requestApproval: never,
    startIntakeSession: never,
    endIntakeSession: never,
    checkSlug: never,
    listBlueprints: never,
    createProject: never,
    listAppSecrets: never,
    setAppSecret: never,
    watchProject: () => ({ ready: never(), close: () => undefined }),
  }
  const oursCalls: [string, ...unknown[]][] = []
  const ours = {
    forget: (...args: unknown[]) => {
      oursCalls.push(['forget', ...args])
      return Promise.resolve()
    },
    keeping: (...args: unknown[]) => {
      oursCalls.push(['keeping', ...args])
      return Promise.resolve({ watching: false, until: null, tokenId: null, mine: false })
    },
    handWatch: (...args: unknown[]) => {
      oursCalls.push(['handWatch', ...args])
      return Promise.resolve({ kept: 'new' as const })
    },
  } as unknown as Ours
  const called = (name: string) =>
    calls.filter((c) => c[0] === name).map((c) => c.slice(1))
  return { platform, ours, oursCalls, called, calls }
}
type Stage = ReturnType<typeof stage>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
const press = async (name: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name }))
  await settle()
}
const text = () => document.body.textContent ?? ''

function drawSwitching(
  st: Stage,
  {
    project = LIVE,
    role = 'owner',
    then = null,
    onChanged = () => undefined,
  }: {
    project?: Schemas['Project']
    role?: Role
    then?: Then
    onChanged?: (untidy?: boolean) => void
  } = {},
) {
  return render(
    <Switching
      platform={st.platform}
      ours={st.ours}
      project={project}
      role={role}
      then={then}
      onChanged={onChanged}
      expire={() => undefined}
    />,
  )
}

describe('Switching it off: an owner’s alone (Review Focus 5)', () => {
  it.each<Role>(['helper', 'unknown'])('a %s sees nothing of it', (role) => {
    const { container } = drawSwitching(stage(), { role })
    expect(container.innerHTML).toBe('')
  })

  it('an owner: the section, quiet, with Switch it off', () => {
    drawSwitching(stage())
    const section = screen.getByRole('region', { name: w.title })
    expect(within(section).getByRole('button', { name: w.off })).toBeTruthy()
    expect(machineryIn(text())).toEqual([])
  })

  it('a switched-off app that has been live has no section (its Overview offers Switch it back on)', () => {
    const { container } = drawSwitching(stage(), { project: ARCHIVED })
    expect(container.innerHTML).toBe('')
  })

  it('the confirming step takes the focus, so a screen reader says it; Keep it running gives it back to the section (the review’s M5)', async () => {
    drawSwitching(stage())
    await press(w.off)
    expect(document.activeElement?.textContent).toBe(w.confirmOff)
    await press(w.keepRunning)
    expect(document.activeElement).toBe(screen.getByRole('region', { name: w.title }))
  })

  it('back from signing in again, the confirming step has the focus (and so is in view)', async () => {
    drawSwitching(stage(), { then: 'switch-off' })
    await settle()
    expect(document.activeElement?.textContent).toBe(w.confirmOff)
  })
})

describe('[Switch it off] (design §5)', () => {
  it('asks first, in words, on the page; Keep it running closes it, and nothing is sent', async () => {
    const st = stage()
    drawSwitching(st)
    await press(w.off)
    expect(text()).toContain(w.confirmOff)
    expect(screen.getByRole('button', { name: w.keepRunning })).toBeTruthy()
    await press(w.keepRunning)
    expect(text()).not.toContain(w.confirmOff)
    expect(st.called('archiveProject')).toEqual([])
  })

  it('confirmed: archiveProject in their session, with an Idempotency-Key; the page is told', async () => {
    const st = stage()
    const onChanged = vi.fn()
    drawSwitching(st, { onChanged })
    await press(w.off)
    await press(w.off)
    const sent = st.called('archiveProject')
    expect(sent).toHaveLength(1)
    expect(sent[0]![0]).toBe(LIVE.id)
    expect(sent[0]![1]).toMatch(/^[0-9a-f-]{36}$/)
    expect(onChanged).toHaveBeenCalledWith()
  })

  it('a second sign-in asked: F5’s card, back to the Overview with then=switch-off', async () => {
    const st = stage({ archiveProject: [{ status: 403, code: 'STEP_UP_REQUIRED' }] })
    drawSwitching(st)
    await press(w.off)
    await press(w.off)
    expect(
      within(screen.getByRole('alert'))
        .getByRole('link', { name: t.stepUp.again })
        .getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}?then=switch-off`))
  })

  it('back from signing in again: the confirming step, said so; nothing sent until it is pressed', async () => {
    const st = stage()
    drawSwitching(st, { then: 'switch-off' })
    await settle()
    expect(text()).toContain(words.goingLive.letIn.again)
    expect(text()).toContain(w.confirmOff)
    expect(st.called('archiveProject')).toEqual([])
  })

  it('PROJECT_TEARDOWN_INCOMPLETE: the request once more by itself, and then it is done', async () => {
    const st = stage({
      archiveProject: [{ status: 500, code: 'PROJECT_TEARDOWN_INCOMPLETE' }, 'ok'],
    })
    const onChanged = vi.fn()
    drawSwitching(st, { onChanged })
    await press(w.off)
    await press(w.off)
    expect(st.called('archiveProject')).toHaveLength(2)
    expect(onChanged).toHaveBeenCalledWith()
  })

  it('still incomplete after the repeat: the page is told we didn’t finish tidying up, and nothing more is sent', async () => {
    const st = stage({
      archiveProject: [{ status: 500, code: 'PROJECT_TEARDOWN_INCOMPLETE' }],
    })
    const onChanged = vi.fn()
    drawSwitching(st, { onChanged })
    await press(w.off)
    await press(w.off)
    expect(st.called('archiveProject')).toHaveLength(2)
    expect(onChanged).toHaveBeenCalledWith(true)
  })

  it('any other refusal: F5’s words, with a reference', async () => {
    const st = stage({ archiveProject: [{ status: 500, code: 'INTERNAL' }] })
    drawSwitching(st)
    await press(w.off)
    await press(w.off)
    expect(screen.getByRole('alert').textContent).toContain(t.couldnt)
    expect(st.called('archiveProject')).toHaveLength(1)
  })
})

describe('[Delete it]: only an app that never went live (D7)', () => {
  it('an app that has been live: FE-45’s sentence where Delete it would be, and no button', () => {
    drawSwitching(stage(), { project: LIVE })
    expect(screen.queryByRole('button', { name: w.delete })).toBeNull()
    expect(text()).toContain(`${w.liveKept} ${w.liveKeptMore}`)
  })

  it('a draft: asks first, in words; Keep it closes it', async () => {
    const st = stage()
    drawSwitching(st, { project: DRAFT })
    expect(text()).not.toContain(w.liveKept)
    await press(w.delete)
    expect(text()).toContain(w.confirmDelete)
    await press(w.keepIt)
    expect(text()).not.toContain(w.confirmDelete)
    expect(st.called('deleteProject')).toEqual([])
  })

  it('confirmed: deleteProject in their session, then our own rows forgotten, then Your apps', async () => {
    const st = stage()
    window.history.pushState({}, '', `/apps/${SLUG}`)
    drawSwitching(st, { project: DRAFT })
    await press(w.delete)
    await press(w.deleteForGood)
    expect(st.called('deleteProject').map(([id]) => id)).toEqual([DRAFT.id])
    expect(st.oursCalls).toEqual([['forget', DRAFT.id]])
    expect(window.location.pathname).toBe('/')
  })

  it('a second sign-in asked: the card, back with then=delete; arriving, the confirming step, said so', async () => {
    const st = stage({ deleteProject: [{ status: 403, code: 'STEP_UP_REQUIRED' }] })
    drawSwitching(st, { project: DRAFT })
    await press(w.delete)
    await press(w.deleteForGood)
    expect(
      within(screen.getByRole('alert'))
        .getByRole('link', { name: t.stepUp.again })
        .getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}?then=delete`))
    expect(st.oursCalls).toEqual([])
    cleanup()
    drawSwitching(stage(), { project: DRAFT, then: 'delete' })
    await settle()
    expect(text()).toContain(words.goingLive.letIn.again)
    expect(text()).toContain(w.confirmDelete)
  })

  it('PROJECT_TEARDOWN_INCOMPLETE: the request once more by itself, and then gone as ever (the review’s I2)', async () => {
    const st = stage({
      deleteProject: [{ status: 500, code: 'PROJECT_TEARDOWN_INCOMPLETE' }, 'ok'],
    })
    window.history.pushState({}, '', `/apps/${SLUG}`)
    drawSwitching(st, { project: DRAFT })
    await press(w.delete)
    await press(w.deleteForGood)
    expect(st.called('deleteProject')).toHaveLength(2)
    expect(st.oursCalls).toEqual([['forget', DRAFT.id]])
    expect(window.location.pathname).toBe('/')
  })

  it('still incomplete after the repeat: said as it is (switched off, not finished), the page told; nothing of ours forgotten (the review’s I2)', async () => {
    const st = stage({
      deleteProject: [{ status: 500, code: 'PROJECT_TEARDOWN_INCOMPLETE' }],
    })
    const onChanged = vi.fn()
    drawSwitching(st, { project: DRAFT, onChanged })
    await press(w.delete)
    await press(w.deleteForGood)
    expect(st.called('deleteProject')).toHaveLength(2)
    expect(text()).toContain(w.deleteUnfinished)
    expect(text()).not.toContain(t.couldnt)
    expect(onChanged).toHaveBeenCalled()
    expect(st.oursCalls).toEqual([])
  })

  it('a draft switched off: Delete it is still there, and Switch it off is not (the review’s I2)', () => {
    drawSwitching(stage(), { project: { ...ARCHIVED, launchedAt: null } })
    expect(screen.getByRole('button', { name: w.delete })).toBeTruthy()
    expect(screen.queryByRole('button', { name: w.off })).toBeNull()
  })

  it('it went live meanwhile (PROJECT_LAUNCHED_NOT_DELETABLE): why it is kept; nothing of ours forgotten', async () => {
    const st = stage({
      deleteProject: [{ status: 409, code: 'PROJECT_LAUNCHED_NOT_DELETABLE' }],
    })
    drawSwitching(st, { project: DRAFT })
    await press(w.delete)
    await press(w.deleteForGood)
    expect(text()).toContain(w.liveKept)
    expect(st.oursCalls).toEqual([])
    expect(machineryIn(text())).toEqual([])
  })
})

describe('[Switch it back on] (design §5)', () => {
  function drawBack(st: Stage, project: Schemas['Project'], onChanged = () => undefined) {
    render(
      <SwitchBackOn
        platform={st.platform}
        ours={st.ours}
        project={project}
        onChanged={onChanged}
        expire={() => undefined}
        launched={<p>{w.back}</p>}
      />,
    )
  }

  it('restoreProject at once, no second sign-in; our server’s watch minted; the page told', async () => {
    const st = stage()
    const onChanged = vi.fn()
    drawBack(st, ARCHIVED, onChanged)
    await press(w.backOn)
    expect(st.called('restoreProject').map(([id]) => id)).toEqual([ARCHIVED.id])
    // The watch token, minted again (its tokens stay revoked).
    expect(
      st.called('mintToken').map(([, body]) => (body as { name: string }).name),
    ).toEqual(['Keeping watch'])
    expect(st.oursCalls.map(([name]) => name)).toEqual(['keeping', 'handWatch'])
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(text()).toContain(w.back)
  })

  it('an app that never went live: It’s back. Your draft starts again…', async () => {
    const st = stage()
    drawBack(st, { ...ARCHIVED, launchedAt: null })
    await press(w.backOn)
    expect(text()).toContain(w.backDraft)
  })

  it('refused: F5’s words, and the button again', async () => {
    const st = stage({ restoreProject: [{ status: 500, code: 'INTERNAL' }] })
    drawBack(st, ARCHIVED)
    await press(w.backOn)
    expect(screen.getByRole('alert').textContent).toContain(t.couldnt)
    expect(screen.getByRole('button', { name: w.backOn })).toBeTruthy()
    expect(st.called('mintToken')).toEqual([])
  })
})

describe('[Start it for your students] (design §5; S1: M4)', () => {
  function drawStudents(st: Stage, arrived = false, onDone = () => undefined) {
    render(
      <StartForStudents
        platform={st.platform}
        ours={st.ours}
        project={LIVE}
        arrived={arrived}
        onDone={onDone}
        expire={() => undefined}
        now={() => NOW}
        timeZone={TZ}
      />,
    )
  }

  it('production’s own last version, read at the press: trying-out first, its end awaited, then the students’ address', async () => {
    const st = stage()
    const onDone = vi.fn()
    drawStudents(st, false, onDone)
    expect(st.calls).toEqual([])
    await press(w.students)
    expect(st.called('deploy').map(([env, release]) => [env, release])).toEqual([
      [ID.staging, LAST],
      [ID.production, LAST],
    ])
    expect(text()).toContain(words.goingLive.letIn.landed(LIVE.name))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(machineryIn(text())).toEqual([])
  })

  it('the students’ address waits for trying-out’s end', async () => {
    const st = stage({ deploy: ['never'] })
    drawStudents(st)
    await press(w.students)
    expect(st.called('deploy').map(([env]) => env)).toEqual([ID.staging])
  })

  it('a second sign-in asked at the students’ address: the card, back with then=students', async () => {
    const st = stage({ deploy: ['ok', { status: 403, code: 'STEP_UP_REQUIRED' }] })
    drawStudents(st)
    await press(w.students)
    expect(
      within(screen.getByRole('alert'))
        .getByRole('link', { name: t.stepUp.again })
        .getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}?then=students`))
  })

  it('back from signing in again: said, the same button, nothing pressed by itself', async () => {
    const st = stage()
    drawStudents(st, true)
    await settle()
    expect(text()).toContain(words.goingLive.letIn.again)
    expect(st.called('deploy')).toEqual([])
  })

  it('a registration lapsed, or a sign-off needed (the gate): said, with Going live', async () => {
    const st = stage({
      deploy: ['ok', { status: 409, code: 'RELEASE_PRODUCTION_GATE_UNAVAILABLE' }],
    })
    drawStudents(st)
    await press(w.students)
    expect(text()).toContain(words.keeping.startAgain.gate)
    expect(
      screen
        .getByRole('link', { name: words.keeping.band.goingLiveButton })
        .getAttribute('href'),
    ).toBe(`/apps/${SLUG}/going-live`)
  })

  it('switched off again meanwhile (PROJECT_ARCHIVED): said the same way as everywhere', async () => {
    const st = stage({ deploy: [{ status: 409, code: 'PROJECT_ARCHIVED' }] })
    drawStudents(st)
    await press(w.students)
    expect(screen.getByRole('alert').textContent).toBe(words.refused.archived(LIVE.name))
  })
})
