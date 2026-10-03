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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stepUpHref } from '../../auth.js'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import type { Then } from '../../router.js'
import { words } from '../../words.js'
import { machineryIn } from '../machinery.js'
import { People } from './people.js'

/**
 * F6b TASK 6: *PEOPLE* (walk-through moment 18, design §2), against a recording `Platform`. Every
 * change is the person's own session, an owner's alone, behind the second sign-in; the platform
 * still decides. Asserted by what was sent, never by what a fake answered.
 */
const p = words.people
const SLUG = 'reading-responses'
const PROJECT: Schemas['Project'] = {
  ...fixtures.PROJECT,
  name: 'Reading responses',
  slug: SLUG,
}
const ME: Schemas['Me'] = { ...fixtures.ME, displayName: 'Alex Owner' }
const member = (
  userId: string,
  displayName: string,
  role: Schemas['Member']['role'],
  cwlLogin: string | null,
): Schemas['Member'] => ({
  userId,
  puid: `puid-${userId.slice(0, 4)}`,
  cwlLogin,
  displayName,
  email: `${displayName.split(' ')[0]!.toLowerCase()}@ubc.ca`,
  role,
})
const ALEX = member(ME.id, 'Alex Owner', 'owner', 'aowner')
const SAM = member(
  'c0000000-0000-4000-8000-000000000001',
  'Sam Helper',
  'collaborator',
  'shelper',
)
const DANA = member('c0000000-0000-4000-8000-000000000002', 'Dana Owner', 'owner', null)
const KEY = `manifest-app.people.${PROJECT.id}`
const refused = (status: number, code: string) =>
  new ManifestApiError(status, { error: { code, message: 'x' } } as never, 'test')
const never = () => new Promise<never>(() => undefined)

type Answer = 'ok' | 'never' | { status: number; code: string }

function stage(
  options: {
    members?: Schemas['Member'][]
    add?: Answer[]
    remove?: Answer[]
  } = {},
) {
  const calls: [string, ...unknown[]][] = []
  let members = options.members ?? [ALEX, SAM, DANA]
  const turns: Record<string, number> = {}
  const next = (name: 'add' | 'remove'): Answer => {
    const list = options[name] ?? ['ok']
    const turn = turns[name] ?? 0
    turns[name] = turn + 1
    return list[Math.min(turn, list.length - 1)]!
  }
  const answered = <T,>(said: Answer, value: () => T): Promise<T> =>
    said === 'never'
      ? never()
      : typeof said === 'object'
        ? Promise.reject(refused(said.status, said.code))
        : Promise.resolve(value())
  const platform = {
    listMembers: (projectId: string) => {
      calls.push(['listMembers', projectId])
      return Promise.resolve(members)
    },
    addMember: (projectId: string, body: Schemas['AddMemberRequest'], key: string) => {
      calls.push(['addMember', projectId, body, key])
      return answered(next('add'), () => ({ ...SAM, role: body.role }))
    },
    removeMember: (projectId: string, userId: string, key: string) => {
      calls.push(['removeMember', projectId, userId, key])
      return answered(next('remove'), () => {
        members = members.filter((m) => m.userId !== userId)
        return members
      })
    },
  } as unknown as Platform
  const expire = vi.fn()
  return {
    platform,
    expire,
    called: (name: string) => calls.filter((c) => c[0] === name).map((c) => c.slice(1)),
    setMembers: (next: Schemas['Member'][]) => void (members = next),
  }
}

/** Our server's watch, as `ensureWatch` reads it after a removal (the review's I5). */
const kept: [string, ...unknown[]][] = []
const OURS = {
  keeping: (projectId: string) => {
    kept.push(['keeping', projectId])
    return new Promise(() => undefined)
  },
  leave: (projectId: string) => {
    kept.push(['leave', projectId])
    return leaving()
  },
} as unknown as Ours
/** What our server answers a leave (the whole-branch review's I1). */
let leaving: () => Promise<void> = () => Promise.resolve()

function open(s: ReturnType<typeof stage>, then: Then = null, me = ME) {
  return render(
    <People
      platform={s.platform}
      ours={OURS}
      project={PROJECT}
      me={me}
      then={then}
      expire={s.expire}
    />,
  )
}

const press = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest('li') as HTMLElement
const text = () => document.body.textContent ?? ''

