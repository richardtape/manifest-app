# F4a — Only Faculty Build: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read [`../ORIENTATION.md`](../ORIENTATION.md) first.**

**Status: approved by Rich, 2026-09-29** (*"yes plan is good"*). **Its start and method confirmed by Rich, 2026-10-01
(04:40Z)**, to `manifest-app-4d`: native (superpowers:executing-plans, one agent, then one fresh whole-branch reviewer),
as recommended, *"you can start work on that when you know the other agent is finished"*: **it starts when the
platform's 5a session (`manifest-74`) says 5a has closed**, beside the platform's sitting 6 (`manifest-92`, at Rich's
word). Task 4's walk on 7100 asks the sitting 6 session for a window first (no Vitest, no control-plane restart). It waits on the platform: **FE-39**, carried by Rich the same day,
and in the platform's launch-path plan as its Task 8a (sitting 5a, Spec action 7; manifest `3f20f83`), confirmed by
Rich there (`e46df38`: builders are exactly the `faculty` affiliation, or an administrator's PUID). **Nothing here is built before the platform's contract answers
`Me.mayBuild`.** The names this plan uses are the ones the platform proposed; Task 1 reads what actually landed and
corrects Tasks 2–4 to it.

**Goal:** Someone who may not build (not faculty, not an administrator) and has no apps sees *"Manifest isn't
available to you at the moment"* wherever they arrive. Someone who stopped being faculty keeps working on their apps
but starts nothing new. Faculty and administrators go on as today.

**Architecture:**
- **The platform decides** (FE-39): faculty by CWL's `eduPersonAffiliation`, administrators by a list of PUIDs in its
  settings. It refuses `createProject` and `startIntakeSession` (`403 BUILDING_NOT_OPEN`) and `addMember` to someone
  who may not build (`409 MEMBER_MAY_NOT_BUILD`), and `getMe` answers `mayBuild`. **This plan only follows it.**
- **Our server** reads the decision where it already learns who it serves (`identity.ts`, FE-2's one use of the
  session), and refuses **starting something new** (`POST /api/conversations`) with the same code, before any platform
  call. A change on an app they keep goes on as before: the platform keeps their memberships and tokens (Rich).
- **The page** reads `mayBuild` from `getMe`. For someone who may not build it asks `listProjects` once, for whether
  they keep apps: none, the *not available* screen in place of every page; some, the shell without *Start something
  new*, and `/new` saying the same two sentences in the page. A refusal met part-way makes the page read `getMe` again.

**Tech Stack:** as F4: TypeScript 5, Node 24, Fastify 5, React 19, Vite, Vitest 2.1.9. **No new dependency.**

**Spec:**
- [`../walkthrough.md`](../walkthrough.md): **D7**, moment 1's *Someone who isn't faculty*, and moment 18's note;
- [`../api-findings.md`](../api-findings.md): **FE-39**, with the platform's proposed shape and Rich's two decisions;
- manifest's `packages/contract/openapi.json` as it lands (read-only, as ever).

---

## How this plan is executed: one sitting, when FE-39 lands

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1–4 | What landed, read; our server's refusal of a new start; the *not available* screen, and the shell for someone who keeps apps; walked against the mock and on the real platform at Rich's word; Rich's click | **waits on FE-39** (the platform's sitting 5a; it messages us at the contract commit that adds `mayBuild`) |

The sitting ends as F4's did: the four gates, `pnpm test` twice; the four acceptance scripts in mock mode; a dated entry
in *What executing this plan found*; this table; ORIENTATION's *Where things stand*, replaced; the roadmap.

## Decided by Rich (2026-09-29): build them, do not re-open them

- *"This should be available to all members of faculty (using the associated CWL role). For everyone else (save for a
  prescribed list of admins), they should see a screen telling them that it isn't available for them at the moment."*
- *"the platform, because this would then also work for agentic use"*: the rule is the platform's; our screens follow
  it.
- *"Faculty members should be able to add other faculty members for now. Perhaps in the future they should be able to
  add TAs"*: moment 18's words wait for F6's *People*, which this plan does not build.
