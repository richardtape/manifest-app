# F1 — Foundations and the First Clickable Slice: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Read [`../ORIENTATION.md`](../ORIENTATION.md) first.**

**Goal:** A faculty member opens the front-end, signs in, and sees *Your apps*, drawn with the design system's real
components, fed only by the platform's API through its generated client, and served by our own server on port
7105. It runs against `manifest-mock` today, and against the real platform once its sitting 6 (the `app` origin)
lands.

**Architecture:**
- **One pnpm workspace, three packages:**
  - `ui`: the design system, ported from the prototype's compiled bundle to React 19 TSX, **markup-identical by
    test**;
  - `web`: the React single-page app; only `web/src/platform/` calls the API;
  - `server`: Fastify on 7105. It serves the app, owns `/api/*`, and in mock mode proxies `/v1` and `/auth` to the
    mock.
- **Our server learns who it serves** by replaying the session cookie to `GET /v1/me`, and for nothing else
  (FE-2, decided by Rich).

**Tech Stack:**
- Node **24.12.0**, pnpm **11.24.0**, TypeScript **5.9.3**.
- React **19.3.0** and Vite **8.3.0** with `@vitejs/plugin-react` **6.1.1**, the reference console's exact
  versions (already in the local store: C1).
- Vitest **2.1.x**, Fastify **5.12.3**, `@manifest/contract` **1.4.0** (the working tree, by `link:`), and
  `@manifest/mock` (the same way, dev only).
- New packages, fetched once with Rich's standing permission: `jsdom`, `@testing-library/react`, and the Fastify
  plugins Task 1 chooses. **Exact versions recorded in Task 2.**

**Spec** (this plan argues from these; read the ones a task names):
- [`../walkthrough.md`](../walkthrough.md): moments 1, 2 and 16, and *Throughout*;
- [`../api-findings.md`](../api-findings.md): FE-2, FE-10, FE-17, FE-18;
- manifest's `docs/superpowers/design/system/`: `README.md`, `10-language.md`, `20-states.md`, and
  `components/<Comp>/README.md`;
- the platform spec §20 (*front door*), §21 (*The front-end in the local topology*), §22 (D23);
- manifest's `packages/console/src/{api,auth,stream}.ts`, the pattern for every call.

**Roadmap:** [`roadmap.md`](./roadmap.md). F1 is first, and F2 (describing it) follows.

---

## How this plan is executed: sittings, one per session

| Sitting | Tasks | Delivers | Status |
|---|---|---|---|
| 1 | 1 | **The measurements this plan rests on**. Throwaway code in the scratchpad; nothing committed but the findings. **Alone, and first** | ← next |
| 2 | 2, 3 | The workspace and its four gates; the design system's harness and the four components the slice needs | |
| 3 | 4, 5 | One place that calls the platform; our server on 7105, with `/api/me` and the mock proxy | |
| 4 | 6, 7 | Sign-in, the shell, sign-out; *Your apps*, empty and with apps | |
| 5 | 8 | **The acceptance**: a headless check, and Rich clicking it. **Alone, and last** | |