beforeEach(() => {
  sessionStorage.clear()
  kept.length = 0
})
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('the list (design §2)', () => {
  it('each member: name, email, CWL login when released, Owner or Helper, and (you) beside the reader', async () => {
    const s = stage()
    open(s)
    expect(
      await screen.findByRole('heading', { name: p.title(PROJECT.name) }),
    ).toBeTruthy()
    expect(screen.getByText(p.students)).toBeTruthy()
    const alex = within(await rowOf('Alex Owner'))
    expect(alex.getByText(p.you)).toBeTruthy()
    expect(alex.getByText(p.owner)).toBeTruthy()
    const sam = within(await rowOf('Sam Helper'))
    expect(sam.getByText(p.helper)).toBeTruthy()
    expect(sam.getByText('sam@ubc.ca', { exact: false })).toBeTruthy()
    expect(sam.getByText(p.login('shelper'), { exact: false })).toBeTruthy()
    expect(sam.queryByText(p.you)).toBeNull()
    // Dana's CWL login was never released: nothing is said of it.
    const dana = await rowOf('Dana Owner')
    expect(dana.textContent).not.toContain(p.login(''))
    expect(s.called('listMembers')).toEqual([[PROJECT.id]])
  })

  it('says the roles once, and no machinery', async () => {
    open(stage())
    await rowOf('Sam Helper')
    expect(screen.getAllByText(p.roles)).toHaveLength(1)
    expect(machineryIn(text())).toEqual([])
  })

  it('a helper reads why not: no field, no Make owner or helper, no Take off', async () => {
    const s = stage({ members: [{ ...ALEX, role: 'collaborator' }, SAM, DANA] })
    open(s)
    await rowOf('Sam Helper')
    expect(screen.getByText(p.helperOnly)).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: p.add.button })).toBeNull()
    expect(screen.queryByRole('button', { name: p.makeOwner })).toBeNull()
    expect(screen.queryByRole('button', { name: p.makeHelper })).toBeNull()
    expect(screen.queryByRole('button', { name: p.takeOff })).toBeNull()
  })

  it('a read that fails says so, and offers it again', async () => {
    const s = stage()
    let failing = true
    const listMembers = s.platform.listMembers
    s.platform.listMembers = (projectId) =>
      failing
        ? Promise.reject(refused(503, 'PLATFORM_UNAVAILABLE'))
        : listMembers(projectId)
    open(s)
    const retry = await screen.findByRole('button', { name: words.refused.button })
    failing = false
    await press(retry)
    expect(await rowOf('Sam Helper')).toBeTruthy()
  })
})

describe('adding someone, or changing their role (addMember)', () => {
  it('an @ sends an email, as a helper by default; the list is read again', async () => {
    const s = stage()
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), {
      target: { value: ' kim@ubc.ca ' },
    })
    await press(button(p.add.button))
    const [[projectId, body, key]] = s.called('addMember') as [
      [string, Schemas['AddMemberRequest'], string],
    ]
    expect([projectId, body]).toEqual([
      PROJECT.id,
      { email: 'kim@ubc.ca', role: 'collaborator' },
    ])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    await waitFor(() => expect(s.called('listMembers')).toHaveLength(2))
    // Added: the field is empty again.
    expect((screen.getByLabelText(p.add.field) as HTMLInputElement).value).toBe('')
  })

  it('anything else is a CWL login; Owner sends owner', async () => {
    const s = stage()
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), { target: { value: 'kchan' } })
    fireEvent.click(screen.getByRole('radio', { name: p.owner }))
    await press(button(p.add.button))
    expect(s.called('addMember')[0]![1]).toEqual({ cwlLogin: 'kchan', role: 'owner' })
  })

  it('nothing typed, nothing sent', async () => {
    const s = stage()
    open(s)
    await rowOf('Sam Helper')
    expect((button(p.add.button) as HTMLButtonElement).disabled).toBe(true)
    expect(s.called('addMember')).toEqual([])
  })

  it('Make owner on a helper’s row, Make helper on another owner’s: the same call, by their PUID; none on your own row', async () => {
    const s = stage()
    open(s)
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.makeOwner }),
    )
    await press(
      within(await rowOf('Dana Owner')).getByRole('button', { name: p.makeHelper }),
    )
    expect(s.called('addMember').map((c) => c[1])).toEqual([
      { puid: SAM.puid, role: 'owner' },
      { puid: DANA.puid, role: 'collaborator' },
    ])
    // Their own row: Take off alone (the design's way to hand it over: add an owner, then leave).
    const alex = within(await rowOf('Alex Owner'))
    expect(alex.getAllByRole('button').map((b) => b.textContent)).toEqual([p.takeOff])
  })
})