- **Administrators by PUID** (the platform's recommendation: a CWL login can be reassigned).
- **Someone who stops being faculty keeps their apps, and starts nothing new** (the platform's recommendation: a
  course app mid-term keeps its owner).

### Words proposed for Rich

| Where | Words |
|---|---|
| The screen's heading ✓ (proposed in the design, approved with it) | **"Manifest isn't available to you at the moment."** |
| Under it ✓ | *"It's open to UBC faculty for now."* |
| Under that, ours, on the screen alone | *"You're signed in as <their name>."* (so someone signed in with the wrong account can tell) |
| The button | **[Sign out]** (the shell's `words.signOut.button`); if it fails, the shell's *"We couldn't sign you out. Close the browser to be sure."* |
| `/new` for someone who keeps apps | the heading and *"It's open to UBC faculty for now."*, in the page, beside the rail |

**For Rich at Task 1 (the platform's 5a fix wave, manifest `42cd8c5`, relayed by `manifest-74`):** the platform reads the
CWL affiliation **at sign-in**, so a faculty member signed in before 5a has none recorded, and `getMe` answers
`mayBuild: false` until they sign in again; `BUILDING_NOT_OPEN`'s hint now leads with *sign out and sign in again*. As
proposed above, our screen would tell that faculty member Manifest is not open to them. **Proposed:** a line above
**[Sign out]**, *"If you're UBC faculty, sign out and sign in again."* (the words his). Rich's own session on 7100
predates 5a: his click meets this first.

## Global Constraints

- Everything in F1–F4's *Global Constraints* stands.
- **The rule is the platform's.** We read one decision, `Me.mayBuild`, and never re-derive it (no affiliation, no list
  of names of ours).
- **Until the platform ships it, nothing changes**: a `getMe` without `mayBuild` is someone who may build.
- **C3, and five states**: the screen names no infrastructure (`machineryIn` empty) and is still, in the *not yet*
  tone: nobody is working on anything, nothing is wrong.
- **Accessibility**: one `<h1>`, a real `<button>` for *Sign out*, visible focus.
- **For someone who may not build, the page asks `getMe`, then `listProjects`, and nothing else until it knows.**
- **Our server refuses only a new start.** Everything on an app someone keeps goes on as before.

## Review Focus

1. **A `getMe` from before FE-39** (no `mayBuild`): everyone builds as today, never the screen by accident. **Pinned
   in Task 3.**
2. **Someone who stopped being faculty, and keeps apps**: *Your apps* with their apps and no *Start something new*;
   `/new` says the two sentences; an app's own pages, and a change on it, go on. **Pinned in Tasks 2 and 3.**
3. **Refused part-way** (their faculty status changed since they signed in): a platform call or one of ours answers
   `BUILDING_NOT_OPEN`, and the page reads `getMe` again and follows, never an error card. **Pinned in Task 3.**
4. **Any address, with no apps**: `/`, `/new`, `/apps/x`, `/apps/x/conversations/y`, `/profile`, `/nowhere` all show
   the screen, and the address stays as typed. **Pinned in Task 3.**
5. **`listProjects` fails for someone who may not build**: moment 2's *"We can't reach Manifest just now…"* with
   **[Try again]**, never the screen by guess. **Pinned in Task 3.**

---

## File Structure

```
packages/server/src/
  identity.ts             Person gains mayBuild (FE-39's decision, as getMe answered it)     Task 2
  identity.test.ts        what leaves whoIs: id, displayName, mayBuild                        Task 2
  api/conversations.ts    POST /api/conversations: 403 BUILDING_NOT_OPEN for them            Task 2
  api/conversations.test.ts   refused and nothing made; faculty as before                    Task 2
  api/apps.test.ts        a change on an app they keep is not refused by it                  Task 2
  api/testing.ts          CAROL, who may not build; getMe answers mayBuild for each person   Task 2
packages/web/src/
  not-open.ts             the refusal's code, and a signal the shell listens to              Task 3
  not-open.test.ts        a platform call and one of ours refused with the code raise it    Task 3
  platform/api.ts         its fetch raises the signal on the code                            Task 3
  ours/api.ts             call() raises the signal on the code                               Task 3
  session.ts              reads getMe again on the signal                                    Task 3
  screens/keeps.ts        useKeeps: for someone who may not build, whether they keep apps   Task 3
  screens/brand.tsx       the mark, from sign-in.tsx, shared                                 Task 3
  screens/sign-in.tsx     uses Brand                                                         Task 3
  screens/not-open.tsx    NotOpen (the screen) and NotOpenHere (/new, in the page)           Task 3
  app.tsx                 the screen, or the shell without Start something new              Task 3
  words.ts                notOpen                                                            Task 3
  screens/screens.test.tsx   every address, keeps apps, the old shape, sign-out, part-way   Task 3
```

---

## Task 1: What landed (read, then correct Tasks 2–4)

**Files:** none of ours changes. Read-only: manifest's `packages/contract/openapi.json`, its mock, its guides.

- [ ] **Step 1: Re-read the contract.** Record in the ledger:
  - `Me.mayBuild`: its type, and whether it is required;
  - what `createProject` and `startIntakeSession` answer someone who may not build (proposed `403 BUILDING_NOT_OPEN`),
    and `addMember` (proposed `409 MEMBER_MAY_NOT_BUILD`), and which operations declare them;
  - the mock's switch (proposed `MANIFEST_MOCK_MAY_BUILD=0`) and what it answers;
  - on the laptop, who may build (proposed: `instructor` and `colleague`; not `student`, not `operator`).

  Run: `node -e 'const o=require("/Users/rich/Developer/manifest/packages/contract/openapi.json"); console.log(o.info.version, JSON.stringify(o.components.schemas.Me.properties.mayBuild))'`
  Expected: `{"type":"boolean",…}` (not `undefined`).

- [ ] **Step 2: Correct Tasks 2–4 to what landed.** Each name that differs, replaced by the landed one, each correction
  marked **(S1)**. If the decision is not a boolean, rule on the smallest reading that keeps *"one decision, read,
  never re-derived"*, and ledger it.

- [ ] **Step 3: The gates against it.**

  Run: `pnpm typecheck && pnpm test`
  Expected: PASS (the field is new, and nothing reads it yet).

- [ ] **Step 4: Commit the corrected plan.**

```bash
git add docs/plans/2026-09-29-f4a-only-faculty-build.md
git commit -m "docs: F4a sitting 1 — FE-39 as it landed; Tasks 2–4 corrected (S1)"
```

---

## Task 2: Our server refuses a new start to someone who may not build

**Files:**
- Modify: `packages/server/src/identity.ts`, `packages/server/src/api/conversations.ts`,
  `packages/server/src/api/testing.ts`
- Test: `packages/server/src/identity.test.ts`, `packages/server/src/api/conversations.test.ts`,
  `packages/server/src/api/apps.test.ts`

**Interfaces:**
- Consumes: `Schemas['Me']['mayBuild']` (Task 1).
- Produces: `Person = { id: string; displayName: string; mayBuild: boolean }`; `POST /api/conversations` answers
  `403 { error: { code: 'BUILDING_NOT_OPEN' } }` to a person with `mayBuild: false`, and keeps nothing.
  `api/testing.ts` exports `CAROL` and `AS_CAROL`.

- [ ] **Step 1: A person who may not build, in the fake control plane.** In `api/testing.ts`, beside `ALICE` and `BOB`:

```ts
export const CAROL = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  displayName: 'Carol Student',
}
```

  Add `'carol-session': CAROL` to `SESSIONS`, `export const AS_CAROL = 'manifest_session=carol-session'`, and answer
  `/v1/me` with the decision for each (only Carol may not build):

```ts
      response.end(
        JSON.stringify({
          ...person,
          puid: 'x',
          email: 'x@example.test',
          role: 'member',
          mayBuild: person !== CAROL,
        }),
      )
```

- [ ] **Step 2: Write the failing identity tests.** In `identity.test.ts`, give `ME` `mayBuild: true`; give
  `fakeControlPlane(status)`, `fake(status)` and `everyCase(session)` an optional last argument `me = ME`, the `Me` a
  `200` answers, each passing it on; and the test *"only id and displayName leave it: never email or puid"* becomes:

```ts
  it('only id, displayName and the decision leave it: never email or puid', async () => {
    const { person } = await everyCase('S')
    expect(Object.keys(person ?? {}).sort()).toEqual(['displayName', 'id', 'mayBuild'])
  })

  it('the decision is the platform’s, as it answered it (FE-39)', async () => {
    const { person } = await everyCase('S', { ...ME, mayBuild: false })
    expect(person?.mayBuild).toBe(false)
  })
```

- [ ] **Step 3: Write the failing route tests.** In `conversations.test.ts`, import `AS_CAROL`, and in
  `describe('POST /api/conversations')`:

```ts
  it('someone who may not build is 403 BUILDING_NOT_OPEN, and nothing is made (D7, FE-39)', async () => {
    const { base, file } = await serve()
    const response = await start(base, { description: WORDS }, { cookie: AS_CAROL })
    expect([response.status, await response.json()]).toEqual([
      403,
      { error: { code: 'BUILDING_NOT_OPEN' } },
    ])
    expect(count(file)).toBe(0)
  })
```

  In `apps.test.ts`, beside *"Ask for a change"*'s tests, a change on an app Carol keeps is judged as anyone's (the
  token check), never refused by the decision:

```ts
  it('someone who may not build, on an app they keep, is not refused by it: the token is checked as for anyone (D7)', async () => {
    const s = setUp()
    const response = await s.ask(
      { words: 'Show the date on each response', token: 'mft_not_for_this' },
      { cookie: AS_CAROL },
    )
    expect(response.json()).not.toEqual({ error: { code: 'BUILDING_NOT_OPEN' } })
  })
```

- [ ] **Step 4: Run them to see them fail.**

  Run: `pnpm vitest run --project server packages/server/src/identity.test.ts packages/server/src/api/conversations.test.ts packages/server/src/api/apps.test.ts`
  Expected: FAIL: the keys lack `mayBuild`; Carol's start answers 201.

- [ ] **Step 5: The decision leaves `whoIs`.** In `identity.ts`:

```ts
/** Who we serve, and whether they may build (FE-39: the platform's decision, never ours). */
export type Person = { id: string; displayName: string; mayBuild: boolean }
```

  and in `whoIs`: `return { id: me.id, displayName: me.displayName, mayBuild: me.mayBuild }`.

- [ ] **Step 6: The start refuses them.** In `api/conversations.ts`, in `POST /api/conversations`, after the guard:

```ts
      // D7 (FE-39): someone who may not build starts nothing new here, before the platform
      // would refuse their intake. An app they keep goes on as before (Rich).
      if (!who.person.mayBuild)
        return reply.code(403).send({ error: { code: 'BUILDING_NOT_OPEN' } })
```

- [ ] **Step 7: Run them to see them pass, then the whole suite.**

  Run: `pnpm vitest run --project server packages/server/src/identity.test.ts packages/server/src/api/conversations.test.ts packages/server/src/api/apps.test.ts && pnpm test`
  Expected: PASS. Every other test uses `ALICE` or `BOB`, who may build.

- [ ] **Step 8: Negative control.** Remove Step 6's `if`: the route test goes red; restore it.

- [ ] **Step 9: Commit.**

```bash
git add packages/server/src/identity.ts packages/server/src/identity.test.ts packages/server/src/api/conversations.ts packages/server/src/api/conversations.test.ts packages/server/src/api/apps.test.ts packages/server/src/api/testing.ts
git commit -m "feat(server): someone who may not build starts nothing new here (D7, FE-39): 403 BUILDING_NOT_OPEN"
```

---

## Task 3: The *not available* screen, and the shell for someone who keeps apps

**Files:**
- Create: `packages/web/src/not-open.ts`, `packages/web/src/not-open.test.ts`, `packages/web/src/screens/keeps.ts`,
  `packages/web/src/screens/brand.tsx`, `packages/web/src/screens/not-open.tsx`
- Modify: `packages/web/src/platform/api.ts`, `packages/web/src/ours/api.ts`, `packages/web/src/session.ts`,
  `packages/web/src/screens/sign-in.tsx`, `packages/web/src/app.tsx`, `packages/web/src/words.ts`
- Test: `packages/web/src/screens/screens.test.tsx`, `packages/web/src/not-open.test.ts`

**Interfaces:**
- Consumes: `Schemas['Me']['mayBuild']` (Task 1); our server's `403 BUILDING_NOT_OPEN` (Task 2); `mine(projects,
  me)` from `screens/your-apps/model.ts` (the person's own apps, as *Your apps* keeps them).
- Produces: `NOT_OPEN_CODE`, `notOpen` (an `EventTarget`), `noticeRefusal(code: unknown): void` in `not-open.ts`;
  `useKeeps(platform, me, expire): Keeps` in `screens/keeps.ts`, where
  `Keeps = { state: 'builds' } | { state: 'loading' } | { state: 'none' } | { state: 'some' } | { state: 'trouble'; trouble: Trouble; retry: () => void }`;
  `<NotOpen name />`, `<NotOpenHere />`, `<Brand />`; `words.notOpen`.

- [ ] **Step 1: The words.** In `words.ts`, beside `signOut`:

```ts
  /** D7 (Rich, 2026-09-29): someone who may not build. */
  notOpen: {
    title: "Manifest isn't available to you at the moment.",
    body: "It's open to UBC faculty for now.",
    /** Ours: so someone signed in with the wrong account can tell. The screen alone. */
    who: (name: string) => `You're signed in as ${name}.`,
  },
```

- [ ] **Step 2: Write the failing signal test.** `not-open.test.ts` (node: the platform's tests never run in jsdom):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOT_OPEN_CODE, notOpen } from './not-open.js'
import { createOurs } from './ours/api.js'
import { createPlatform } from './platform/api.js'

const refusedWith = (code: string) =>
  new Response(JSON.stringify({ error: { code, message: 'x' } }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  })

const heard = vi.fn()
notOpen.addEventListener('refused', heard)
afterEach(() => {
  heard.mockClear()
  vi.unstubAllGlobals()
})

describe('a refusal because they may not build is heard by the shell (D7, FE-39)', () => {
  it('from the platform: its fetch raises the signal, and the call still rejects', async () => {
    vi.stubGlobal('fetch', async () => refusedWith(NOT_OPEN_CODE))
    const platform = createPlatform({ origin: 'http://127.0.0.1:1', session: 's' })
    await expect(platform.startIntakeSession('key-1')).rejects.toBeTruthy()
    await vi.waitFor(() => expect(heard).toHaveBeenCalledTimes(1))
  })

  it('from our server: call() raises it too', async () => {
    vi.stubGlobal('fetch', async () => refusedWith(NOT_OPEN_CODE))
    await expect(createOurs().startConversation('words')).rejects.toBeTruthy()
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('any other refusal raises nothing', async () => {
    vi.stubGlobal('fetch', async () => refusedWith('FORBIDDEN'))
    await expect(createOurs().startConversation('words')).rejects.toBeTruthy()
    expect(heard).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run it to see it fail.**

  Run: `pnpm vitest run --project web packages/web/src/not-open.test.ts`
  Expected: FAIL: `./not-open.js` does not exist.

- [ ] **Step 4: The signal.** `not-open.ts`:

```ts
/**
 * D7 (FE-39): SOMEONE WHO MAY NOT BUILD. The platform decides, and says so in `getMe`; a call
 * refused part-way (their faculty status changed since they signed in) says so by this code,
 * from the platform or from our server. Every such refusal is heard here, and the shell reads
 * `getMe` again, so the page follows the platform's decision and never shows it as an error.
 */
export const NOT_OPEN_CODE = 'BUILDING_NOT_OPEN'

/** The shell listens for `refused`. An EventTarget of its own: it works in node's tests too. */
export const notOpen = new EventTarget()

export function noticeRefusal(code: unknown): void {
  if (code === NOT_OPEN_CODE) notOpen.dispatchEvent(new Event('refused'))
}
```

- [ ] **Step 5: Both callers raise it.**
  - `platform/api.ts`, in `clientWith`'s `fetch`, read a `403`'s code from a copy of the answer, and leave the answer
    itself to `unwrap`:

```ts
      fetch: async (request) => {
        const response = await globalThis.fetch(request, {
          signal: AbortSignal.timeout(deadline),
        })
        if (response.status === 403)
          void response
            .clone()
            .json()
            .then((body: { error?: { code?: unknown } }) => noticeRefusal(body?.error?.code))
            .catch(() => undefined)
        return response
      },
```

  - `ours/api.ts`, in `call()`, where a refusal's `code` is read, before `throw new OurRefusal(...)`:
    `noticeRefusal(code)`.

- [ ] **Step 6: Run it to see it pass.**

  Run: `pnpm vitest run --project web packages/web/src/not-open.test.ts`
  Expected: PASS.

- [ ] **Step 7: Write the failing screen tests.** In `screens.test.tsx`: give `ME` `mayBuild: true`; import `notOpen`
  from `'../not-open.js'` and `fixtures` (already imported) for a project; and add:

```ts
const STUDENT: Schemas['Me'] = {
  id: '22222222-2222-4222-8222-222222222222',
  puid: 'stu000001',
  displayName: 'Student One',
  email: 'student@example.test',
  role: 'member',
  mayBuild: false,
}
/** Someone who stopped being faculty, and owns an app (Rich: they keep it, and start nothing new). */
const LAPSED: Schemas['Me'] = { ...ME, mayBuild: false }

describe('someone who may not build, with no apps (D7, FE-39)', () => {
  it.each(['/', '/new', '/apps/x', '/apps/x/conversations/y', '/profile', '/nowhere'])(
    'at %s: the screen, their name, Sign out, no rail, the address kept',
    async (path) => {
      window.history.pushState({}, '', path)
      const listProjects = vi.fn(() => Promise.resolve([]))
      const getProject = vi.fn(() => new Promise<never>(() => undefined))
      render(
        <App platform={platform({ getMe: () => Promise.resolve(STUDENT), listProjects, getProject })} />,
      )
      expect(
        await screen.findByRole('heading', { level: 1, name: words.notOpen.title }),
      ).toBeTruthy()
      expect(screen.getByText(words.notOpen.body)).toBeTruthy()
      expect(screen.getByText(words.notOpen.who('Student One'))).toBeTruthy()
      expect(screen.getByRole('button', { name: words.signOut.button })).toBeTruthy()
      expect(screen.queryByRole('navigation', { name: 'Manifest' })).toBeNull()
      expect(listProjects).toHaveBeenCalledTimes(1)
      expect(getProject).not.toHaveBeenCalled()
      expect(window.location.pathname).toBe(path)
      expect(machineryIn(document.body.textContent ?? '')).toEqual([])
      await waitFor(() => expect(document.title).toBe(words.shell.manifest))
      cleanup()
    },
  )

  it('Sign out POSTs, and a refusal says so on the same screen', async () => {
    const posts: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      posts.push(url)
      return new Response('', { status: 500 })
    })
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(STUDENT),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: words.signOut.button }))
    })
    expect(await screen.findByText(words.signOut.failed)).toBeTruthy()
    expect(posts).toEqual(['/auth/logout'])
    expect(screen.getByText(words.notOpen.title)).toBeTruthy()
  })

  it('listProjects fails: moment 2’s words and Try again, never the screen by guess', async () => {
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(STUDENT),
          listProjects: () => Promise.reject(new TypeError('no network')),
        })}
      />,
    )
    expect(await screen.findByText(words.unreachable.body)).toBeTruthy()
    expect(screen.getByRole('button', { name: words.unreachable.button })).toBeTruthy()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })
})