**Every sitting ends the same way:**
1. **The four gates, from the root:** `pnpm test` (twice, because a suite that is not repeatable has a state
   leak), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`.
2. **A dated entry in *What executing this plan found*.** Every defect with the measurement that found it; every
   negative control, including any that could not fail, and why.
3. **This table**, updated, with `← next` moved.
4. **ORIENTATION's *Where things stand***, replaced, and the roadmap.

**The table is a schedule, not a contract.** If Task 1 breaks it, say so to Rich before sitting 2. Task 1 stays
first and alone; Task 8 stays last and alone.

## Decided by Rich (2026-09-27): build them, do not re-open them

- **The code lives in `/Users/rich/Developer/manifest-app`**, a sibling repository (spec §5: a SEPARATE PROJECT).
- **The API client is `@manifest/contract` by `link:`**, not a vendored copy (*"link: to @manifest/contract"*).
- **The network may be used to install packages, without asking again** (*"Yes, no need to ask"*). Record what
  was fetched.
- **The order: the walk-through, then a plan, then a first clickable slice against the mock.** The walk-through
  was approved on 2026-09-27 (*"I agree with the walkthrough"*).
- **FE-2: our server may replay the session cookie to `GET /v1/me`, and for nothing else.**
- **The product's voice is *we*, everywhere. The prototype's words are a starting point, not a script.**

## Decisions this plan makes, and why

1. **Three packages in one pnpm workspace: `ui`, `web`, `server`.**
   - The design system has a different reason to change from the app, and our server has a different runtime
     and a different trust boundary (it holds tokens; the browser never does).
   - *Rejected:* one package, which mixes a Node server's dependencies into a browser bundle and blurs which code
     may hold a credential; separate repositories, which is three places to keep in step for one product.
   - *Changing course* is moving folders.
2. **The design system is PORTED to React 19 TSX and proved markup-identical to the prototype's bundle.**
   - The bundle is a hand-written ES5 script with no source anywhere (research: `prototype-inventory.md` §3.6).
   - **The proof is a parity test.** It renders the vendored `bundle.js` (under our React, set as the global it
     expects) and our port with the same props through `renderToStaticMarkup`, and requires the same HTML.
   - `tokens.css` and `bundle.css` are **vendored verbatim**. Same markup plus same stylesheet means the same
     pixels, so no screenshot tooling is needed.
   - *Rejected:* loading `bundle.js` as a global script (untyped, a second module system, React 18's global);
     retyping markup by eye, which is the drift the design README warns about.
   - **For Rich's review, not blocking:** where the design system lives from now on. The vendored copy records
     the manifest commit it came from; the port is ours to change; manifest's copy stays the reference until he
     says otherwise.
3. **Only `web/src/platform/` calls the API**, as the console's `api.ts` is its one caller. A boundary test
   enforces it. `web` imports nothing from `manifest` except `@manifest/contract`.
4. **One process on 7105.**
   - Our Fastify server owns `/api/*`, and never `/v1` or `/auth`, which the edge sends to the control plane.
   - Everything else is the app: Vite's middleware in development, the built files otherwise.
   - In **mock** mode it also proxies `/v1` and `/auth`, WebSocket included, to 7102.
   - One port, because the edge sends everything to one (the enablement plan's Decision 19).
   - **How the one process is assembled is Task 1's M4 to decide:** Fastify's `serverFactory` dispatching to
     Vite's middlewares, or `@fastify/middie`.
5. **The contract is consumed from its SOURCE.**
   - `@manifest/contract`'s `exports` give types from `src/index.ts` but a runtime from an unbuilt, git-ignored
     `dist/` (FE-18).
   - So Vite and Vitest resolve `@manifest/contract` to `../manifest/packages/contract/src/index.ts`.
   - We **never build inside manifest**, and we see its working tree as it is.
   - *Rejected:* running its `build` (it writes into another session's tree); vendoring (Rich chose `link:`).
6. **Versions:**
   - **The platform's exact versions where it has them.** The pin's evidence is the local store: C1, offline
     after setup.
   - Anything new at its current release, recorded exactly in Task 2's commit and in *What executing this plan
     found*.
7. **No storage in F1.** Sign-in and *Your apps* are read-through. Conversations (F2/F3) decide it.
   `node:sqlite` works on 24.12 with an *experimental* warning (checked 2026-09-27); Task 1 records it as a
   candidate.
8. **A router of our own, like the console's** (`packages/console/src/router.ts`, 94 lines): pathname,
   `pushState`, `popstate`. *Rejected:* a routing library for four routes.
9. **Words are data.**
   - Every sentence a screen shows lives beside the screen, in one `words.ts`, copied from the walk-through.
   - **A test renders every screen and fails on a machinery word** (C3): `provisioning`, `healthy`, `container`,
     `yaml`, `digest`, `sha256`, `exit code`, `port`, `instance`, `environment`, `sandbox`, `staging`,
     `production`.
   - Hostnames are allowed; they are not words.

## Global Constraints

- **Never change anything in `/Users/rich/Developer/manifest`**, and never run its tests, `make reset`,
  `make demo*`, `pnpm contract:write` or a `build`. `pnpm --dir ../manifest --filter @manifest/mock dev` (7102) is
  allowed.
- **Ports: 7105 is ours.** The mock is 7102; the platform owns 7100–7199; Valet owns 80/443/53 and `.test`.
- **C3**, as Decision 9 enforces. **Five states only**: working · waiting · attention (*needs you*) · steady ·
  not yet. Their classes are `mf-is-<state>`.
- **Accessibility:**
  - real `<button>`, `<a href>`, `<label for>`;
  - focus visible (the vendored CSS declares it);
  - never colour alone, since a chip is always a dot and a word;
  - icon-only controls carry `aria-label`.
- **Every mutation carries an `Idempotency-Key` made once per user action and reused on its retry** (D23.6). F1
  has one mutation, sign-out, which is outside `/v1`.
- **A browser sends its own cookie and `Origin`.** Nothing in `web` sets either.
- **TypeScript is strict**, with `exactOptionalPropertyTypes`, as the platform's is. `pnpm typecheck` is the only
  gate that sees a whole class of error, because Vitest strips types.
- **Commit per task, on `main`, staged by name**, ending with the attribution lines the session gives.

## Review Focus: what no task's happy path exercises, and a person will meet

1. **The session ends while the page is open.** Twelve hours on, every read answers `401`.
   - The page must say *"You've been signed out…"* and return them to where they were.
   - Never a blank screen or an error dump.
   - **Pinned in Task 6.**
2. **The platform cannot be reached.** A network error, the edge's `502` because 7100 is down, or the mock not
   running.
   - *"We can't reach Manifest just now. Nothing of yours has changed."* and **[Try again]**.
   - Never a thrown error and a white page.
   - **Pinned in Tasks 4 and 7.**
3. **An administrator's `listProjects` answers every project on the platform.**
   - *Your apps* shows only the ones they own (FE-10).
   - **Pinned in Task 7.**
4. **A value from a newer contract** (an instance state, a role, an error code we have never seen).
   - Rendered as *not yet* with *"We can't tell right now"*, or a generic refusal. Never a crash.
   - The contract grows additively (D23.8), and our link reads it as it grows.
   - **Pinned in Tasks 4 and 7.**
5. **A platform sentence that carries machinery.**
   - A refusal's `message` shown verbatim would put `sha256:…` or a spec section on screen.
   - Only the refusal codes F1 names are rendered, in our words. Anything else gets *"Something went wrong on our
     side. Nothing of yours has changed."* The code goes to the console, never to the page.
   - **Pinned in Task 4.**

---

## File Structure

```
manifest-app/
  package.json                 workspace root: dev, dev:mock, build, test, lint, typecheck, format:check
  pnpm-workspace.yaml          packages/*
  tsconfig.base.json           strict, exactOptionalPropertyTypes, moduleResolution bundler
  eslint.config.js             + the boundary rules (Decision 3)
  .prettierrc.json
  scripts/check-slice.sh       Task 8's headless acceptance
  packages/
    ui/                        @manifest-app/ui — the design system
      reference/               VENDORED, never edited: bundle.js, bundle.css, tokens.css, index.d.ts, SOURCE.md
      src/index.ts             the exports
      src/styles.css           imports reference/tokens.css and reference/bundle.css
      src/icons.tsx            the bundle's icon paths (TICK, NAV_ICONS) as data
      src/StateChip.tsx  src/Button.tsx  src/Card.tsx  src/SideNav.tsx
      src/parity.test.tsx      the proof (Decision 2)
    web/                       @manifest-app/web — the app
      index.html  vite.config.ts
      src/main.tsx             mounts <App/>
      src/app.tsx              the shell: session → route → screen
      src/router.ts            Decision 8
      src/platform/api.ts      THE one caller of the API (Decision 3)
      src/platform/refusal.ts  ManifestApiError | network error → Refusal
      src/platform/api.test.ts against an in-process manifest-mock
      src/session.ts           useSession(): signed-in | signed-out | expired | unreachable
      src/auth.ts              signIn(returnTo), signOut() — the only /auth/ paths
      src/words.ts             every sentence F1 shows
      src/screens/sign-in.tsx
      src/screens/your-apps/model.ts       pure: the students' fact, audience in words, a version's words
      src/screens/your-apps/model.test.ts
      src/screens/your-apps/your-apps.tsx
      src/screens/screens.test.tsx         renders each screen: words, states, no machinery (Decision 9)
      src/boundary.test.ts                 Decision 3
    server/                    @manifest-app/server — port 7105
      src/config.ts            mode (mock | edge), port, where getMe is asked
      src/identity.ts          whoIs(cookieHeader) — the ONLY reader of the session (FE-2)
      src/identity.test.ts
      src/app.ts               buildServer(): /api/*, the app, the mock proxy
      src/app.test.ts
      src/main.ts
```

---

## Task 1: Measure what this plan rests on, before any of it is built

**Sitting 1, alone.** Throwaway code in the session's scratchpad. **Nothing in the repository changes except this
plan's *What executing this plan found*.** Each measurement records its command, its output and its date, and
says which decision it confirms or breaks.

- [ ] **M1: the contract from a sibling repository, from source.**
  - In a scratch Vite + Vitest project, alias `@manifest/contract` to
    `/Users/rich/Developer/manifest/packages/contract/src/index.ts`.
  - Import `createManifestClient`, `unwrap`, `ManifestApiError` and `type Schemas`.
  - Call `getMe` against an in-process `createMockServer()` (the console's `api.test.ts:34-37` shows how), in
    Vitest, and from a browser page served by Vite.
  - Record: whether `.js`-suffixed imports inside `src/` resolve to `.ts` in both; whether `tsc --noEmit` with
    `moduleResolution: bundler` accepts it; **whether `erasableSyntaxOnly` must stay off** (FE-18).
  - Confirms or breaks Decision 5.
- [ ] **M2: the bundle under React 19.**
  - Load the vendored `bundle.js` with Node's `vm`, giving it `{ window: { React }, React }` with React 19.3.0.
  - Render `StateChip`, `Button`, `Card` and `SideNav` with a preview's props through `renderToStaticMarkup`.
  - Record: does it throw, does it warn (keys), and does `window.Manifest` hold all 18 exports?
  - Confirms or breaks Decision 2's proof.
- [ ] **M3: `node:sqlite` on Node 24.12.** Open a file database, write, reopen, read, and record the warning text.
  A candidate for F2 only.
- [ ] **M4: one process on 7105.**
  - Build both candidates:
    - (a) Fastify with `serverFactory`, whose handler sends `/api/*` to Fastify and everything else to
      `vite.middlewares` (Vite `server.middlewareMode: true`);
    - (b) `@fastify/middie` mounting `vite.middlewares`.
  - For each, record:
    - HMR works at `http://127.0.0.1:7105`;
    - `/api/ping` answers from Fastify;
    - an unknown path gets `index.html`;
    - a WebSocket upgrade to `/v1/projects/<id>/events` is **proxied to the mock on 7102**, by Vite's
      `server.proxy` with `ws: true` or `@fastify/http-proxy`, and a frame arrives.
  - Choose the simpler that passes all four. Records Decision 4's *how*.
- [ ] **M5: the mock's sign-in through M4's proxy.**
  - With the mock running (`pnpm --dir /Users/rich/Developer/manifest --filter @manifest/mock dev`), go to
    `http://127.0.0.1:7105/auth/login?returnTo=/`.
  - Record the cookie the mock sets (name, flags), where it redirects, and that `GET /v1/me` then answers `200`
    **and `GET /api/me` can read the same cookie**.
  - Then `POST /auth/logout`: record its answer's shape (`{ redirectTo }`?).
- [ ] **M6: the install.**
  - `pnpm install --offline` for the Tech Stack's packages: record what the store lacks.
  - Then one networked install (Rich's standing permission): record every package fetched and its exact version.
- [ ] **M7: the edge today.** `curl -sk https://app.manifest.internal/v1/me` and `/`. Record the body, never only
  the status:
  - `manifest OK host=…` means the wildcard answered, and sitting 6 has not landed;
  - `UNAUTHENTICATED` means it has.

  Read-only; start nothing.
- [ ] **Close:** write the dated sitting-1 entry. **If any measurement breaks a decision, stop and tell Rich
  before sitting 2.** Commit the plan file only:

```bash
git add docs/plans/2026-09-27-f1-foundations.md
git commit -m "docs(f1): sitting 1 — the measurements"
```

---

## Task 2: The workspace, its four gates, and the contract linked

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `vitest.workspace.ts` (`['packages/*']`, so the root's
  `vitest run` runs every package's tests), `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`
- Create: `packages/{ui,web,server}/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/web/src/boundary.test.ts`

**Interfaces:** Produces the root scripts: `pnpm test | lint | typecheck | format:check | dev | dev:mock | build`.
Also the alias `@manifest/contract` → the contract's `src/index.ts` (M1's resolved form), in `web`'s and
`server`'s Vite and Vitest configs.

- [ ] **Step 1: The workspace.**

```yaml
# pnpm-workspace.yaml
packages:
  - packages/*
```

```jsonc
// package.json (root)
{
  "name": "manifest-app",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.24.0",
  "engines": { "node": ">=24.12.0" },
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "pnpm -r typecheck",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "dev": "pnpm --filter @manifest-app/server dev",
    "dev:mock": "MANIFEST_APP_MODE=mock pnpm --filter @manifest-app/server dev",
    "build": "pnpm --filter @manifest-app/web build"
  }
}
```

  Each package gets the dependencies its tasks name, with **exact** versions (no `^`), because the evidence for
  a pin is the store (Decision 6).
  - `web` and `server`: `"@manifest/contract": "link:../../../manifest/packages/contract"`.
  - `web` also, dev only: `"@manifest/mock": "link:../../../manifest/packages/mock"`.
  - Record, in the commit message, every package the install fetched.
- [ ] **Step 2: TypeScript.** In `tsconfig.base.json`:

  ```json
  {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2023",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "skipLibCheck": false
  }
  ```

  - `paths`: `@manifest/contract` → the contract's `src/index.ts`.
  - **Not** `erasableSyntaxOnly` (FE-18: the contract's `errors.ts` needs it off).
- [ ] **Step 3: The boundary test, written to fail first.**

```ts
// packages/web/src/boundary.test.ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = new URL('.', import.meta.url).pathname
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}
const imports = (text: string) => [...text.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '')

describe('the boundary (Decision 3)', () => {
  it('only src/platform/ imports @manifest/contract as a value; anyone may import its types', () => {
    for (const file of files(SRC)) {
      if (relative(SRC, file).startsWith('platform/') || file.endsWith('.test.ts')) continue
      const text = readFileSync(file, 'utf8')
      const valueImports = [...text.matchAll(/^import\s+(?!type\b)[^;]*from\s+'@manifest\/contract'/gm)]
      expect(valueImports, relative(SRC, file)).toEqual([])
    }
  })
  it('nothing imports from the manifest repository except the two linked packages', () => {
    for (const file of files(SRC)) {
      for (const spec of imports(readFileSync(file, 'utf8'))) {
        expect(spec.includes('/manifest/') || spec.startsWith('../../../'), `${relative(SRC, file)}: ${spec}`).toBe(false)
      }
    }
  })
  it('only src/auth.ts names an /auth/ path', () => {
    for (const file of files(SRC)) {
      if (file.endsWith('auth.ts') || file.endsWith('.test.ts')) continue
      expect(readFileSync(file, 'utf8').includes("'/auth/"), relative(SRC, file)).toBe(false)
    }
  })
})
```

- [ ] **Step 4:** `pnpm test`. It passes trivially while `src/` holds only this file. **The negative control:**
  add `import { unwrap } from '@manifest/contract'` to a new `src/leak.ts`, see test 1 go red naming it, and
  delete the file.
- [ ] **Step 5: The four gates green.** Commit:

```bash
git add package.json pnpm-workspace.yaml vitest.workspace.ts pnpm-lock.yaml tsconfig.base.json eslint.config.js .prettierrc.json packages/*/package.json packages/*/tsconfig.json packages/*/vitest.config.ts packages/web/src/boundary.test.ts
git commit -m "chore: the workspace — ui, web, server; the four gates; @manifest/contract linked from source"
```

---

## Task 3: The design system: the vendored reference, the parity proof, four components

**Files:**
- Create: `packages/ui/reference/{bundle.js,bundle.css,tokens.css,index.d.ts,SOURCE.md}`, copied byte for byte
  from manifest's `docs/superpowers/design/system/` (`tokens.css`) and `…/components/` (the rest)
- Create: `packages/ui/src/{index.ts,styles.css,icons.tsx,StateChip.tsx,Button.tsx,Card.tsx,SideNav.tsx,parity.test.tsx}`

**Interfaces:**
- Produces, from `@manifest-app/ui`, with the props exactly as `reference/index.d.ts` documents them:
  - `StateChip({ state, label, pulse?, className? })`;
  - `Button({ kind?, size?, href?, onClick?, type?, disabled?, className?, style?, children })`;
  - `Card({ tone?, title?, className?, style?, children })`;
  - `SideNav({ items?, active?, projectName?, name?, org?, homeLabel?, homeHref?, newLabel?, newHref?, user?, signOutHref?, className?, style? })`;
  - the type `State = 'working' | 'waiting' | 'attention' | 'steady' | 'notyet'`.
- `@manifest-app/ui/styles.css`.

- [ ] **Step 1: Vendor, and record where from.**

```bash
M=/Users/rich/Developer/manifest/docs/superpowers/design/system
mkdir -p packages/ui/reference
cp $M/tokens.css $M/components/bundle.js $M/components/bundle.css $M/components/index.d.ts packages/ui/reference/
printf 'Copied %s from manifest@%s (docs/superpowers/design/system). NEVER EDITED: the parity test compares against it.\n' \
  "$(date +%F)" "$(git -C /Users/rich/Developer/manifest rev-parse --short HEAD)" > packages/ui/reference/SOURCE.md