describe('taking someone off (removeMember)', () => {
  it('asked in place, then sent; their work on it said to have stopped, and the list read again', async () => {
    const s = stage()
    open(s)
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.takeOff }),
    )
    expect(screen.getByText(p.confirmTakeOff('Sam Helper', PROJECT.name))).toBeTruthy()
    expect(s.called('removeMember')).toEqual([])
    await press(button(p.takeOffConfirm))
    const [[projectId, userId, key]] = s.called('removeMember') as [
      [string, string, string],
    ]
    expect([projectId, userId]).toEqual([PROJECT.id, SAM.userId])
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(await screen.findByText(p.takenOff('Sam Helper', PROJECT.name))).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Sam Helper')).toBeNull())
    expect(s.called('listMembers')).toHaveLength(2)
  })

  it('Keep them: nothing is sent', async () => {
    const s = stage()
    open(s)
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.keep))
    expect(screen.queryByText(p.confirmTakeOff('Sam Helper', PROJECT.name))).toBeNull()
    expect(s.called('removeMember')).toEqual([])
  })
})

describe('the second sign-in (Decision 15)', () => {
  it('asked by the platform: what they typed is kept, and F5’s card sends them back to People', async () => {
    const s = stage({ add: [{ status: 403, code: 'STEP_UP_REQUIRED' }] })
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), {
      target: { value: 'kim@ubc.ca' },
    })
    fireEvent.click(screen.getByRole('radio', { name: p.owner }))
    await press(button(p.add.button))
    expect(JSON.parse(sessionStorage.getItem(KEY) ?? 'null')).toEqual({
      typed: 'kim@ubc.ca',
      role: 'owner',
    })
    const card = within(await screen.findByRole('alert'))
    expect(
      card.getByRole('link', { name: words.tryingOut.stepUp.again }).getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}/people?then=people`))
  })

  it('back: said so, the form as they left it, the storage removed, and nothing pressed by itself', async () => {
    sessionStorage.setItem(KEY, JSON.stringify({ typed: 'kim@ubc.ca', role: 'owner' }))
    const s = stage()
    open(s, 'people')
    await rowOf('Sam Helper')
    expect(screen.getByText(words.goingLive.letIn.again)).toBeTruthy()
    expect((screen.getByLabelText(p.add.field) as HTMLInputElement).value).toBe(
      'kim@ubc.ca',
    )
    expect(
      (screen.getByRole('radio', { name: p.owner }) as HTMLInputElement).checked,
    ).toBe(true)
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(s.called('addMember')).toEqual([])
  })

  it('a removal asked the second sign-in: the card, and back, pressed again by them', async () => {
    const s = stage({ remove: [{ status: 403, code: 'STEP_UP_REQUIRED' }] })
    open(s)
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.takeOffConfirm))
    expect(
      within(await screen.findByRole('alert'))
        .getByRole('link', { name: words.tryingOut.stepUp.again })
        .getAttribute('href'),
    ).toBe(stepUpHref(`/apps/${SLUG}/people?then=people`))
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })
})

describe('refusals, by code (design §2): each says what is still true', () => {
  it.each([
    ['MEMBER_USER_NOT_FOUND', 400],
    ['MEMBER_USER_AMBIGUOUS', 400],
    ['MEMBER_MAY_NOT_BUILD', 409],
  ] as const)('adding: %s', async (code, status) => {
    const s = stage({ add: [{ status, code }] })
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), {
      target: { value: 'kim@ubc.ca' },
    })
    await press(button(p.add.button))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(p.refused[code])
    // What they typed is still there.
    expect((screen.getByLabelText(p.add.field) as HTMLInputElement).value).toBe(
      'kim@ubc.ca',
    )
    expect(machineryIn(text())).toEqual([])
  })

  it('PROJECT_LAST_OWNER, making an owner a helper (the other owner left meanwhile)', async () => {
    const s = stage({ add: [{ status: 409, code: 'PROJECT_LAST_OWNER' }] })
    open(s)
    await press(
      within(await rowOf('Dana Owner')).getByRole('button', { name: p.makeHelper }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      p.refused.PROJECT_LAST_OWNER,
    )
  })

  it('PROJECT_LAST_OWNER, taking the last owner off', async () => {
    const s = stage({ remove: [{ status: 409, code: 'PROJECT_LAST_OWNER' }] })
    open(s)
    await press(
      within(await rowOf('Dana Owner')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.takeOffConfirm))
    expect((await screen.findByRole('alert')).textContent).toContain(
      p.refused.PROJECT_LAST_OWNER,
    )
  })

  it('switched off: said as every press says it', async () => {
    const s = stage({ add: [{ status: 409, code: 'PROJECT_ARCHIVED' }] })
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), { target: { value: 'kim' } })
    await press(button(p.add.button))
    expect((await screen.findByRole('alert')).textContent).toContain(
      words.refused.archived(PROJECT.name),
    )
  })

  it('anything else: we couldn’t, nothing has changed, and a support reference; the focus back on the button', async () => {
    const s = stage({ add: [{ status: 400, code: 'REQUEST_INVALID' }] })
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), { target: { value: 'kim@' } })
    await press(button(p.add.button))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(p.couldnt)
    expect(alert.textContent).toMatch(/[0-9A-F]{4}-[0-9A-F]{4}/)
    await waitFor(() => expect(document.activeElement).toBe(button(p.add.button)))
  })

  it('the session over: the shell’s to say', async () => {
    const s = stage({ add: [{ status: 401, code: 'UNAUTHENTICATED' }] })
    open(s)
    await rowOf('Sam Helper')
    fireEvent.change(screen.getByLabelText(p.add.field), { target: { value: 'kim' } })
    await press(button(p.add.button))
    expect(s.expire).toHaveBeenCalled()
  })
})

describe('the focus, and what each press is said to have done (the review’s I4)', () => {
  it('Keep them gives the focus back to Take off', async () => {
    open(stage())
    const sam = within(await rowOf('Sam Helper'))
    await press(sam.getByRole('button', { name: p.takeOff }))
    await press(button(p.keep))
    expect(document.activeElement).toBe(sam.getByRole('button', { name: p.takeOff }))
  })

  it('taken off: the focus on what is now true, a status already in the page', async () => {
    open(stage())
    const status = await screen.findByRole('status')
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.takeOffConfirm))
    await waitFor(() =>
      expect(status.textContent).toBe(p.takenOff('Sam Helper', PROJECT.name)),
    )
    expect(document.activeElement).toBe(status)
  })

  it('added, or a role changed: said in the status', async () => {
    const s = stage()
    open(s)
    const status = await screen.findByRole('status')
    fireEvent.change(screen.getByLabelText(p.add.field), { target: { value: 'kim' } })
    await press(button(p.add.button))
    await waitFor(() =>
      expect(status.textContent).toBe(p.added('Sam Helper', PROJECT.name)),
    )
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.makeOwner }),
    )
    await waitFor(() => expect(status.textContent).toBe(p.madeOwner('Sam Helper')))
  })

  it('a row’s press that did not go through: the focus back on its button', async () => {
    open(stage({ add: [{ status: 400, code: 'REQUEST_INVALID' }] }))
    const make = within(await rowOf('Sam Helper')).getByRole('button', {
      name: p.makeOwner,
    })
    await press(make)
    await screen.findByRole('alert')
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(screen.getByText('Sam Helper').closest('li')!).getByRole('button', {
          name: p.makeOwner,
        }),
      ),
    )
  })
})

describe('after taking someone off, our watch is looked at again (the review’s I5: FE-48’s page half)', () => {
  it('our server is asked whether it still watches the app', async () => {
    open(stage())
    await press(
      within(await rowOf('Sam Helper')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.takeOffConfirm))
    await waitFor(() => expect(kept).toEqual([['keeping', PROJECT.id]]))
  })
})

describe('an owner taking themselves off (the design’s hand-over: add an owner, then leave)', () => {
  it('asked in their words, sent with their own id, then Your apps', async () => {
    const s = stage()
    open(s)
    await press(
      within(await rowOf('Alex Owner')).getByRole('button', { name: p.takeOff }),
    )
    expect(screen.getByText(p.confirmLeave(PROJECT.name))).toBeTruthy()
    await press(button(p.leave))
    expect(s.called('removeMember').map((c) => c[1])).toEqual([ME.id])
    await waitFor(() => expect(window.location.pathname).toBe('/'))
  })

  it('our server told they left, before Your apps (the whole-branch review’s I1: no page of theirs hands our watch again)', async () => {
    kept.length = 0
    let told!: () => void
    leaving = () => new Promise<void>((resolve) => (told = resolve))
    window.history.pushState({}, '', '/apps/reading-responses/people')
    open(stage())
    await press(
      within(await rowOf('Alex Owner')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.leave))
    await waitFor(() => expect(kept).toEqual([['leave', PROJECT.id]]))
    expect(window.location.pathname).toBe('/apps/reading-responses/people')
    await act(async () => told())
    await waitFor(() => expect(window.location.pathname).toBe('/'))
    leaving = () => Promise.resolve()
  })

  it('our server could not be told: Your apps all the same (the platform has them off)', async () => {
    leaving = () => Promise.reject(new Error('no'))
    window.history.pushState({}, '', '/apps/reading-responses/people')
    open(stage())
    await press(
      within(await rowOf('Alex Owner')).getByRole('button', { name: p.takeOff }),
    )
    await press(button(p.leave))
    await waitFor(() => expect(window.location.pathname).toBe('/'))
    leaving = () => Promise.resolve()
  })
})