describe('someone who stopped being faculty, and keeps apps (D7: they start nothing new)', () => {
  it('Your apps, with their app, and no Start something new', async () => {
    const mineToo = { ...fixtures.PROJECT, owner: { id: LAPSED.id, displayName: LAPSED.displayName } }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(LAPSED),
          listProjects: () => Promise.resolve([mineToo]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    expect(within(rail).queryByText(words.shell.startNew)).toBeNull()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('/new says the two sentences, in the page, beside the rail', async () => {
    window.history.pushState({}, '', '/new')
    const mineToo = { ...fixtures.PROJECT, owner: { id: LAPSED.id, displayName: LAPSED.displayName } }
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(LAPSED),
          listProjects: () => Promise.resolve([mineToo]),
        })}
      />,
    )
    const main = await screen.findByRole('main')
    expect(await within(main).findByRole('heading', { level: 1, name: words.notOpen.title })).toBeTruthy()
    expect(within(main).getByText(words.notOpen.body)).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Manifest' })).toBeTruthy()
    expect(document.querySelector('#describe-words')).toBeNull()
  })
})

describe('the decision, as it arrives (FE-39)', () => {
  it('a getMe from before FE-39, with no mayBuild in it, builds as today', async () => {
    const { mayBuild: _, ...before } = ME
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(before as Schemas['Me']),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    const rail = await screen.findByRole('navigation', { name: 'Manifest' })
    expect(within(rail).getByText(words.shell.startNew)).toBeTruthy()
    expect(screen.queryByText(words.notOpen.title)).toBeNull()
  })

  it('refused part-way: the signal reads getMe again, and the screen follows, never an error', async () => {
    let asked = 0
    render(
      <App
        platform={platform({
          getMe: () => Promise.resolve(++asked === 1 ? ME : STUDENT),
          listProjects: () => Promise.resolve([]),
        })}
      />,
    )
    await screen.findByRole('navigation', { name: 'Manifest' })
    await act(async () => {
      notOpen.dispatchEvent(new Event('refused'))
    })
    expect(await screen.findByText(words.notOpen.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(asked).toBe(2)
  })
})
```

  (`fixtures.PROJECT` is the mock's project, as this file's *Your apps* tests use it; if they name it otherwise, use
  that.)

- [ ] **Step 8: Run them to see them fail.**

  Run: `pnpm vitest run --project web packages/web/src/screens/screens.test.tsx`
  Expected: FAIL: no heading *"Manifest isn't available to you at the moment."*

- [ ] **Step 9: Whether they keep apps.** `screens/keeps.ts`:

```ts
import type { Schemas } from '@manifest/contract'
import { useCallback, useEffect, useState } from 'react'
import type { Platform } from '../platform/api.js'
import { refusalOf } from '../platform/refusal.js'
import type { Trouble } from './trouble.js'
import { mine } from './your-apps/model.js'

/**
 * D7 (Rich, 2026-09-29): SOMEONE WHO MAY NOT BUILD KEEPS THE APPS THEY HAVE, and starts nothing
 * new. Whether they keep any is one `listProjects`, as *Your apps* reads it; someone who may build
 * is never asked it here.
 */
export type Keeps =
  | { state: 'builds' }
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'some' }
  | { state: 'trouble'; trouble: Trouble; retry: () => void }

export function useKeeps(
  platform: Platform,
  me: Schemas['Me'] | undefined,
  expire: () => void,
): Keeps {
  const may = me === undefined || me.mayBuild !== false
  const [kept, setKept] = useState<Keeps>({ state: may ? 'builds' : 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  useEffect(() => {
    if (may || me === undefined) {
      setKept({ state: 'builds' })
      return
    }
    let live = true
    setKept({ state: 'loading' })
    platform.listProjects().then(
      (projects) => live && setKept({ state: mine(projects, me).length > 0 ? 'some' : 'none' }),
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') return expire()
        setKept({
          state: 'trouble',
          trouble:
            refusal.kind === 'refused'
              ? { kind: 'refused', code: refusal.code, status: refusal.status }
              : { kind: 'unreachable' },
          retry,
        })
      },
    )
    return () => {
      live = false
    }
  }, [platform, me, may, expire, attempt, retry])
  return kept
}
```

  (`Trouble` is `trouble.tsx`'s own exported type for `TroubleNotice`.)

- [ ] **Step 10: The shared mark.** `screens/brand.tsx` takes `sign-in.tsx`'s `<div className="signin__mark">` block
  whole (its `svg`, *Manifest*, the bar and *UBC*) as `export function Brand()`, and `sign-in.tsx` uses `<Brand />` in
  its place. Its tests stay green (the markup is the same).

- [ ] **Step 11: The screen, and its sentences in the page.** `screens/not-open.tsx`:

```tsx
import { Button, Card } from '@manifest-app/ui'
import { useState } from 'react'
import { signOut } from '../auth.js'
import { words } from '../words.js'
import { Brand } from './brand.js'

/**
 * D7 (Rich, 2026-09-29): SOMEONE WHO MAY NOT BUILD, with no apps, wherever they arrive. The
 * platform decides (FE-39); this screen only says so. Sign-in's layout, the other screen with no
 * rail, and still: nobody is working on anything, and nothing is wrong.
 */
export function NotOpen({ name }: { name: string }) {
  const [failed, setFailed] = useState(false)
  const w = words.notOpen
  return (
    <div className="signin">
      <div className="signin__brand">
        <Brand />
      </div>
      <main className="signin__form" id="main" tabIndex={-1}>
        <h1 className="moment">{w.title}</h1>
        <p className="body-lead">{w.body}</p>
        <p className="body-lead signin__muted">{w.who(name)}</p>
        {failed ? (
          <div role="alert">
            <Card tone="attention">
              <p className="body-lead">{words.signOut.failed}</p>
            </Card>
          </div>
        ) : null}
        <Button
          kind="secondary"
          onClick={() => {
            setFailed(false)
            signOut().catch(() => setFailed(true))
          }}
        >
          {words.signOut.button}
        </Button>
      </main>
    </div>
  )
}

/** The same two sentences in the page, for someone who keeps apps and goes to `/new`. */
export function NotOpenHere() {
  return (
    <>
      <h1 className="page-title">{words.notOpen.title}</h1>
      <p className="body-lead">{words.notOpen.body}</p>
    </>
  )
}
```

- [ ] **Step 12: The session follows the signal.** In `session.ts`, beside the `getMe` effect:

```ts
  // D7 (FE-39): a refusal met part-way reads who they are again (not-open.ts). The page stays as
  // it is until getMe answers: no `loading`, which would blank it.
  useEffect(() => {
    const again = () => setAttempt((n) => n + 1)
    notOpen.addEventListener('refused', again)
    return () => notOpen.removeEventListener('refused', again)
  }, [])
```

- [ ] **Step 13: The shell draws it.** In `app.tsx`:
  - `const me = signedIn ? session.me : undefined` and `const keeps = useKeeps(platform, me, expire)` beside
    `signedIn`; `const builds = keeps.state === 'builds'`;
  - `useApp(platform, signedIn && (builds || keeps.state === 'some') ? slug : undefined, expire)`, so nothing is
    looked up for someone who keeps nothing;
  - `document.title`: `words.shell.manifest` when `keeps.state === 'none'`;
  - after the `unreachable`/`refused` branch:

```tsx
  if (keeps.state === 'loading') return null
  if (keeps.state === 'trouble')
    return (
      <main className="app-alone">
        <TroubleNotice trouble={keeps.trouble} onRetry={keeps.retry} />
      </main>
    )
  if (keeps.state === 'none') return <NotOpen name={session.me.displayName} />
```

  - `SideNav`'s `newLabel`: `builds ? words.shell.startNew : null`;
  - the page for `route.name === 'new'`, or `'conversation'` with no `slug` (a first build): `<NotOpenHere />` when
    `!builds`, and `Describing` as before otherwise.

- [ ] **Step 14: Run them to see them pass, then the whole suite.**

  Run: `pnpm vitest run --project web packages/web/src/screens/screens.test.tsx && pnpm test`
  Expected: PASS.

- [ ] **Step 15: Negative controls, each red then restored:** the shell's `keeps.state === 'none'` branch removed (the
  six addresses red); `newLabel` always `startNew` (the lapsed rail red); `session.ts`'s listener removed (part-way
  red); `noticeRefusal` removed from `ours/api.ts` (the signal test red); `useKeeps` answering `none` on a failed read
  (the trouble test red).

- [ ] **Step 16: Commit.**

```bash
git add packages/web/src/not-open.ts packages/web/src/not-open.test.ts packages/web/src/platform/api.ts packages/web/src/ours/api.ts packages/web/src/session.ts packages/web/src/screens/keeps.ts packages/web/src/screens/brand.tsx packages/web/src/screens/sign-in.tsx packages/web/src/screens/not-open.tsx packages/web/src/app.tsx packages/web/src/words.ts packages/web/src/screens/screens.test.tsx
git commit -m "feat(web): someone who may not build sees \"Manifest isn't available to you at the moment\"; someone who keeps apps starts nothing new (D7, FE-39)"
```

---

## Task 4: The acceptance, and the close

**Files:** none of the product's. The walk is in the session's scratchpad.

- [ ] **Step 1: Against the mock, both ways.** Stop our mock on 7102 (§7's trap: its whole process tree), start it
  with the platform's switch (Task 1's name: `MANIFEST_MOCK_MAY_BUILD=0 pnpm mock`), and:
  - `curl` our API as the mock's session (`manifest_session=mock-session`): `POST /api/conversations` with our
    `Origin` → `403 {"error":{"code":"BUILDING_NOT_OPEN"}}`; `GET /api/me` → `200`;
  - walk in headless Chrome at 1440 and 375 (a fresh profile; Chrome stopped on exit). The mock's one project is the
    person's, so this is the *keeps apps* case: *Your apps* with no *Start something new*; `/new` the two sentences;
    the app's Preview as before; no overflow; *Sign out* reached by the keyboard.
  Restart the mock without the switch, and run the four acceptance scripts: 8, 18, 12, 8 (`check-seeing.sh` first).

- [ ] **Step 2: On the real platform, at Rich's word only.** 7100 is on real GitHub (driver 2): **create nothing.**
  Tell the platform session first. Our server in edge mode:
  - sign in as `student`: the screen, verbatim; *Sign out*;
  - sign in as `instructor`: *Your apps*, *Start something new* there.

- [ ] **Step 3: Rich's click**, as `student` and as `instructor`.

- [ ] **Step 4: The close.** The gates, `pnpm test` twice; our server back in mock mode; the dated entry; this plan's
  table; ORIENTATION's *Where things stand*; the roadmap; `api-findings.md`'s FE-39 row (*built, ours*).

---

## What this plan does not build

- **Moment 18's faculty-only words**: F6 builds *People*, and says *"Only UBC faculty can work on apps for now, so we
  can't add them yet."* on the platform's `409 MEMBER_MAY_NOT_BUILD`.
- **TAs** (Rich: *"Perhaps in the future"*): a change to the platform's one predicate, and nothing of ours.
- **An administrator's screens**: administrators build as faculty do. The platform's admin console is the platform's.
- **Anything that decides who may build**: the platform's alone (FE-39).

## What executing this plan found

*The sitting adds a dated entry here: what landed, its rulings, its negative controls, and its gates.*