```

- [ ] **Step 2: The parity harness, failing first** (the ports do not exist yet).

```tsx
// packages/ui/src/parity.test.tsx
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import * as Ours from './index.js'

/** The prototype's bundle, evaluated as the classic script it is, under OUR React (M2). */
function reference(): Record<string, React.FC<Record<string, unknown>>> {
  const window: Record<string, unknown> = { React }
  runInNewContext(readFileSync(new URL('../reference/bundle.js', import.meta.url), 'utf8'), { window, React })
  return window['Manifest'] as Record<string, React.FC<Record<string, unknown>>>
}
const REF = reference()
const html = (c: React.FC<Record<string, unknown>>, props: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(c, props))

/** Each case's props come from the component's own preview.html in manifest, plus every documented variant. */
const CASES: Record<string, Record<string, unknown>[]> = {
  StateChip: [
    ...(['working', 'waiting', 'attention', 'steady', 'notyet'] as const).map((state) => ({ state, label: state })),
    { state: 'working', label: 'Working, a few minutes', pulse: false },
    { state: 'no-such-state', label: 'Unknown' },
  ],
  Button: [
    { children: 'Make it' },
    ...(['primary', 'secondary', 'tertiary', 'danger', 'ghostDanger'] as const).map((kind) => ({ kind, children: kind })),
    { kind: 'secondary', size: 'sm', children: 'Small' },
    { href: '/somewhere', children: 'A link' },
    { disabled: true, children: 'Building…' },
  ],
  Card: [
    { children: 'Plain' },
    ...(['working', 'waiting', 'attention', 'steady'] as const).map((tone) => ({ tone, title: tone, children: 'Body' })),
  ],
  SideNav: [
    { active: 'Your apps', user: 'Instructor One' },
    { active: 'Your apps', newLabel: null },
    {
      active: 'Overview',
      projectName: 'Reading responses',
      items: [
        { label: 'Overview', href: '#', icon: 'overview' },
        { label: 'Preview', href: '#', icon: 'preview' },
      ],
      user: 'Instructor One',
    },
  ],
}

describe('the design system is the prototype’s, byte for byte (Decision 2)', () => {
  for (const [name, cases] of Object.entries(CASES)) {
    it(`${name} renders the reference's markup for every case`, () => {
      const ours = (Ours as unknown as Record<string, React.FC<Record<string, unknown>>>)[name]
      const ref = REF[name]
      expect(ours, `${name} is exported`).toBeTypeOf('function')
      expect(ref, `${name} is in the reference`).toBeTypeOf('function')
      for (const props of cases) expect(html(ours!, props), JSON.stringify(props)).toBe(html(ref!, props))
    })
  }
})
```

  **Before writing the ports, extend `CASES` from each component's `preview.html`** (in manifest,
  `…/components/<Comp>/preview.html`: the props it mounts) and from the `NAV_ICONS` keys `bundle.js` defines.
- [ ] **Step 3:** `pnpm vitest run packages/ui`. Expected: FAIL, `StateChip is exported`.
- [ ] **Step 4: Port the four.**
  - Read each function in `reference/bundle.js` (`StateChip`, `Button`, `Card`, `SideNav`, and the `navItem`,
    `icon`, `cx` helpers they use), and write it as TSX that produces **the same elements, attributes, classes,
    inline styles and order**.
  - Icon paths are data in `icons.tsx`, copied from the bundle's constants.
  - **Never change a class name or add a wrapper.** The stylesheet is vendored, so markup is the whole contract.
- [ ] **Step 5:** `pnpm vitest run packages/ui`. Expected: PASS. **Negative control:** change one class in
  `Card.tsx` (`mf-card--` → `mf-card-`), see the Card case go red with both markups in the diff, and restore it.
- [ ] **Step 6: `styles.css`** is `@import '../reference/tokens.css'; @import '../reference/bundle.css';` and
  nothing else. Plus the fonts, **Instrument Sans** and **IBM Plex Mono**, which the design system names:
  - load them from Google Fonts, as the gallery does;
  - **record in Task 1's findings whether they render offline**. If they don't, the system's own fallback stacks
    apply, which is a visual difference to state, not to hide.
- [ ] **Step 7: The gates; commit.**

```bash
git add packages/ui
git commit -m "feat(ui): the design system ported to React 19 — StateChip, Button, Card, SideNav — markup-identical to the prototype's bundle by test"
```

---

## Task 4: One place that calls the platform

**Files:** Create `packages/web/src/platform/{api.ts,refusal.ts,api.test.ts}`.

**Interfaces:**
- Consumes `createManifestClient`, `unwrap`, `ManifestApiError` and `type Schemas` from `@manifest/contract`.
- Produces:

```ts
export interface Platform {
  getMe(): Promise<Schemas['Me']>
  listProjects(): Promise<Schemas['ProjectList']>
  getProject(projectId: string): Promise<Schemas['Project']>                  // ?expand=environments, always
  listInstances(environmentId: string): Promise<Schemas['InstanceList']>
  getRelease(releaseId: string): Promise<Schemas['Release']>
}
export function createPlatform(options: { origin: string; session?: string }): Platform

export type Refusal =
  | { kind: 'signed-out' }                              // 401 UNAUTHENTICATED
  | { kind: 'unreachable' }                             // fetch threw, or the edge's 502/503/504 with no envelope
  | { kind: 'refused'; code: string; status: number }   // any other envelope: its CODE, never its message
export function refusalOf(error: unknown): Refusal
```

- [ ] **Step 1: The tests, against an in-process mock** (the console's `api.test.ts:34-37` pattern; use the same
  session value it uses).
  - `getMe` answers `displayName`.
  - `listProjects` answers `mock-app`.
  - `getProject` answers three environments.
  - `listInstances` on the staging environment answers one `serving: true`.
  - `getRelease` of that instance's `releaseId` answers `createdAt`.
  - **`refusalOf`, one assertion per class:**
    - a session-less client's `getMe` is `{ kind: 'signed-out' }`;
    - a client pointed at a closed port (`http://127.0.0.1:1`) is `{ kind: 'unreachable' }`;
    - `new ManifestApiError(409, envelopeWith('SOMETHING_NEW'), 'x')` is
      `{ kind: 'refused', code: 'SOMETHING_NEW', status: 409 }` (**Review Focus 4**);
    - and **the refusal carries no `message`** (**Review Focus 5**): `expect(Object.keys(r)).toEqual(['kind', 'code', 'status'])`.
- [ ] **Step 2:** run. It fails, with no module.
- [ ] **Step 3:** implement.
  - `api.ts` wraps each call as `unwrap(await client.GET(…), '<operationId>')`, exactly as the console's does.
  - `refusalOf` is ten lines over `ManifestApiError`'s `status` and `code`, and a `TypeError` from `fetch`.
- [ ] **Step 4:** run; it passes. **Negative control:** make `refusalOf` return `error.message` in `refused`, and
  see the keys assertion go red.
- [ ] **Step 5: The gates; commit.**

```bash
git add packages/web/src/platform
git commit -m "feat(web): one place calls the platform — five reads, and refusals by kind and code, never by message"
```

---

## Task 5: Our server on 7105: the app, `/api/me`, and the mock proxy

**Files:** Create `packages/server/src/{config.ts,identity.ts,identity.test.ts,app.ts,app.test.ts,main.ts}`.

**Interfaces:**

```ts
// config.ts
export interface Config {
  mode: 'mock' | 'edge'
  port: 7105
  /** Where getMe is asked. mock: http://127.0.0.1:7102. edge: http://127.0.0.1:7100, the control plane on the host (M7). */
  platformOrigin: string
}
export function readConfig(env: NodeJS.ProcessEnv): Config   // MANIFEST_APP_MODE, default 'edge'

// identity.ts — THE ONLY READER OF THE SESSION (FE-2, decided by Rich)
export type Person = { id: string; displayName: string }
/** Replays manifest_session to GET /v1/me. Never logs it, stores it, or sends it anywhere else. */
export function whoIs(cookieHeader: string | undefined, platformOrigin: string): Promise<Person | undefined>

// app.ts
export function buildServer(config: Config, web: WebHandler): FastifyInstance   // WebHandler: M4's choice
```

- [ ] **Step 1: `identity.test.ts`, failing first.** It stands up a fake control plane with `node:http` that
  records every request it receives. The cases:
  - **a cookie header with other cookies around `manifest_session=S`**: the fake receives exactly
    `Cookie: manifest_session=S` and nothing else from the header, and `whoIs` answers the fake's `Me` as
    `{ id, displayName }`;
  - **no header**: `undefined`, and **the fake receives nothing**;
  - **the fake answers `401`**: `undefined`;
  - **the fake answers `500`**: the promise rejects with an `Error` whose message does **not** contain `S`.
  - **The no-leak control:** with `console.log`, `console.error` and `process.stdout.write` spied, run all four
    cases with `manifest_session=SECRET-7f3a`. **No captured output contains `SECRET-7f3a`.**
- [ ] **Step 2:** run; it fails. **Step 3:** implement.
  - `whoIs` parses only `manifest_session` out of the header, and calls
    `createManifestClient({ origin: platformOrigin, session })`, then `GET /v1/me`.
  - It maps `401` to `undefined` and rethrows anything else, without the value.
  - Only `displayName` and `id` leave the function: never `email` or `puid`, which the page does not need.
- [ ] **Step 4:** run; it passes. **Negative control:** add `console.error('whoIs', cookieHeader)` and see the
  no-leak test go red; remove it.
- [ ] **Step 5: `app.test.ts`** drives `buildServer` with Fastify's `inject`:
  - `GET /api/me` with a good cookie answers `200 { id, displayName }`;
  - without one: `401 { error: { code: 'UNAUTHENTICATED' } }`;
  - `GET /api/nope` answers `404`;
  - **`GET /v1/me` and `GET /auth/login` are NEVER answered by our routes.** In mock mode they reach the proxy; in
    edge mode they are not ours to answer (`404`, and the edge never sends them here).
  - Implement `app.ts` with M4's chosen assembly. `main.ts` reads config, builds and listens on
    `127.0.0.1:7105`, and **fails loudly** if 7105 is taken, never choosing another port.
- [ ] **Step 6:**
  - **Mock mode, by hand:** start the mock and `pnpm dev:mock`, then `curl -si http://127.0.0.1:7105/api/me`
    answers `401`.
  - Sign in through `/auth/login` (M5's flow) with a cookie jar. **`/api/me` answers the mock's person, and
    `/v1/me` answers the same `id`.**
- [ ] **Step 7: The gates; commit.**

```bash
git add packages/server
git commit -m "feat(server): 7105 — the app, /api/me by replaying the session to getMe and nothing else (FE-2), the mock proxy"
```

---

## Task 6: Sign-in, the shell, sign-out, and a session that ends (walk-through moment 1, Review Focus 1)

**Files:** Create `packages/web/{index.html,vite.config.ts}`, `src/{main.tsx,app.tsx,router.ts,session.ts,auth.ts,words.ts}`,
`src/screens/sign-in.tsx`, and `src/screens/screens.test.tsx`, whose first cases are here.

**Interfaces:**

```ts
// session.ts
export type Session =
  | { state: 'loading' }
  | { state: 'signed-in'; me: Schemas['Me'] }
  | { state: 'signed-out' }                 // never signed in, on this load
  | { state: 'expired' }                    // WAS signed in on this page, then a read answered 401
  | { state: 'unreachable' }
export function useSession(platform: Platform): { session: Session; retry(): void; expire(): void }

// auth.ts — the only file that names /auth/ (boundary test)
export function signInHref(returnTo: string): string      // '/auth/login?returnTo=' + encodeURIComponent(returnTo)
export function signIn(returnTo?: string): void           // location = signInHref(returnTo ?? path+search)
export function signOut(): Promise<void>                  // POST /auth/logout → 200 { redirectTo } → go there; anything else throws
```

- [ ] **Step 1: The screen tests, failing first** (Testing Library + jsdom; the platform is a stub `Platform`):
  - **signed-out**: the page shows the sign-in words exactly as `words.ts` holds them, from moment 1:
    - *"Build the tool your course needs."*
    - *"Sign in"*
    - *"You'll go to UBC's own sign-in page and come straight back."*
    - **[Continue with CWL]**
    - *"Manifest never sees your password. UBC tells us your name, your email and your CWL login."*

    The button is a real `<a href={signInHref(currentPath)}>`, built by `auth.ts`, because the boundary test
    allows no other file to name `/auth/`.
  - **expired** (Review Focus 1):
    - *"You've been signed out. It happens after twelve hours. Sign in again and you'll come straight back
      here."*
    - **[Sign in again]**, whose `returnTo` is the page they were on;
    - the page behind it is not blanked.
  - **unreachable** (Review Focus 2): *"We can't reach Manifest just now. Nothing of yours has changed."* and
    **[Try again]**, which calls `retry`.
  - **signed-in**: `SideNav` with *"Your apps"* active and no project section. The person's `displayName` is in
    its foot, with *Sign out*.
  - **An unknown `role`** (Review Focus 4): renders, and `role: 'no-such-role'` is not an error.
- [ ] **Step 2:** fail. **Step 3:** implement.
  - `useSession` reads `getMe` once, and maps it through `refusalOf`: `signed-out` → `signed-out`,
    `unreachable` → `unreachable`.
  - Any later `401` from any read, via `expire()`, moves `signed-in` → `expired`.
  - `signOut` copies the console's `auth.ts` assertions: status `200` and a `redirectTo` that is a same-origin
    path or an `https:` URL, **else throw**. Its caller shows *"We couldn't sign you out. Close the browser to be
    sure."*
  - The router has three routes: `/` (*Your apps*), `/signed-out`, and a not-found that says *"There's nothing
    here. [Your apps]"*.
  - `vite.config.ts`:
    - aliases `@manifest/contract` (Decision 5);
    - `server.allowedHosts: ['app.manifest.internal']`;
    - in edge mode, HMR through the edge (`clientPort: 443`, as the console's config does for its origin).
- [ ] **Step 4:** pass. **Negative control:** make `expire()` a no-op, and see the expired case go red.
- [ ] **Step 5: The gates; commit.**

```bash
git add packages/web
git commit -m "feat(web): sign-in, the shell and sign-out — and a session that ends says so and brings you back"
```

---

## Task 7: *Your apps*, empty and with apps (walk-through moments 2 and 16's card; Review Focus 2–4)

**Files:** Create `packages/web/src/screens/your-apps/{model.ts,model.test.ts,your-apps.tsx}`, and extend
`words.ts` and `screens.test.tsx`.

**Interfaces:**

```ts
// model.ts — pure; every value a card shows, derived here and nowhere else
import type { State } from '@manifest-app/ui'
export type Fact = { state: State; words: string }
/** The students' fact, which leads the card (moment 16). */
export function studentsFact(serving: Schemas['InstanceSummary'] | undefined, release: Schemas['Release'] | undefined): Fact
/** "one class, all arriving at once" — §24's two answers in words; null audience → "" */
export function audienceWords(audience: Schemas['Project']['audience']): string
/** "the version from 18 September, 9:00am" — never a digest (10-language.md) */
export function versionWords(createdAt: string, timeZone?: string): string
/** An administrator sees only what they own (Review Focus 3, FE-10). */
export function mine(projects: Schemas['ProjectList'], me: Schemas['Me']): Schemas['ProjectList']
```

- [ ] **Step 1: `model.test.ts`, failing first.**

```ts
import { describe, expect, it } from 'vitest'
import { audienceWords, mine, studentsFact, versionWords } from './model.js'

const inst = (state: string, serving = true) =>
  ({ id: 'i', environmentId: 'e', releaseId: 'r', kind: 'production', state, lastSeenAt: null, serving }) as never
const rel = { createdAt: '2026-09-18T16:00:00Z' } as never   // 9:00am in Vancouver

describe('the students’ fact', () => {
  it('nothing deployed is not yet', () =>
    expect(studentsFact(undefined, undefined)).toEqual({ state: 'notyet', words: 'Not live yet' }))
  it('healthy is steady, in words, with its version', () =>
    expect(studentsFact(inst('healthy'), rel)).toEqual({ state: 'steady', words: 'Answering · the version from 18 September, 9:00am' }))
  it.each(['pending', 'building', 'provisioning', 'starting', 'waking'])('%s is working', (s) =>
    expect(studentsFact(inst(s), rel).state).toBe('working'))
  it('failed is needs-you, in words', () =>
    expect(studentsFact(inst('failed'), rel)).toEqual({ state: 'attention', words: 'It never answered' }))
  it('hibernated is not yet, in words', () =>
    expect(studentsFact(inst('hibernated'), rel)).toEqual({ state: 'notyet', words: 'Asleep until somebody opens it' }))
  it('a state from a newer contract is not yet, honestly (Review Focus 4)', () =>
    expect(studentsFact(inst('no-such-state'), rel)).toEqual({ state: 'notyet', words: "We can't tell right now" }))
})
describe('words', () => {
  it('versions are dates, in Vancouver', () =>
    expect(versionWords('2026-09-18T16:00:00Z', 'America/Vancouver')).toBe('the version from 18 September, 9:00am'))
  it('audience', () =>
    expect(audienceWords({ scale: 'class', burst: 'synchronised' } as never)).toBe('one class, all arriving at once'))
})
describe('an administrator’s list', () => {
  it('keeps only what they own', () => {
    const me = { id: 'u1' } as never
    const list = [{ slug: 'a', owner: { id: 'u1' } }, { slug: 'b', owner: { id: 'u2' } }] as never
    expect(mine(list, me).map((p: { slug: string }) => p.slug)).toEqual(['a'])
  })
})
```

  **The audience table:**

  | | Words |
  |---|---|
  | **scale** `solo` | *just you* |
  | **scale** `class` | *one class* |
  | **scale** `large_course` | *a large course* |
  | **scale** `public` | *anyone at all* |
  | **burst** `steady` | *coming and going* |
  | **burst** `synchronised` | *all arriving at once* |

  Joined as *"<scale>, <burst>"*.
- [ ] **Step 2:** fail. **Step 3:** implement `model.ts`.
- [ ] **Step 4: The screen** (`your-apps.tsx`):
  - **Empty** (moment 2):
    - *"Your apps"*
    - *"Nothing yet. Tell us what your course needs, and we'll build it."*
    - **[Describe what you need]**, which leads to a not-found page until F2, and says so: *"Describing an app
      arrives next."*
    - The caption: *"Making an app takes an afternoon. Letting your students in takes a little longer, while we
      move it through the steps that keep the app, and their data, safe and secure."*
  - **With apps**, one `Card` per app (moment 16's card, without its needs-you band and history, which are F6):
    - **the name**, `Project.name` (sitting 5) **or the slug if absent**;
    - `audienceWords`;
    - **the students' fact first**, as a `StateChip` and its words;
    - then *"Your draft"* and *"For trying out"*, smaller, each with its address in mono and its own fact.
  - **Fed by:**
    - `listProjects`, then `mine` (for an administrator);
    - then, per app, in parallel: `getProject` (environments), `listInstances` for each environment, and
      `getRelease` for each serving instance.

    That is **FE-10**'s N+1, accepted at pilot scale and named in a code comment citing FE-10.
  - **Any read's `signed-out`** calls `expire()`.
  - **`unreachable`** shows Review Focus 2's words, with **[Try again]**.
- [ ] **Step 5: `screens.test.tsx`, the machinery test (Decision 9).**
  - Render *Your apps* against **the mock's own fixtures**, taken from `@manifest/mock`'s `fixtures`, never
    hand-typed. Then assert **none** of Decision 9's words appears in `document.body.textContent`,
    case-insensitively, as whole words.
  - Hostnames are skipped, because mono elements are removed before the check.
  - Also render: the empty state; the unreachable state; a project whose production instance is `failed`.
  - **Negative control:** render `instance.state` raw somewhere, see the test go red naming `healthy`, and
    restore it.
- [ ] **Step 6: The gates; commit.**

```bash
git add packages/web/src/screens packages/web/src/words.ts
git commit -m "feat(web): Your apps — empty, and each app led by what its students get, in words; an administrator sees their own"
```

---

## Task 8: The acceptance: a headless check, and Rich clicking it

**Sitting 5, alone.** **Files:** Create `scripts/check-slice.sh`. Modify `docs/ORIENTATION.md` (*how to run it*),
`docs/plans/roadmap.md`, and this plan.

- [ ] **Step 1: `scripts/check-slice.sh`** (bash 3.2, BSD tools). It asserts BODIES, never a status alone.
  - It starts nothing itself. It checks that 7102 answers the mock's `GET /v1/openapi.json`, and that 7105
    answers `/`.
  - Then, with a fresh cookie jar:
    1. `GET /` → `200`, and the body holds `<div id="root">`.
    2. `GET /v1/me` → `401`, and the body holds `UNAUTHENTICATED`, which the proxy passed through.
    3. `GET /api/me` → `401`, and the body holds `UNAUTHENTICATED`, which is **ours**.
    4. `GET /auth/login?returnTo=/` → the mock's cookie is set (M5's name).
    5. `GET /v1/me` → `200`, and a `displayName`.
    6. `GET /api/me` → `200`, and **the same `id` as step 5**.
    7. `GET /api/me` with a jar whose `manifest_session` is `nonsense` → `401`.
  - **Negative control:** make `whoIs` ignore the cookie and return a fixed person, and see step 7 go red. Restore
    it.
- [ ] **Step 2: Green twice**, from a fresh `pnpm install` and from a re-use. Record both.
- [ ] **Step 3: The clicked half, Rich's.**
  1. Stage it: the mock on 7102, `pnpm dev:mock` on 7105.
  2. Ask once, with this list.
  3. **Rich opens `http://127.0.0.1:7105/`** and checks:
     - he sees *Sign in*;
     - *Continue with CWL* returns him signed in (the mock fakes it);
     - he sees *Your apps* with `mock-app`, led by *"For your students · Not live yet"*, and its trying-out
       address *Answering*;
     - he tabs through every control and sees focus on each;
     - he signs out.
  4. Record what the screens said.
- [ ] **Step 4, only if the platform's sitting 6 has landed** (M7 reads `UNAUTHENTICATED`, not the wildcard) **and
  Rich agrees to start the control plane:**
  - `pnpm dev` in edge mode, then Rich signs in at `https://app.manifest.internal` as `instructor`. **He types the
    password.**
  - *Your apps* shows the platform's projects.
  - Otherwise, write it down as the first step of F2.
- [ ] **Step 5: The close-out**, for a plan EXECUTED:
  - this plan's table and its findings;
  - the roadmap (F1 executed; F2 next, to be written);
  - ORIENTATION's *Where things stand*, replaced, and a section *Running it* with the commands;
  - `api-findings.md`, for any finding the slice met.

  Commit by name.

---

## What this plan does not build

Named, so F2 inherits a list and not a surprise:

- **Describing an app, and everything after it**: moments 3–20. That is F2–F6 in [`roadmap.md`](./roadmap.md).
- **Storage**: conversations are F2/F3's, where Decision 7 is decided.
- **The other fourteen components.** Each is ported, with its parity cases, by the plan whose screen needs it:
  `FormField`, `Choice`, `SegmentedControl`, `LiveSteps`, `Timeline`, `TwoFacts`, `ClockItem`, `ProgressBar`,
  `InverseSurface`, `BrowserFrame`, `InteractionStates`, `Cover`, `AppBar`, `ProjectBar`, `LogPane`.
- **The event stream.** F1 reads; F3 subscribes.
- ***Your apps*' needs-you band and *Since you were last here***: F6's watch token and history.
- **Sign-in on the real platform**, unless sitting 6 has landed in time (Task 8, Step 4).
- **A phone layout.** The design is drawn at 1440; the app itself is what students open on a phone.

## What executing this plan found

*Empty until sitting 1. Each sitting adds a dated entry: tasks, defects with the measurement that found each,
negative controls (and any that could not fail, and why), the gate numbers, and the machine's state at the close.*
