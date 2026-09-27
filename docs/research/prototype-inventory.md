> *Research, 2026-09-27, the front-end's first session: a read-only pass over `manifest` (see its header for the commit). Kept here because a scratchpad is not durable. It is evidence, not a spec. Where it and `manifest` disagree, `manifest` wins.*

# Prototype and design-system inventory — `docs/superpowers/design/`

*Read-only research, 2026-09-27. Source: `/Users/rich/Developer/manifest/docs/superpowers/design/`
at `HEAD` `a2918af` (the directory was last changed by `e1712d8`, 2026-09-27 01:02, the admin mockup).
Nothing in the repository was modified. Every quoted string below is copied verbatim from the file
named; `’` vs `'` follows the source (`&#39;` in the HTML is rendered here as `'`). API field names
and counts are from `docs/superpowers/design-handover.md` (generated 2026-09-27 from `7dd8a0d`,
contract v1.3.0: 54 operations, 78 schemas, 37 event types).*

## 0. What is in the directory (69 tracked files)

| Path | Bytes | What it is |
|---|---:|---|
| `README.md` | 10,291 | The handoff document (summarised in §4 below) |
| `prototype/*.dc.html` (17 screens) | 5,344 – 20,944 each | The faculty prototype, Design-canvas component format |
| `prototype/support.js` | 10,106 | A local viewer for the `.dc.html` format (not product code) |
| `prototype/canvas.json` | 7,790 | Board titles, sizes, positions, canvas notes |
| `system/README.md` | 7,409 | The brand book |
| `system/10-language.md` | 2,593 | *The words* |
| `system/20-states.md` | 2,528 | *Waiting, and the five states* |
| `system/tokens.json` | 16,686 | Source tokens: 58 colours (one theme, `light`), 3 type groups / 14 styles, spacing, radius, shadow |
| `system/tokens.css` | 3,858 | GENERATED from tokens.json (generator **not in repo** — see §3.6) |
| `system/components/bundle.js` | 19,543 (393 lines) | 18 React components, hand-written ES5, assigns `window.Manifest` |
| `system/components/bundle.css` | 17,009 (170 lines) | Component styles, `mf-` prefixed classes, tokens only |
| `system/components/index.d.ts` | 7,516 | Prop types as documentation |
| `system/components/<Comp>/README.md` | 16 files | Per-component guidelines |
| `system/components/<Comp>/preview.html` | 17 files | Fragments that mount real exports |
| `system/gallery.html` | 71,380 | GENERATED; all previews on one page |
| `system/build-gallery.mjs` | 3,847 | The gallery generator |
| `admin-console.html` (1,721) + `admin/` (README 4,618; components.css 29,668; components.js 21,906; console.js 58,874; data.js 28,415) | | The **administrator** console mockup (a second product; §3.8) |

An untracked `.DS_Store` (6,148 B) sits in `design/`; it is not in git.

Screen file sizes: Signin 5,344 · Main 14,567 · New 18,165 · Provision 16,510 · Build 19,276 ·
Deploy 18,699 · Preview 20,116 · Project 17,392 · Launch 20,511 · Incident 14,987 · Token 20,944 ·
Members 16,170 · Queue 20,540 · Describe 10,847 · Draft 13,125 · Conversations 14,685 · Iterate 15,064.

**The single most important structural fact:** the 17 prototype screens do **not** load
`bundle.js`, `bundle.css` or `tokens.css`. `grep` for `bundle`, `window.Manifest`, `tokens.css`,
`x-import` or any `mf-` class across `prototype/` returns nothing. Every screen is hand-written
inline-styled markup with hex colours copied from the tokens. The design system and the prototype
are two parallel renderings of the same design; the prototype is **not** composed from the
components. (The admin mockup, by contrast, *does* load the bundle — §3.8.)

---

## 1. THE PROTOTYPE — seventeen screens

### 1.0 How to read this section

- Every screen is a `.dc.html` file: a `<x-dc>` host containing a `<helmet>` (Google Fonts link for
  Instrument Sans 400/500/600/700 and IBM Plex Mono 400/500, a `<style>` with `body`, `a`,
  `*:focus-visible` rules and `@keyframes`), one root `<div>` of fixed pixel size (1440 wide), and a
  `<script type="text/x-dc" data-dc-script data-props='…'>` holding `class Component extends DCLogic`.
  Templates use `{{holes}}`, `<sc-for list as>`, `<sc-if value>`, `onClick="{{fn}}"`, `ref="{{fn}}"`,
  and `hint-placeholder-*` attributes (canvas-editor hints; `support.js` strips them). Animations
  used: `mfBreathe` (pulse), `mfDrift` (bar stripes), `mfArrive`, `mfRise`, `mfFade` — each defined
  in the screen that uses it.
- `canvas.json` gives each board a title; that title is quoted as "Canvas title" below. The HTML
  `<title>` is quoted as "Tab title".
- **Order used here** is the order a faculty member would meet them, not `canvas.json`'s `order`
  array (which is `Main, Signin, New, Provision, Build, Deploy, Preview, Project, Launch, Incident,
  Token, Members, Queue, Describe, Draft, Conversations, Iterate`).
- **Fixed sample identity throughout:** app slug `mock-app`; person `Instructor One`
  (`instructor@example.test`, initials `I1`); a second person `Student One`
  (`student@example.test`, `S1`, CWL value `stu000001`); hostnames
  `mock-app.sandbox.manifest.internal`, `mock-app.staging.manifest.internal`,
  `mock-app.manifest.internal`; "made 18 September"; "the version from 18 September, 9:00am".
- **canvas.json notes** (not on any screen, but they are the designer's own annotations):
  - s1 "THE SYSTEM … FIVE STATES AND NOTHING ELSE … The rule: motion means a machine is moving;
    stillness plus a number means a person has it. So nothing measured in weeks is ever animated."
  - s2 "WHERE THE COPY COMES FROM — Real fixture values, verbatim: the slug, all three hostnames, the
    twenty build log lines, 135 packages, the scan counts (0 fixable, 2 unfixable High, 18 on the base
    image), the token secret, the 42-second wait, the incident's repair prompt. Written for this
    prototype: the faculty-legible sentence for each event and each launch item. … That is finding F2."
  - s3 (over the three moments) "All three explain their own rule on screen rather than in a help page. …"
  - s4 (over the speculative row) "The full authoring flow, at Rich's direction, plus the conversation
    list. It hands back to the real journey: 'Yes, build that' goes to Provision … A CONVERSATION IS THE
    ONE OBJECT WITH NO COUNTERPART IN THE API. … Finding F13. In the last artboard only the asking is
    invented."
  - s5 "THE PREVIEW — The app drawn inside the frame is markup, not a live embed … Finding F12. The
    environment switcher is honest about the fixtures: sandbox and production both have no instance,
    so both show an empty state rather than a mock."
  - Row titles: t1 "The journey that is real — every value on these ten screens comes from the
    published contract"; t2 "Three moments that need particular care"; t3 "Speculative — describing
    an app, and the conversations that change it".

### 1.00 The shared left rail (on 16 of 17 screens — every screen except Signin)

The `<nav>` block is **byte-identical on all 16 screens** apart from which item carries
`aria-current="page"` (verified by hashing the block with the active styling normalised). It is inline
markup, not `SideNav` from the bundle, but it matches `SideNav`'s structure exactly.

- Container: `<nav aria-label="Manifest">`, 240px wide, background `#003468` (brand / `nav-surface`).
- **Mark** (links to `Main.dc.html`): white 26px square with a house-shaped building glyph, wordmark
  "Manifest", a 1px rule, overline "UBC".
- **Zone 1 items:** "Your apps" (grid icon → `Main.dc.html`), "Start something new" (plus icon →
  `New.dc.html`).
- A hairline rule.
- **Overline:** "mock-app" (the open project's slug).
- **Project items:** "Overview" (→ `Project.dc.html`), "Preview" (→ `Preview.dc.html`),
  "Conversations" (→ `Conversations.dc.html`), "Going live" (→ `Launch.dc.html`), "People"
  (→ `Members.dc.html`), "Agents" (lightning icon → `Token.dc.html`).
- Spacer, then footer: "Instructor One" and link "Sign out" (→ `Signin.dc.html`).
- Active item styling: fill `#14508A` (`nav-active`), white, 600 weight, `aria-current="page"`.

Active item per screen: Main → Your apps; New → **Your apps** (not "Start something new");
Describe → Your apps; Draft → Your apps; Provision, Build, Deploy, Project, Incident → Overview;
Preview → Preview; Launch → Going live; Members → People; Token → Agents; Queue → Agents;
Conversations → Conversations; Iterate → Conversations.

The project section ("mock-app" + six items) is shown on **every** rail screen, including Main, New,
Describe and Draft — which contradicts `SideNav/README.md`: *"The project section appears only when a
project is open; on the home and create screens the rail stops after the first zone."* With more than
one project, the rail has no way to say which project's section is shown on Main.

Focus ring: 14 screens declare `*:focus-visible { outline: 2px solid #0E6D84; … }` (teal, the
`working` colour); Signin, Preview and Conversations declare `#003468` (brand). The system says
`focus-ring` is an alias of `brand`. On the rail, a brand-coloured ring would be invisible against the
brand-coloured rail, which is presumably why most screens went teal — but the system never states
this, `bundle.css` gives `.mf-rail__item` no focus rule at all, and two rail screens still use brand.

---

### 1.1 `Signin.dc.html`

- **Canvas title:** "1 · Sign in with CWL" · **Tab title:** "Sign in to Manifest" · 1440×800 · no rail.
- **Purpose:** start a session; hand off to UBC's CWL sign-in page.
- **Layout:** two columns. Left brand panel 620px (`#003468`, white text, mark / hero / three
  ticks, spaced top-to-bottom). Right panel: a 400px column centred vertically.
- **Verbatim copy**
  - Mark: "Manifest" · "UBC"
  - Hero `h1`: "Build the tool your course needs."
  - Hero body: "Describe it. We build it, sign your students in with CWL, and run it at a UBC address."
  - Tick list: "Nothing to install" · "Nothing to keep patched" · "No configuration files, ever"
  - `h2`: "Sign in"
  - Body: "You'll go to UBC's own sign-in page and come straight back."
  - Primary button (a link, power-glyph icon): "Continue with CWL"
  - Info box (padlock icon): "Manifest never sees your password. UBC tells us your name, your email, and that it's you."
  - Footer: "Trouble signing in? " + link "Ask us" + "."
- **Data values:** none dynamic.
- **Components (system equivalents):** none from the bundle apply directly; the left panel is the
  only full-brand surface besides the rail. The info box is a `surface-sunken` block. The primary is
  `Button kind=primary` (48px, taller than the system's 44px).
- **Interactions:** "Continue with CWL" → `Main.dc.html`. "Ask us" → `#help` (dead anchor).
- **Human moments:** CWL sign-in itself (off-screen).
- **Logic block:** `renderVals() { return {}; }` — static.
- **API:** the real flow is the SAML redirect; after return, `getMe` (`/v1/me`) gives displayName,
  email, puid, role. "UBC tells us your name, your email, and that it's you" matches `Me`.
- **Copy note:** "Describe it. We build it…" and "No configuration files, ever" promise the
  speculative authoring flow (Describe) as the product's headline, and the Incident screen then
  hands the person text naming `manifest.yaml`.

### 1.2 `Main.dc.html`

- **Canvas title:** "2 · Your apps" · **Tab title:** "Your apps" · 1440×920 · rail active: Your apps.
- **Purpose:** the home a returning person lands on: their apps, anything waiting on them, and an
  early warning about launch lead time.
- **Layout:** rail + main column (padding 40px), stacked: (1) a full-width "Needs you" banner link;
  (2) heading row with two buttons on the right; (3) one app card with a 3-cell environment strip;
  (4) a "Before your students can use it" card with two inner blocks side by side.
- **Verbatim copy**
  - Banner (whole banner is a link to `Queue.dc.html`): overline chip "Needs you" (red, breathing
    dot) · "An agent wants to add someone to **mock-app**. It can't do that on its own." · "waiting 42 seconds" · chevron.
  - `h1`: "Your apps"
  - Sub: "One app. You made it on 18 September."
  - Secondary dashed button: "Describe one instead" (→ `Describe.dc.html`)
  - Primary button (plus icon): "Start something new" (→ `New.dc.html`)
  - App card title (link → `Project.dc.html`): "mock-app"
  - App card sub: "A note-taking app with CWL sign-in and an AI answer · for one class, all arriving at once"
  - Chip: "Steady" (green, still dot)
  - Env cell 1 overline: "Your draft" · value "Nothing here yet" · mono "mock-app.sandbox.manifest.internal"
  - Env cell 2 overline: "For trying out" · green dot + "Answering" · mono link "mock-app.staging.manifest.internal" (→ `Preview.dc.html`)
  - Env cell 3 overline: "For your students" · "Not live yet" · link "See what going live needs" (→ `Launch.dc.html`)
  - Card `h2`: "Before your students can use it" · right meta: "Nothing here is due"
  - Amber block overline: "Two long waits" · body: "Identity registration, and a privacy assessment. Other people answer both, and both take **weeks**. Start them early." · link "Start the clock →" (→ `Launch.dc.html`)
  - Grey block overline: "Five quick checks" · body: "A scan, a rehearsal, a sign-off. Minutes each, near the end. One is already done."
- **Data values and kinds**
  - "42 seconds" — elapsed wait on an agent's pending question (`PendingAction.waitingSeconds`); static here (Queue's copy ticks).
  - "mock-app" — project slug (appears 3×).
  - "One app." — count of the person's projects (`listProjects` length).
  - "18 September" — project creation date (`Project.createdAt`).
  - "A note-taking app with CWL sign-in and an AI answer" — **the blueprint starter's `summary`**
    (fixture `starters[0].summary` for `proof-app`), not a project field. No project description
    exists (and no human name — F7).
  - "for one class, all arriving at once" — rendered from `Audience.scale=class` + `burst=synchronised`.
  - "Steady" — overall app status pill (derived; no API field says this).
  - Per environment: state ("Nothing here yet" / "Answering" / "Not live yet") from
    `Environment.instance` (null → nothing; `healthy` → Answering) and `Environment.hostname`.
  - "Two long waits" / "Five quick checks" / "One is already done" — derived from
    `getLaunchReadiness` items (2 clock items + 5 others; 1 met).
- **Components:** banner ≈ `StateChip state=attention` inside a whole-row link on `attention-tint`;
  app card = `Card` with a `StateChip state=steady`; env cells are ad hoc (not `TwoFacts`); the two
  inner blocks are tinted blocks (`waiting-tint`, `surface-sunken`); primary `Button`; the dashed
  "Describe one instead" is not a system button kind.
- **Interactions:** banner → Queue; "Describe one instead" → Describe (speculative); "Start something
  new" → New; "mock-app" → Project; staging host → Preview; "See what going live needs" → Launch;
  "Start the clock →" → Launch. Rail as §1.00.
- **Human moments:** the agent's pending question (banner).
- **API notes / gaps:** a cross-project "needs you" banner requires `listPendingActions` per project
  (no global list). "Steady" for the whole app is a derivation the API does not give. **Main does not
  show TwoFacts** even though `TwoFacts/README.md` says to repeat it "on every surface that shows a
  running app"; it shows "Steady"/"Answering" while Project and Preview say the last attempt failed 4
  minutes ago (see §6 contradictions). There is no many-apps layout and no zero-apps empty state.

### 1.3 `New.dc.html`

- **Canvas title:** "3 · Create a project — live name check" · **Tab title:** "Start something new" ·
  1440×1000 · rail active: **Your apps**.
- **Purpose:** create a project: name it (with a live availability check), see the one template,
  answer who it is for.
- **Layout:** rail + main; main is a 740px left form column and a right aside (starts 74px down); a
  fixed 88px white footer bar across the bottom with a note and two buttons.
- **Verbatim copy (left column)**
  - `h1`: "Start something new"
  - Sub: "Four answers. Then we make it and you watch."
  - Label (`for=mfName`): "What should we call it?"
  - Hint (above field): "Lower case, hyphens between words. This becomes its web address."
  - Input (mono): placeholder "reading-responses"; initial value "mock-app"
  - Refusal (shown when value is exactly `mock-app`, attention tint, circle-! icon): bold "a project already has this name" · "Pick another name, or ask its owner to add you."
  - Success (shown for any other non-empty value, steady tint, tick): "Yours. Your app will live at " + mono `{{host}}` where host = `<name>.manifest.internal`
  - Section label: "What should it be able to do?"
  - Selected card (2px brand border, tick): title "Pages, a place to keep things, and an AI helper" · chips "Students sign in with CWL" · "Keeps what they write" · "Can ask an AI model, on a budget" · note "The only kind available right now. More are coming."
  - Section label: "Who is going to use it?" — four radio cards (2×2):
    - "Just me" / "I am the only person who will open it" (`solo`)
    - "One class" / "A section or a seminar group" (`class`, default)
    - "A large course" / "Hundreds of students at once" (`large_course`)
    - "Anyone at all" / "Open beyond UBC" (`public`)
  - Section label: "How do they turn up?" — two radio cards:
    - "They come and go" / "Spread across a week" (`steady`)
    - "All at once" / "A deadline, or during a lab" (`synchronised`, default)
  - Label (`for=mfWhy`): "In a sentence, why — so we can size it properly"
  - Input value: "one lab section, all submitting in the same hour" (static, not bound)
- **Verbatim copy (aside)**
  - Card `h2`: "What happens when you press the button"
  - Ordered list: "A working starting point is copied in, sign-in included." · "We check its settings make sense." · "You get three addresses: one to draft in, one to try out, one for your students."
  - Foot: "Takes about a minute. Nothing is public until you say so."
  - Amber card overline: "Worth knowing now" · body: "Once it's live, **the name can never change** — it gets registered outside Manifest. Until then, start again freely."
- **Verbatim copy (footer bar)**
  - Note: "Who it's for sets how much room we give it. You can't change that yet — ask us and we'll do it by hand."
  - Secondary: "Cancel" (→ `Main.dc.html`) · Primary with arrow: "Make it" (→ `Provision.dc.html`)
- **Logic:** state `{ name: 'mock-app', scale: 'class', burst: 'synchronised' }`; `taken` iff
  `name.trim() === 'mock-app'`. **No format validation** — uppercase, spaces, reserved words all show
  "Yours." The screen therefore opens in the refusal state. The radio cards restyle via inline
  `boxStyle` (2px brand when on; 1px `#DCE3EF` + 1px margin when off — the `Choice` no-layout-shift rule).
- **Data values:** slug (typed), availability (`checkSlug` → `SlugCheck.available`/`reasons`),
  resulting hostname, blueprint description (from the blueprint's `provides`: mongodb → "Keeps what
  they write", cwl → "Students sign in with CWL", ai → "Can ask an AI model, on a budget"), audience
  enums, justification text (`AudienceInput.justification`).
- **Components:** `FormField` (mono, with `message` tone attention/steady) — the FormField preview is
  this exact field; `Choice` radio cards ×2; a selected-card for the blueprint (no system component:
  a single, non-interactive "card" with chips); `Card` (aside); `Card tone=waiting`; `Button`
  primary/secondary.
- **Interactions:** typing re-renders the name check live; radio cards switch; "Make it" is **always
  enabled** (even while the name is taken) and goes to Provision; "Cancel" → Main.
- **Human moments:** none (but "the name can never change" once live is a stated irreversibility).
- **API notes / gaps:** `SLUG_INVALID` and `SLUG_RESERVED` refusals are not designed (F11). The
  "Yours." success message shows the production host only. Audience is not editable (F8), hence the
  footer's "You can't change that yet". No state for the create request in flight or failing. The
  refusal title is the platform's `message` verbatim (lower-case "a project…"), per FormField's rule
  "Never rewrite it" — which puts the word "project" on a screen that otherwise says "app".

### 1.4 `Provision.dc.html`

- **Canvas title:** "4 · LIVE — provisioning" · **Tab title:** "Setting up mock-app" · 1440×880 · rail active: Overview.
- **Purpose:** watch the project be created — four things happening — and get the three addresses.
- **Layout:** rail + main; left 700px column (pill, heading, sub, 4px bar, vertical step list);
  right aside (addresses card when done / "you can close this" note while running / "Next" card /
  spacer / buttons at the bottom).
- **Verbatim copy**
  - Pill: running "Working, about a minute left" → done "Ready"
  - `h1`: running "Setting up mock-app" → done "mock-app is ready to build."
  - Sub: running "About a minute. Each line below has actually finished." → done "Everything it needs exists. Nothing is running yet."
  - Steps (text / note), revealed one per 1.15s:
    1. "mock-app exists." / "Its name is reserved and nobody else can take it."
    2. "A working starting point was copied in." / "A note-taking app, with sign-in already wired up. You change it from here."
    3. "We read its settings, and they make sense." / "What it needs to run, how much room it gets, what it is allowed to reach."
    4. "Sign-in is connected." / "Anyone who opens it will be asked for their CWL first. You did not have to set that up."
  - Done card `h2`: "Your three addresses" · "Yours for good. The names can't be taken or changed." · rows: "Your draft" `mock-app.sandbox.manifest.internal` · "For trying out" `mock-app.staging.manifest.internal` (brand border) · "For your students" `mock-app.manifest.internal`
  - Running note (working tint, clock icon): bold "You can close this page." · "It keeps going without you. Everything will still be here."
  - Card `h2`: "Next: build it" · "A few minutes. Watch it, or walk away."
  - Primary (anchor): "Build it" — while running `href="#not-yet"`, greyed, `pointer-events: none`; done → `Build.dc.html`
  - Secondary button: "Watch again" (replays)
- **Data values:** slug; three hostnames (`CreatedProject.environments[].hostname`); step progress
  (0–4); bar width = `at/4 × 100%`.
- **Components:** `StateChip` (working → steady); `ProgressBar kind=working→done`; `LiveSteps`-like
  vertical steps (here with a connecting line between dots — `LiveSteps` has no connector line);
  `Card tone=working` note; `Card`; `Button` primary + secondary.
- **Interactions:** auto-plays on mount; "Watch again" replays; "Build it" enabled only when done.
- **Human moments:** none.
- **API notes / gaps:** `createProject` answers synchronously with `CreatedProject` (project, three
  environments "none deployed yet", spec validation). The four staged steps are choreography over one
  response; only events such as `project.created`, `repository.seeded`, `spec.validated`,
  `sso.registered` could back them. The disabled "Build it" breaks the Button rule "A disabled button
  says what it is waiting for" (Build's disabled button says "Building…"; this one does not), and it
  is an `<a>` with `pointer-events: none`, not a disabled control.
- **Tension with the words:** "about a minute left" is a remaining-time phrase; `Timeline/README.md`
  says "Never show a percentage or a time remaining", and 10-language says a wait "shows elapsed time,
  not a deadline".

### 1.5 `Build.dc.html`

- **Canvas title:** "5 · LIVE — build logs, line by line" · **Tab title:** "Building mock-app" ·
  1440×940 · rail active: Overview. Prop `open` (boolean, default false) opens the log.
- **Purpose:** watch the build — in faculty sentences — and see the security result; the raw log is
  one click away.
- **Layout:** rail + main; a white header band (pill, `h1`, "Watch again" on the right, 4px bar);
  below, a 600px left column (blurb + 7 steps) and a right column (running note / security card /
  log panel filling the height / full-width primary at the bottom).
- **Verbatim copy**
  - Pill: "Working, a few minutes" → "Built"
  - `h1`: "Building mock-app" → "mock-app is built."
  - Blurb: "Each line ticks when that part has actually finished, not on a guess." → "It can run now. Nobody can reach it until you put it somewhere."
  - Secondary: "Watch again"
  - Steps (`MF_STEPS`, each ticking at a log-line index): "Reading how your app is put together" (≤3) · "Fetching the JavaScript toolkit it runs on" (≤7) · "Copying your code in" (≤11) · "Installing the 135 pieces it depends on" (≤14) · "Making sure it runs without special privileges" (≤17) · "Packaging it up" (≤18) · "Storing it, ready to run" (≤20)
  - Running note: bold "A few minutes. You can leave." · "We'll email if it goes wrong. Nothing your students see is touched."
  - Done card `h2`: "Security check" · meta "list updated 3 days ago" · steady row "Nothing in your app needs fixing." · "**2 known issues have no fix yet.** Recorded, watched, not in your way." · "**18 belong to the foundation** every app is built on. The platform team's, not yours."
  - Log panel header: "The technical log" · "{{logCount}} lines · the machine's own words, for whoever asks" · toggle button "Show it" / "Hide it"
  - Log closed text: "You never need this. It's here because the person you ask for help one day will."
  - Log open: dark `#0D1522` pane, numbered lines (first 2 muted). The 20 lines verbatim:
    ```
    #1 [internal] load build definition from Dockerfile
    #1 transferring dockerfile: 892B done
    #1 DONE 0.1s
    #2 [internal] load metadata for 127.0.0.1:7107/base/node:22-alpine
    #2 DONE 0.3s
    #3 [1/8] FROM 127.0.0.1:7107/base/node:22-alpine
    #3 DONE 0.0s
    #4 [internal] load build context
    #4 transferring context: 41.2kB done
    #5 [2/8] WORKDIR /app
    #6 [3/8] COPY package.json package-lock.json ./
    #7 [4/8] RUN npm ci --omit=dev
    #7 added 135 packages in 6s
    #7 DONE 6.4s
    #8 [5/8] COPY . .
    #9 [6/8] RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app
    #10 [7/8] USER 10001
    #11 exporting to image
    #12 pushing layers to 127.0.0.1:7107/local/mock-app
    #12 DONE 2.1s
    ```
  - Bottom primary (anchor): running "Building…" (disabled look, `#not-yet`) → done "Put it somewhere I can try it" (→ `Deploy.dc.html`)
- **Data values:** log line count (running count); build status; "135" (parsed from the log's
  `added 135 packages`); scan: "3 days ago" (`ScanSummary.databaseAgeDays` = 3), fixable 0 (→
  "Nothing in your app needs fixing"), unfixable high 2 (→ "2 known issues"), baseImage 18 (→ "18
  belong to the foundation").
- **Components:** `StateChip`; `ProgressBar`; `LiveSteps`; `Card tone=working`; `Card` (security);
  `InverseSurface` + `LogPane` (with `writtenBefore=2`); `Button` secondary/primary with a disabled
  "Building…".
- **Interactions:** auto-plays one log line per 340ms; "Watch again"; "Show it"/"Hide it" toggles the
  log and auto-scrolls it; final primary → Deploy.
- **Human moments:** none.
- **API notes / gaps:** **F1** — `LogFrame.text` is raw BuildKit; the 7 sentences are a client-side
  mapping of line indices, "guesswork that breaks the first time the builder's output format changes".
  Only `build.started` / `build.succeeded` / `build.failed` events exist — nothing per step. "We'll
  email if it goes wrong" has nothing behind it (**F9** — no notifications; "the single most
  load-bearing unbacked sentence in the prototype"). No failed-build state is drawn
  (`Build.status=failed`, `Build.error`), nor the scan refusal (fixable findings on a fresh DB are
  refused, §12), nor a stale DB (`ScanSummary.stale`).
- **C3:** the raw log (Dockerfile, registry `127.0.0.1:7107`, `npm ci`, uid 10001) is shown to faculty
  behind a closed-by-default "Show it" — the system sanctions this as "placed, not hidden"
  (`InverseSurface`).

### 1.6 `Deploy.dc.html`

- **Canvas title:** "6 · LIVE — instance states (tweak: it fails)" · **Tab title:** "Putting mock-app
  on its trying-out address" · 1440×920 · rail active: Overview. Prop `outcome` enum `"it works"`
  (default) / `"it fails"`.
- **Purpose:** watch the first deploy to staging reach "Answering"; see the two facts; get the URL.
- **Layout:** rail + main; heading row (pill, `h1`, blurb; "Watch again" at right); a full-width
  white card with a 4-station horizontal timeline; below, a left flexible column (two-facts card;
  on failure a red banner link) and a right 460px column (on success a dark-teal "It is real" card;
  while running a working note; a "When you're happy with it" card).
- **Verbatim copy**
  - Pill: "Working, under 90 seconds" → "Steady" or "Needs you"
  - `h1`: "Putting mock-app where you can try it" → "It's up." or "That didn't work."
  - Blurb: "Ninety seconds at the outside. Each step is the app actually reaching that point." → "Running at a permanent address, behind UBC sign-in. Your students are not here yet." or "Nothing is broken for anyone. The version already there is still the one people reach."
  - Secondary: "Watch again"
  - Stations (label / note), one per 1.5s: "Waiting its turn" / "In the queue behind anything else going out" · "Making room" / "Somewhere to run, and a place to keep things" · "Starting up" / "Your app is running its first few seconds" · "Answering" / "It replied to us, so it will reply to people". On failure the last becomes "It never answered" / "It started, then stopped replying to us" (red).
  - Card `h2`: "Your trying-out address"
  - Serving block overline: "Serving right now" · value running/failed: "The version from 18 September, 9:00am. Unchanged by any of this." · landed: "The version you built just now."
  - Attempt block overline: "Last attempt" · "In progress, started a moment ago." → "Succeeded a moment ago. It is the one serving." or "Failed a moment ago. It never said it was ready."
  - Foot: "Two facts, always both. A failed change never takes away what people have."
  - Failure banner (link → `Incident.dc.html`): chip "Needs you" · "It started but never said it was ready. We wrote down what changed." · "Read it →"
  - Success card (dark `#0A4E60`): overline "It is real, and it is at" · mono link "mock-app.staging.manifest.internal" (→ Preview) · "You'll be asked for your CWL, same as your students. Only people you add can get in." · white button "Open it" (→ Preview)
  - Running note: bold "Under a minute and a half." · "Short enough to wait for. Or close the page — nothing depends on you."
  - Card `h2`: "When you're happy with it" · "Going live is a different thing, with a list. Two items take weeks — worth a look now." · link "See what going live needs →" (→ Launch)
- **Data values:** station progress; instance state (`pending` → `provisioning` → `starting` →
  `healthy`/`failed`, via `instance.*` events); serving version (release date); attempt outcome; the
  staging hostname.
- **Components:** `StateChip`; `Timeline` (4 stations, one halted variant); `TwoFacts` (inline copy of
  it, with a different foot sentence from the component default); `Card tone=working`; a
  **dark-teal "It is real" card** that is not `InverseSurface` (it is `working-deep` `#0A4E60`, a
  dark surface the system does not list); `Button`.
- **Interactions:** auto-plays; "Watch again"; on success "Open it"/host → Preview; on failure banner
  → Incident; "See what going live needs →" → Launch.
- **Human moments:** none.
- **API notes / gaps:** **F6** — "serving" vs "last attempt" needs `Environment.instance` joined with
  `listIncidents` or the stream; there is no `Environment.lastAttempt`. "Waiting its turn" maps to
  `pending` (no queue position exists). **Contradiction:** this is the first deploy of a project just
  provisioned ("Nothing is running yet"), yet "Serving right now" claims "The version from 18
  September, 9:00am" — there is no earlier version on a first deploy. The truthful first-deploy
  serving fact is "Nothing", which is what Preview uses for empty environments.
- **Language:** the overline "It is real, and it is at" is six words; 10-language says "Overlines are
  never more than three words."

### 1.7 `Preview.dc.html`

- **Canvas title:** "7 · Preview — see the app you made" · **Tab title:** "Preview mock-app" ·
  1440×960 · rail active: Preview.
- **Purpose:** see the running app, in each of the three environments, desktop or phone, with the two
  facts beside it.
- **Layout:** rail + main; a white top toolbar (`h1` "Preview", environment segmented control,
  spacer, Desktop/Phone segmented control, reload icon button); body: a flexible left area holding a
  browser frame and a caption, and a 350px right aside of four cards (two facts; signed-in-as note;
  "Not right?"; spacer; amber "Students can't see this yet" link card).
- **Verbatim copy**
  - `h1`: "Preview"
  - Env segmented control: "Your draft" · "Trying out" (default) · "Students"
  - View segmented control: "Desktop" · "Phone"
  - Reload icon button: `aria-label="Reload the preview"`
  - Frame address bar (mono, green padlock): `{{host}}` — `mock-app.sandbox.manifest.internal` / `mock-app.staging.manifest.internal` / `mock-app.manifest.internal`
  - **Staging: the drawn app** (the faculty member's app, deliberately in its own warm style): header "Reading responses" · avatar "I1" + "Instructor One" · "Week 3 — Enclosure and the commons" · "due Thursday" · card label "Your response" · text "The reading treats enclosure as an economic event, but the parish records suggest it was read at the time as a change in who could speak…" · fake buttons "Post it" · "Ask for a nudge" · overline "Hidden until you post" · three grey skeleton bars.
  - **Sandbox empty state:** title "Your draft is empty" · note "This address is yours to break things on. Nothing has been put here." · link "Put something here" (→ `Deploy.dc.html`)
  - **Production empty state:** title "Not live yet" · note "This is the address your students will use. It stays empty until you go live." · link "See what going live needs" (→ `Launch.dc.html`)
  - Caption: desktop "What a person reaching this address sees, after they have signed in with CWL." · phone "At 390 points wide — a phone in a lecture theatre, which is where most students will open it."
  - Aside card `h2`: "What you are looking at" · overline "Serving right now" · staging "The version from 18 September, 9:00am." / sandbox & production "Nothing. No version has been put here." · overline "Last attempt" · **static** "Failed 4 minutes ago. " + link "What went wrong" (→ `Incident.dc.html`)
  - Info card: "You are signed in as yourself. A student sees the same pages with their own name and only their own work."
  - Card `h2`: "Not right?" · "Say what you want changed and an agent does it. You come back here to check." · primary "Ask for a change" (→ `Conversations.dc.html`) · link "4 conversations about this app" (→ `Conversations.dc.html`)
  - Amber link card (→ Launch): "Students can't see this yet" · "Going live needs six more things. Two take weeks."
- **Data values:** environment hostnames; serving version per environment (release date from
  `Environment.instance.releaseId` → `Release.createdAt`); last-attempt outcome and age ("4 minutes
  ago", from the latest incident); "4 conversations" (speculative — no API); "six more things. Two
  take weeks." (from launch readiness); the signed-in person's name (inside the drawn app).
- **Components:** `SegmentedControl` ×2 (tablist for env, radiogroup for view); `BrowserFrame`
  (desktop and 390pt phone); `TwoFacts`-shaped aside (without the component's foot); `Card` ×2;
  `Card tone=working`-style note; `Button` primary; amber link card.
- **Interactions:** env switch changes host and body (only staging shows the app); view switch
  animates frame width; reload increments a nonce (no visible effect); "What went wrong" → Incident;
  "Ask for a change" / "4 conversations…" → Conversations (speculative); empty-state links →
  Deploy / Launch; amber card → Launch.
- **Human moments:** none.
- **API notes / gaps:** **F12** — an embedded preview of a CWL/SAML-protected app needs a session and
  a `frame-ancestors` allowance the platform does not provide; the app is drawn as markup. "Last
  attempt: Failed 4 minutes ago" is hard-coded and shows the same failure on the sandbox and
  production tabs where nothing was ever attempted. "4 conversations" relies on **F13** (no
  conversation object). The phone mode applies to the empty states too.

### 1.8 `Project.dc.html`

- **Canvas title:** "8 · The project — two facts, never one" · **Tab title:** "mock-app" · 1440×1040 · rail active: Overview.
- **Purpose:** the project overview: what is serving vs what was last tried, the three environments,
  the launch wait, recent history, and entry points to conversations and people.
- **Layout:** rail + main; a white header band (`h1` slug + meta line; primary button at right);
  body: a 740px left column (staging card with two facts and two buttons; a 2-column pair of env
  cards; an amber "Waiting on someone" row) and a right column (an activity feed card filling the
  height; a "Conversations" link card; a "People" link card).
- **Verbatim copy**
  - `h1`: "mock-app"
  - Meta: "Yours · made 18 September · for one class, all arriving at once"
  - Primary (→ `Build.dc.html`): "Build the latest changes"
  - Staging card `h2`: "For trying out" · mono "mock-app.staging.manifest.internal" · chip "Answering" (steady)
  - Left fact overline: "What people get" · title "The version from 18 September, 9:00am" · note "Running without complaint for 9 hours."
  - Right fact overline: "What you tried last" · title "A change that didn't take, 4 minutes ago" · link "What went wrong →" (→ `Incident.dc.html`)
  - Foot: "Two facts, not one. The older version keeps answering until a new one proves it can."
  - Secondary: "Try again" (→ `Deploy.dc.html`) · Tertiary: "Open the app" (→ `Preview.dc.html`)
  - Env card `h2`: "Your draft" · mono "mock-app.sandbox.manifest.internal" · "Empty. A private place to break things."
  - Env card `h2`: "For your students" · mono "mock-app.manifest.internal" · "Not live yet. Six things outstanding, two of them slow." · link "See the list →" (→ Launch)
  - Amber row: chip "Waiting on someone" (still dot) · "Your privacy assessment hasn't been started. Until it is, nothing is counting down." · link "Start it →" (→ Launch)
  - Feed `h2`: "What's been happening" — five entries (dot colour · sentence · meta):
    1. red · "A change was put out and didn't take. The older version kept answering." · "4 minutes ago"
    2. amber · "An agent asked to add someone to the project, and was stopped." · "about a minute ago · " + link "answer it" (→ `Queue.dc.html`)
    3. green · "mock-app was built and checked. Nothing needed fixing." · "18 Sep, 9:00am"
    4. green · "You gave an agent permission to work on this project." · "18 Sep, 9:00am"
    5. grey · "Sign-in was connected. Students will use their own CWL." · "18 Sep, 9:00am"
  - Link card: "Conversations" · "Four threads of work. One working, one waiting on you." (→ `Conversations.dc.html`)
  - Link card: "People" · "Just you. Nobody else can open it." (→ `Members.dc.html`)
- **Data values:** slug; ownership ("Yours"); creation date; audience phrase; staging instance state
  ("Answering" = `healthy`); serving release date; **uptime "9 hours"** (no API field — `Instance`
  has only `lastSeenAt`, no started-at); last attempt outcome + age (latest incident
  `createdAt`); per-environment emptiness; launch counts ("Six things outstanding, two of them slow");
  privacy-assessment state (`getLaunchRecords` / readiness item `privacy-assessment` `unmet`); event
  feed (event sentences with relative times — note the feed's own sentences are **not** the API's
  event sentences, which the handover says to "use"); "Four threads" (speculative, F13); member count
  ("Just you").
- **Components:** `ProjectBar`-like header (without tabs); `Card`; `StateChip steady`; `TwoFacts`
  (content identical to the TwoFacts preview); `Button` primary/secondary/tertiary; `Card` ×2; an
  amber row ≈ `StateChip waiting` on `waiting-tint`; a feed (no system component — "EventLine" exists
  only in the admin proposal); two whole-card links.
- **Interactions:** listed above; nothing stateful (`renderVals` returns `{}`).
- **Human moments:** "answer it" (agent question); "Start it →" (privacy assessment — UBC paperwork).
- **API notes / gaps:** F6 (two facts need a join), F13 (conversations), uptime not in API.
  "Waiting on someone" is used for something that "hasn't been started" and "nothing is counting down"
  — with no elapsed number, which StateChip's rule requires of waiting states; 20-states' "Not yet"
  ("Real, but no clock has started") fits the sentence better, but 20-states also says an `unmet` item
  owned by somebody else is "Waiting on someone". The API cannot distinguish never-started from
  submitted (F3), so the copy is asserting something the data cannot say.

### 1.9 `Launch.dc.html`

- **Canvas title:** "9 · Going live — clocks, then checks" · **Tab title:** "Going live with mock-app" ·
  1440×1240 (the tallest board) · rail active: Going live.
- **Purpose:** the launch checklist, split into two long clocks (UBC paperwork) and five short
  checks; ask to go live and be told exactly why not.
- **Layout:** rail + main; a heading block with a 250px "Where you are" card at right; section "Two
  clocks…" with two ClockItem cards side by side; section "Five short jobs…" as one card of five
  rows; a bottom card with "Ask to go live"; after asking, a red explanation panel.
- **Verbatim copy**
  - `h1`: "Letting your students in"
  - Lede: "Going live isn't a button. Most of it takes minutes — but **two items are answered by other people and take weeks.** That's why this page exists from day one."
  - Second line: "Nothing here is due today. Only the two slow ones are worth touching now."
  - Aside overline: "Where you are" · big figure "1 of 7" · "One done by itself. Two are clocks. Four are short jobs for later."
  - Section `h2`: "Two clocks that haven't started" · aside "— start them whenever; they run without you"
  - Clock 1 `h3`: "Registering with UBC's identity team" · chip "Not started" (amber, still) · body "Your app needs its own entry in UBC's identity register before real students can sign in. You ask; their team does it." · hatched bar · "Nothing counting yet" / "Takes weeks" · admission (dashed box) title "Manifest can't do this one for you yet" · body "We'll draft the request. You send it, and tell us when it lands." · primary (anchor `#start-iam`) "Draft the request"
  - Clock 2 `h3`: "A privacy assessment" · chip "Not started" · body "Your app keeps what students write, so the Privacy Office has to look at it. The most common reason a launch slips." · hatched bar · "Nothing counting yet" / "Takes weeks" · admission title "Manifest can't do this one for you yet" · body "We know what it stores and who signs in, so most of the form answers itself. Three questions are yours." · primary (anchor `#start-pia`) "Fill in what we know"
  - Section `h2`: "Five short jobs, for the end" · aside "— minutes each, and not worth doing early"
  - Row 1 (filled green tick): "Security check" · "Passed. Nothing in your app needs fixing, and we check again on every build." · owner "done for you"
  - Row 2 (open ring): "A dry run on the live setup" · "We put it on the live address with nobody watching, check it answers, take it down." · "us, in minutes"
  - Row 3 (open ring): "A test with everyone at once" · "You told us a whole lab section submits in the same hour. We pretend to be them, before they are." · "us, in minutes"
  - Row 4 (open ring): "A sign-off from our team" · "A person reads the same list you're reading and says yes. They see how long you've been waiting." · "us, same day"
  - Row 5 (dashed ring, muted, `surface-raised` ground): "A friendlier web address" · "You already have a permanent address. A nicer one isn't possible yet, and won't hold you up." · "not yet possible"
  - Bottom card: "Ask any time. If something is missing we say exactly what — this same list." · secondary-outline button "Ask to go live"
  - After asking (attention tint): `h3` "Not yet — and here's exactly why" · text button "Close" · "Six of seven aren't settled, including both slow ones — so the soonest is weeks away. Start those two; the rest will be ready before they are." · "Your trying-out address is untouched."
- **Data values:** readiness counts ("1 of 7", "Six of seven"); per-item state (met / unmet /
  not_built) and owner (→ "done for you", "us, in minutes", "us, same day", "not yet possible"); the
  audience justification echoed in row 3 ("a whole lab section submits in the same hour" ←
  `Audience.justification` "one lab section, all submitting in the same hour"); "Takes weeks"
  (hard-coded, F3).
- **Components:** `ClockItem` ×2 (exactly its anatomy: title, `StateChip waiting "Not started"`,
  body, `ProgressBar kind=clock`, admission block, primary action); a checklist card whose rows use
  three mark shapes (filled tick / open ring / dashed ring — the "Never colour alone" rule); `Button`
  secondary (brand outline — not a system variant); `Card tone=attention` result panel.
- **Interactions:** "Ask to go live" and "Close" toggle the refusal panel. The two clock actions are
  dead anchors (`#start-iam`, `#start-pia`).
- **Human moments:** **UBC paperwork** — IAM registration and the Privacy Impact Assessment, both
  owned by other offices; "A sign-off from our team" (an administrator's approval).
- **API notes / gaps:** **F2** — the API's `why` strings are internal vocabulary ("The PIA workflow is
  the external track", "Custom domains are not built in Phase 1"); every sentence here is written by
  the designer. **F3** — no started-at, duration or in-progress state, so "Nothing counting yet" vs
  "submitted three weeks ago" cannot be told apart. The API's `LaunchReadinessItem.id` enum is now
  **eight** items — `domain`, `iam-registration`, `privacy-assessment`, `rehearsal`, `scans`,
  `admin-approval`, `load-rehearsal`, `code-review` — the prototype has seven (no `code-review`,
  which is non-blocking since D33), so "1 of 7" / "Six of seven" are stale against contract v1.3.0.
  "Draft the request" and "Fill in what we know" have no API (the API only *records* outcomes:
  `recordIamRegistration`, `recordPrivacyAssessment`, and the handover's admin mockup notes these are
  recorded by an administrator). **Row 3 ("A test with everyone at once" =
  `load-rehearsal`) should not be on this project's list at all:** `Audience`'s schema note says "A
  large or public audience adds a load rehearsal", and the spec's audience table (*What each answer
  actually changes*) gives the extra launch gate as "—" for `class` and "load rehearsal" only for
  `large_course`/`public`. mock-app is `class` + `synchronised`, so its real list would be six items,
  not seven (or seven with `code-review`).
- **Tension:** ClockItem hard-codes `StateChip state='waiting'` for "Not started", whereas
  20-states defines "Not yet" as "Real, but no clock has started" (grey, dashed). The clocks are drawn
  amber-hatched, not grey.

### 1.10 `Incident.dc.html`

- **Canvas title:** "10 · A deploy that failed" · **Tab title:** "What went wrong with mock-app" ·
  1440×900 · rail active: Overview.
- **Purpose:** explain a failed deploy in plain words, reassure, and hand the repair prompt to an agent.
- **Layout:** rail + main; a full-width steady-tint reassurance banner; below, a 720px left column
  (chip, `h1`, explanation; three labelled fact rows; a disclosure with the raw words) and a right
  column (a dark-teal "Give this to your agent" card; an "Or leave it" card).
- **Verbatim copy**
  - Banner (shield-tick icon): "**Nobody has lost anything.** " + mono "mock-app.staging.manifest.internal" + " is still answering with the version from before."
  - Chip: "Needs you"
  - `h1`: "It started, then went quiet."
  - Body: "Every app has to answer one question when it starts: *are you ready?* Yours never did, so we stopped rather than send people to something half-awake."
  - Row "What changed": "The place we ask “are you ready?” was moved, to a page that doesn't exist. Almost certainly the whole story."
  - Row "What it said": "It couldn't reach where it keeps things — probably a symptom, not the cause."
  - Row "When": "4 minutes ago, on the trying-out address. Not on anything your students can reach."
  - Disclosure button: "The exact words, for whoever you ask for help" · "Show" / "Hide"
  - Disclosed (dark mono block, four lines): "the readiness probe never answered 200" · "GET /healthz from inside the edge" · "runtime.health: /healthz → /never-ready" · "Error: connect ECONNREFUSED 127.0.0.1:27017"
  - Dark card `h2`: "Give this to your agent" · "Written as a repair request, not an error. Everything it needs to fix this in one go." · mono inset (visible by default): "The app did not answer its health path. Check runtime.health in manifest.yaml." · outline button "Copy it" → "Copied" · white button "Send it" (→ `Iterate.dc.html`)
  - Card `h2`: "Or leave it" · "Nothing is degrading. The working version carries on, and this page will be here tomorrow." · link "Back to mock-app →" (→ `Project.dc.html`)
- **Data values:** `Incident.exitReason` ("the readiness probe never answered 200"),
  `failedCheck` ("GET /healthz from inside the edge"), `diffSinceHealthy` ("runtime.health: /healthz →
  /never-ready"), `logTail` ("Error: connect ECONNREFUSED 127.0.0.1:27017"), `createdAt` ("4 minutes
  ago"), `prompt`, environment (staging hostname). The three plain-language rows are the designer's
  translations of those fields — no API field supplies them.
- **Components:** banner = `Card tone=steady`; `StateChip attention`; fact rows (ad hoc); disclosure
  → `InverseSurface`-style mono block; the repair-prompt card is **`working-deep` teal `#0A4E60`**
  with an inset `#04252F` bordered `#2C7A8E` (fixed on 2026-09-26) — `InverseSurface` is specified as
  near-black navy `#0D1522`, so this card is off-system; `Button` variants; `Card`.
- **Interactions:** disclosure toggle; "Copy it" writes the prompt to the clipboard; "Send it" →
  Iterate (speculative); "Back to mock-app →" → Project.
- **Human moments:** handing the repair to an agent (the person decides).
- **C3 / language:** the repair prompt — "health path", "runtime.health", "manifest.yaml" — is
  visible **by default**, not behind a disclosure. 10-language's table says YAML "never appears" and
  "health path" should read "the place we ask 'are you ready?'". The system's defence is that
  `InverseSurface` marks machine text a person is shown on purpose; but the rule there is "Always
  reachable, never the default", and this inset is the default.
- **API notes / gaps:** "Send it" has no API (no conversation/authoring-instruction object — F13).
  Incident has no resolved/open state (the admin mockup's A9 notes the same).

### 1.11 `Token.dc.html`

- **Canvas title:** "A secret shown exactly once" · **Tab title:** "Let an agent work on mock-app" ·
  1440×940 · rail active: Agents.
- **Purpose:** mint a delegated key for an agent (choose capabilities and expiry), see its secret
  once, list and revoke keys.
- **Layout:** rail + main; a 700px left form column; a right column that shows (by phase) the secret
  card or the "Gone" card, above a "Keys that exist" card.
- **Verbatim copy (form)**
  - `h1`: "Let an agent work on mock-app"
  - Sub: "An agent writes and changes your app for you. It needs a key of its own — not yours — so its work is always separable from yours."
  - Label: "What do you call it?" · input value "the agent that builds this app" (static) · hint "Only so you can tell them apart later."
  - Label: "What may it do?" — seven checkbox cards (label ← capability id, default):
    "Look at this project" ← `project:read` ✓ · "Build it" ← `build:create` ✓ · "Put a version on an address" ← `release:deploy` ✓ · "Prepare a version to put out" ← `release:create` ☐ · "Change its settings" ← `project:write` ☐ · "Approve a version" ← `release:approve` ☐ · "Delete the whole project" ← `project:delete` ☐
  - Box `h`: "Four things no agent can ever do" · "Not “off by default” — impossible. If an agent tries one, it is stopped and **a question appears for you.** You answer in your own words."
  - Four locked rows (padlock, dashed): "Change who can get in" · "Put something live for students" · "Change how much room it gets" · "Read its passwords and keys"
  - Expiry: "How long should the key last?" · "Every key runs out. A year is the most we allow." · static pill "90 days"
  - Primary button: "Make the key" (styled disabled when no capability is ticked; label unchanged)
- **Verbatim copy (secret, phase `secret`)** — dark `#0D1522` card, amber warning triangle:
  - `h2`: "This is the only time you will ever see this"
  - "We keep a fingerprint, not the key. Once you close this we cannot show it again — to you or anyone."
  - Mono, `user-select: all`: "mft_77777777-7777-4777-8777-777777777777_ZmFrZS1zZWNyZXQtZm9yLXRoZS1tb2NrLW9ubHk"
  - Button: "Copy it" → "Copied to your clipboard"
  - Checkbox: "I have put it somewhere safe"
  - Button: "Done" (inert and greyed until the box is ticked)
- **Verbatim copy (phase `gone`)**: `h2` "Gone, as promised" · "The key works; we just can't read it back. Lost it? Revoke and make another — thirty seconds, not a disaster."
- **Verbatim copy (list)**
  - `h2`: "Keys that exist"
  - Row: "the agent that builds this app" · status "In use" (green dot) · "May look, build, and put versions on an address. Runs out 18 December." · ghost-danger "Revoke it"
  - Revoke confirm (attention tint): "Revoke it now?" · "The agent stops mid-sentence, and can't tell you why. No undo — you'd make a new key and set it up again." · danger "Yes, revoke it" · secondary "Leave it alone" (both only close the panel)
  - Link: "One question this agent is waiting on →" (→ `Queue.dc.html`)
- **Data values:** token name; capability set; expiry ("90 days" → `expiresInDays`; "Runs out 18
  December" ← `Token.expiresAt`); secret (`MintedToken.secret`, fixture value); "In use"
  (derived — `Token` has `lastUsedAt`, `revokedAt`, `expired`); capability summary sentence
  (client-rendered from `Token.capabilities`, an open `string[]` on read — F10); pending question
  count.
- **Components:** `FormField`-like input; `Choice type=checkbox`; `LockedRow` ×4; `InverseSurface warn`
  with inset (the one sanctioned use of `warning-mark`) and the confirmation checkbox gating "Done";
  `Button` primary, secondary, `ghostDanger` ("Revoke it"), `danger` ("Yes, revoke it") — exactly the
  Button README's "red is spent on the confirm" rule.
- **Interactions:** checkbox toggles; "Make the key" → secret phase; copy; tick → "Done" → gone phase;
  "Revoke it" → confirm panel; both confirm buttons close it; link → Queue.
- **Human moments:** **a secret shown exactly once**, with a deliberate precondition checkbox;
  revoking (irreversible).
- **API notes / gaps — important:** the contract's `MintTokenRequest.capabilities` enum (v1.3.0) is
  `project:read · project:write · project:delete · source:write · secret:write · members:manage ·
  build:create · release:create · release:deploy · release:promote · release:approve · launch:record ·
  quota:set · secret:read`, and says `release:approve` and `launch:record` are **"person-only and
  refused outright"** to a token. The screen **offers "Approve a version" (`release:approve`) as a
  tickable capability** — a request the API refuses. The screen **does not offer `source:write` or
  `secret:write`**, the two capabilities an agent that "writes and changes your app" actually needs
  since the authoring API. The locked four here ("Put something live for students" ≈
  `release:promote`) differ from Members' four ("Approving a version for your students") — F5 says
  this is deliberate and asks for a decision. Expiry is not an input (static "90 days"; API allows ≤365).

### 1.12 `Members.dc.html`

- **Canvas title:** "Signing in again, mid-task" · **Tab title:** "Who can get into mock-app" · 1440×880 · rail active: People.
- **Purpose:** see and add people on the project; demonstrates re-authentication (step-up) mid-task.
- **Layout:** rail + main; a 720px left column (heading, one card: member rows + "Add someone" form)
  and a right column ("Four things…" card; after adding, a steady "Done, and written down" card). A
  full-screen scrim modal overlays everything during step-up.
- **Verbatim copy**
  - `h1`: "Who can get into mock-app"
  - Sub: "Only the people listed here. Students aren't on this list — they get in once the app is live."
  - Member row: avatar "I1" · "Instructor One" · "instructor@example.test" · badge "Owner · you"
  - Added row (after step-up): avatar "S1" · "Student One" · "student@example.test · added just now" · badge "Helper" · ghost-danger "Remove" (no handler)
  - Form title: "Add someone"
  - Label: "Their CWL" · mono input value "stu000001" (static; `id=mfPuid`)
  - Label: "What they can do" · a **static span** "Helper" (the label's `for` points at a span, not a control)
  - Primary: "Add them"
  - Hint: "They must have signed in to Manifest once before you can add them."
  - Right card `h2`: "Four things we ask you to prove it's you for" · list "Changing who can get in" · "Reading your app's keys and passwords" · "Changing how much room it gets" · "Approving a version for your students" · foot "Everything else just works. These four would hurt if someone else were at your desk."
  - After add (steady): "Done, and written down" · "In this project's history, with your name and the time. Everyone on the project can see it."
  - **Step-up modal** (scrim `rgba(14,22,38,0.55)`, 520px white dialog, padlock tile): `h2` "One more time" · "Changing who can get in is one of four things we ask you to prove twice. Same CWL page, usually one click." · "We're not doubting you. We're making it useless for anyone who finds your laptop open." · primary "Sign in again" · secondary "Not now"
- **Data values:** members (`listMembers`: displayName, email, role); role labels ("Owner" ←
  `owner`; "Helper" ← presumably `collaborator`); "you" (compare `Me.id`); CWL identifier input — the
  API's `addMember` takes a **`puid`** (`ubcEduCwlPuid`, e.g. fixture `ins000001`), not a CWL login
  name; the field is labelled "Their CWL" but holds a PUID-shaped value `stu000001`; "added just now"
  (no `addedAt` on `Member`).
- **Components:** `Card` with rows; `FormField` (mono) ×1 + a fake select; `Button` primary,
  `ghostDanger`; `Card`; `Card tone=steady`; a **modal dialog** (no system component; uses the
  `scrim` and `shadow-overlay` tokens; no `role="dialog"`/focus trap in the markup).
- **Interactions:** "Add them" → modal; "Not now" closes; "Sign in again" closes and adds the row
  (simulated; no CWL round-trip).
- **Human moments:** **step-up re-authentication** (one of "four things we ask you to prove twice").
- **API notes / gaps:** **F4** — no re-authentication refusal code exists in the API, so the client
  must hard-code which operations prompt. `Member.role` is `owner|collaborator`; "Helper" is a
  translation not stated anywhere. Error states (person has never signed in; already a member) absent.
  The screen's sentence "Students aren't on this list — they get in once the app is live" conflicts
  with adding "Student One" as a "Helper".

### 1.13 `Queue.dc.html`

- **Canvas title:** "An agent is refused; you answer" · **Tab title:** "Questions your agents are
  waiting on" · 1440×1040 · rail active: Agents.
- **Purpose:** answer an agent's refused privileged request — yes (one retry) or no (in your words).
- **Layout:** rail + main; a 760px left column (heading, the open question card, an "Already
  answered" list) and a right column (an explanatory 3-step mini-timeline card; "If you never answer"
  card; a link card to the asking agent).
- **Verbatim copy**
  - `h1`: "One question is waiting on you" → (after answering) "Nothing is waiting on you"
  - Sub: "An agent can do most of the work on your app. Four things it can never do on its own — and when it tries, it stops and asks you here."
  - Question card: chip "Needs you" (breathing) · "waiting {{waited}} · about a day left to answer" (waited ticks from 42 seconds; "N seconds" under 90, else "N minutes")
  - "the agent that builds this app is asking to" · `h2` "add a member to this project"
  - Rule box: "**If you say yes, it gets one try at this one request.** Not a standing permission — the next time it asks, you get asked again." · "Your app carries on either way. Nothing is paused except the agent."
  - Buttons: primary "Yes, let it do this once" · secondary "No"
  - After "No": label "Why not? Your words go straight to the agent." · "Word for word. Say what you'd say to a colleague." · textarea placeholder "that student is not on this course" · button "Send this back" (red when text present, grey otherwise) · "Back"
  - Overline `h2`: "Already answered" — cards (ask / chip / note / optional quoted words):
    - (after yes) "add a member to this project" · "Yes, once" · "You said yes. It has one try and has not used it."
    - (after no) "add a member to this project" · "No" · "You said no a moment ago, and the agent has been told — in these words:" · “{{reason}}” (defaults to "that student is not on this course")
    - "add a member to this project" · "Yes, once" · "You said yes yesterday. The agent used its one try and the person was added."
    - "add a member to this project" · "No" · "You said no yesterday. The agent was told, word for word:" · “that student is not on this course”
    - "add a member to this project" · "Ran out" · "Nobody answered within the day. It ran out and the agent was told no."
  - Right card `h2`: "Why you're being asked at all" · steps "The agent tried it" / "Working away on your app, it reached for one of the four." · "It was stopped" / "Not by good manners — it is refused at the door, whoever asks." · "You decide, in your words" / "Yes buys it one try. No is passed on exactly as you wrote it."
  - Card: "If you never answer" · "It runs out after a day and the agent is told no. Ignoring this is safe — it is never a way to accidentally say yes."
  - Link card (→ `Token.dc.html`): "The agent asking" · "the agent that builds this app · may look, build and put versions on an address"
- **Data values:** `PendingAction.summary` ("add a member to this project" — the fixture's verbatim,
  hence the lower-case heading); `waitingSeconds` (42, ticking); `expiresAt` ("about a day left");
  token name via `tokenId` → `listTokens`; `state` (pending / confirmed / rejected / expired →
  "Yes, once" / "No" / "Ran out"); `reason`; `consumedAt` ("has not used it" vs "used its one try").
- **Components:** `StateChip attention` + elapsed caption; `Card tone`-bordered question card;
  `Button` primary/secondary/danger; textarea (no system component); the verbatim-words left rule
  (the system's one left rule — `Card/README.md`); a mini vertical timeline (not `LiveSteps`); `Card`;
  whole-card link.
- **Interactions:** yes → answered; no → reason form → "Send this back" (requires text) → answered;
  "Back"; link → Token.
- **Human moments:** **confirming an agent's request** (D24). Note that the request is to add a
  member — one of the four step-up actions on Members — yet "Yes, let it do this once" does **not**
  trigger the step-up modal here.
- **API notes / gaps:** backed by `listPendingActions`, `confirmPendingAction`,
  `rejectPendingAction` (with `reason`). "Who is being added" is not shown — only in `path`/body
  hash. "about a day left to answer" is a countdown; `StateChip/README.md` says waiting states carry
  "Elapsed, never a countdown" (though its own preview uses this exact phrase).

### 1.14 `Describe.dc.html` — SPECULATIVE

- **Canvas title:** "SPECULATIVE · Describe it" · **Tab title:** "Describe your app — speculative"
  (the word *speculative* survives in the browser tab although all on-screen markings were removed) ·
  1440×940 · rail active: Your apps.
- **Purpose:** describe an app in plain language instead of picking a template.
- **Layout:** rail + main; a 760px left column (heading, textarea, two fixed answers, primary button)
  and a right column with one card (and an empty slot where the removed speculative block was).
- **Verbatim copy**
  - `h1`: "What do you need?"
  - Sub: "Say it as you'd say it to a colleague. We'll come back with a plan you can correct."
  - Overline-style label (`for=mfBrief`): "In your own words"
  - Textarea (7 rows, prefilled): "A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar."
  - Hint: "Three sentences is plenty."
  - Label: "Two things we can't guess"
  - Static answer cards: "Who uses it" / "One class" · "When they use it" / "All at once, before a deadline"
  - Primary with arrow: "Show me what you'd build" (→ `Draft.dc.html`)
  - Right card `h2`: "Nothing is built yet" · "Next: a written plan — what students see, what it keeps, who reads what. Wrong? Say so in a sentence. Nothing exists until you agree."
- **Data values:** free-text brief; audience scale/burst (static here, not choosable).
- **Components:** textarea (no system component), two static fact tiles, `Button` primary, `Card`.
- **Interactions:** "Show me what you'd build" → Draft. Nothing is interactive (`renderVals` returns `{}`).
- **Human moments:** none.
- **API:** none — README §3: "No API creates or changes an app — zero `PATCH`/`PUT`, no repository
  reference." (Stale reasoning: see §4.)

### 1.15 `Draft.dc.html` — SPECULATIVE

- **Canvas title:** "SPECULATIVE · The plan" · **Tab title:** "The plan — speculative" · 1440×1060 · rail active: Your apps.
- **Purpose:** read the agent's plan as a description of the finished thing; correct it or agree.
- **Layout:** rail + main; a 760px left column (heading; one card of five labelled rows; two
  side-by-side blocks) and a right column with one decision card.
- **Verbatim copy**
  - `h1`: "Here's what I'd build" (first person — the agent's voice; the rest of the product says "we")
  - Sub: "Read it as a description of the finished thing, not as instructions. Anything wrong, say so in a sentence."
  - Row "What students see": "One page listing the weeks. Click a week and you get a box to write in. Once you've posted, the same page fills up with everyone else's — and not before."
  - Row "What you see": "Every response for a week on one page, sorted by name, printable. A count of who hasn't posted."
  - Row "What it keeps": "The text students write, their name, and when they posted it. Nothing else. No email, no student number."
  - Row "Who gets in": "Anyone with a CWL. You are the only one who can see all the responses."
  - Row "AI": "None. You didn't ask for it, and it needs a budget and a chosen model. Easy to add later."
  - Block "Things I assumed": "Twelve weeks, matching a standard term" · "No word limit, but a warning past 500" · "Students can't delete a response once posted"
  - Amber block "Two things only you know": "Is a late post still a post, or does it close at the deadline?" · "Should a TA see everything you see?"
  - Right card `h2`: "Say yes and this happens" · "The plan becomes a real project with three addresses, and you watch it get made. From here on, everything is real." · primary "Yes, build that" (→ `Provision.dc.html`) · secondary "Not quite — let me correct it" (→ `Describe.dc.html`)
- **Data values:** an agent-authored plan (no API object); assumptions; open questions.
- **Components:** `Card` with labelled rows (like Incident's fact rows); `Card` (sunken) and
  `Card tone=waiting`; `Button` primary/secondary.
- **Interactions:** "Yes, build that" → Provision (the real seam: `POST /v1/projects`); "Not quite" → Describe.
- **Human moments:** agreeing to a plan (nothing exists until you agree); the two questions only the
  person can answer.
- **Contradictions:** "AI: None" and "Who gets in: Anyone with a CWL" vs. the only blueprint (New:
  "Pages, a place to keep things, and an AI helper") and mock-app's description ("with CWL sign-in and
  an AI answer"); "Anyone with a CWL" vs. Members ("Only the people listed here") and audience "One
  class". "Yes, build that" leads to Provision which then says "mock-app exists." — the plan never
  names the app, and no slug is chosen on this path.

### 1.16 `Conversations.dc.html` — SPECULATIVE

- **Canvas title:** "SPECULATIVE · Every thread of work on one app" · **Tab title:** "Conversations
  about mock-app — speculative" · 1440×960 · rail active: Conversations.
- **Purpose:** list every thread of work on the app and where each left it.
- **Layout:** rail + main; left flexible column (heading + primary; a filter segmented control; a
  list of whole-card links) and a 340px right column of two explanatory cards.
- **Verbatim copy**
  - `h1`: "Conversations" · sub "Every thread of work on mock-app, and where each one left it."
  - Primary (plus icon): "Start a conversation" (→ `Describe.dc.html`)
  - Filter: "All 4" · "Needs you 1" · "Working 1" · "Over 2"
  - Rows (title · chip · note · when · who · changes → link):
    1. "Fix the health check" · "Working" (teal, pulsing) · "Started from the failed deploy. It has read the incident and is changing the setting that broke." · "started 4 minutes ago" · "the agent that builds this app" · "no changes yet" → `Iterate.dc.html`
    2. "Let students edit for 24 hours" · "Needs you" (red, pulsing) · "Done and on the trying-out address. It then asked to go live for your class, and is waiting on your answer." · "today" · "you and the agent" · "4 changes" → `Queue.dc.html`
    3. "Reading responses, first build" · "Finished" (grey) · "Built the whole app from your description and put it where you can try it." · "18 September" · "you and the agent" · "14 changes" → `Draft.dc.html`
    4. "Make the seminar list printable" · "Stopped" (grey) · "It asked you something and nobody answered within the day, so it stopped. Your app was left exactly as it found it." · "17 September" · "the agent that builds this app" · "nothing changed" → `Queue.dc.html`
  - Card `h2`: "Why these are kept apart" · "One conversation is one piece of work. Keeping them separate is what lets you abandon one without losing another — and lets you see which one caused a change six weeks later." · "Several can run at once. Only one can be putting something live at a time."
  - Card `h2`: "Nothing is lost when one ends" · "A conversation that stops leaves your app exactly as it found it. Whatever it did put on an address stays there until something replaces it."
- **Data values:** conversation title, state, one-line outcome, relative start, participants, change
  count — **none exist in the API (F13)**. Change counts could come from `listCommits` if commits
  carried a thread id; they do not.
- **Components:** `SegmentedControl` as a filter carrying counts (its README cites exactly "Needs you
  1", "Over 2"); whole-card links with `StateChip`-like chips (the "ended" tone — grey, still — is
  not one of the five states; "Finished"/"Stopped" are labels on no defined state); `Card` ×2.
- **Interactions:** filter switches the list; rows link to Iterate / Queue / Draft / Queue.
- **Contradictions:** row 4 is dated **17 September — before the app was made on 18 September**. Row
  2 says the agent "asked to go live for your class" and links to Queue, whose only open question is
  "add a member to this project". Row 3 says the app was "Built … from your description", but Main /
  New / Provision show it made from the template.

### 1.17 `Iterate.dc.html` — SPECULATIVE IN HALF

- **Canvas title:** "SPECULATIVE in half · One conversation" · **Tab title:** "Changing an app that
  is already running — speculative" · 1440×940 · rail active: Conversations.
- **Purpose:** ask for a change to a running app; watch the agent make, build and stage it, then get
  stopped at the privileged step and hand the person a question.
- **Layout:** rail + main; a 740px left column (heading + "Watch again"; the person's request in a
  bordered bubble with avatar; a 5-step live list; the stopped card) and a right column with one card.
- **Verbatim copy**
  - `h1`: "Changing something that already works"
  - Sub: **"The thing faculty do far more often than building. It has to be as calm as this."** —
    a designer's annotation left on a product screen (it talks about "faculty" in the third person);
    it survived the 2026-09-26 removal of the speculative markings.
  - Secondary: "Watch again"
  - Request bubble: avatar "I1" · "Let students edit what they posted for 24 hours, then lock it. And put it live for my class — the seminar is Thursday."
  - Steps (text / note), one per 1.25s: "Read your app and worked out what to change" / "Two pages and the rule about who can see what" · "Made the change" / "A 24-hour window, then the response locks" · "Built it" / "Checked for security problems on the way through — none" · "Put it where you can try it" / "mock-app.staging.manifest.internal, answering" · "Tried to put it live for your class" / "And was stopped at the door" (ends halted, red)
  - Stopped card: chip "Stopped, and asking" (red, pulsing) · "It made the change, built it, and put it where you can try it. Then it tried to go live for your class — **one of the four it can never do** — so it stopped and left you a question." · "Nothing about your running app has changed. It is waiting, not failing, and it will wait a day before giving up." · primary "Answer it" (→ `Queue.dc.html`) · secondary "Look at it first" (→ `Preview.dc.html`)
  - Right card `h2`: "What you are always shown" · "These two facts stay on screen whatever an agent is doing. It can never quietly change the first." · overline "Serving right now" · "The version from 18 September. Untouched."
- **Data values:** the person's request text (no API); step progression (the real half: build events,
  deploy/instance events, a `pending_action.created`); staging hostname; serving version.
- **Components:** `LiveSteps` with a `halted` final step (the LiveSteps preview's "Stopped at a wall"
  example is this list); a `StateChip`-style chip with a label outside the five states; `Card`;
  `Button`; one half of `TwoFacts`.
- **Interactions:** auto-plays; "Watch again"; "Answer it" → Queue; "Look at it first" → Preview.
- **Human moments:** answering the agent's question (it tried a privileged action).
- **Contradictions:** says "These two facts" but shows **one** (the "Last attempt" half is missing).
  Reached from Incident's "Send it", but shows a different request (the 24-hour edit, not the health
  fix). "Answer it" goes to Queue, which asks about adding a member, not going live.

---

## 2. SCREEN MAP

Links are `href`s unless noted "(state)". "rail" = the 16-screen left rail (§1.00), whose links are
omitted from the per-screen lines below.

```
RAIL (every screen except Signin):
  mark, Your apps ........ -> Main
  Start something new .... -> New
  Overview ............... -> Project
  Preview ................ -> Preview
  Conversations .......... -> Conversations      [speculative]
  Going live ............. -> Launch
  People ................. -> Members
  Agents ................. -> Token
  Sign out ............... -> Signin

THE REAL JOURNEY (README §3):
  Signin --Continue with CWL--> Main
  Main --Start something new--> New --Make it--> Provision --Build it--> Build
       --Put it somewhere I can try it--> Deploy
  Deploy --(it works) Open it / hostname--> Preview
  Deploy --(it fails) "Read it ->"--> Incident
  Deploy --See what going live needs--> Launch
  Preview --Last attempt "What went wrong"--> Incident
  Preview --empty draft "Put something here"--> Deploy
  Preview --empty students / amber card--> Launch
  Preview --Ask for a change / 4 conversations--> Conversations   [speculative]
  Project --Build the latest changes--> Build
  Project --Try again--> Deploy
  Project --Open the app--> Preview
  Project --What went wrong--> Incident
  Project --See the list / Start it--> Launch
  Project --answer it--> Queue
  Project --Conversations card--> Conversations                   [speculative]
  Project --People card--> Members
  Launch --Draft the request--> #start-iam      (dead)
  Launch --Fill in what we know--> #start-pia   (dead)
  Launch --Ask to go live--> (state) refusal panel, "Close"
  Incident --Send it--> Iterate                                    [speculative]
  Incident --Back to mock-app--> Project
  Incident --Copy it--> (state) clipboard

  Main --banner--> Queue
  Main --mock-app--> Project
  Main --staging host--> Preview
  Main --See what going live needs / Start the clock--> Launch
  Main --Describe one instead--> Describe                          [speculative]

THE THREE MOMENTS:
  Token --One question this agent is waiting on--> Queue
  Token --Make the key--> (state) secret -> tick -> Done -> (state) gone
  Token --Revoke it--> (state) confirm; both buttons just close
  Members --Add them--> (state) step-up modal --Sign in again--> (state) added
  Queue --The agent asking--> Token
  Queue --Yes / No->reason->Send this back--> (state) answered

THE SPECULATIVE ROW:
  Describe --Show me what you'd build--> Draft
  Draft --Yes, build that--> Provision   (joins the real journey)
  Draft --Not quite--> Describe
  Conversations --Start a conversation--> Describe
  Conversations --Fix the health check--> Iterate
  Conversations --Let students edit… / Make the seminar list printable--> Queue
  Conversations --Reading responses, first build--> Draft
  Iterate --Answer it--> Queue
  Iterate --Look at it first--> Preview

DEAD ENDS: Signin "Ask us" (#help); Launch's two clock actions; Members "Remove" (no handler);
Preview reload (no visible effect); Token "Yes, revoke it"/"Leave it alone" (close only).
Disabled-until-done anchors: Provision "Build it", Build "Building…" (href "#not-yet").
Reached by NO in-content link (rail only): none — every screen is reachable in content except
Signin (only "Sign out").
```

Screen-reachability summary (inbound from content, excluding the rail):
Main ← Signin, New (Cancel) · New ← Main · Provision ← New, Draft · Build ← Provision, Project ·
Deploy ← Build, Project, Preview · Preview ← Main, Deploy, Project, Iterate · Project ← Main, Incident ·
Launch ← Main, Deploy, Preview, Project · Incident ← Deploy, Preview, Project · Token ← Queue ·
Members ← Project · Queue ← Main, Project, Token, Conversations, Iterate · Describe ← Main,
Conversations, Draft · Draft ← Describe, Conversations · Conversations ← Preview, Project ·
Iterate ← Incident, Conversations.

---

## 3. THE DESIGN SYSTEM (`design/system/`)

### 3.1 The component inventory

`bundle.js` exports **18** components on `window.Manifest` (verified from the `global.Manifest = {…}`
assignment and the `@ds-bundle` header). `components/` holds **17 directories**: 15 for exports,
plus `Cover` (a brand cover card, preview only, no README, no export) and `InteractionStates` (a
guideline + preview, no export). **Three exports have no directory and no README of their own:**
`ProjectBar` (documented inside `AppBar/README.md`, previewed in `AppBar/preview.html`), `LogPane`
(documented inside `InverseSurface/README.md`, previewed in `InverseSurface/preview.html`) and
`LockedRow` (documented inside `Choice/README.md`, previewed in `Choice/preview.html`).
16 README files, 17 preview files.

Counts elsewhere are inconsistent: `design/README.md` §2 says "19 React components" (stale — true
before `SpeculativeBanner` was removed in `d614b08`), `system/README.md` says "eighteen" (correct);
`design/README.md` §2 says "mounts all seventeen previews" (correct) while §5 says "All eighteen
`components/<Comp>/preview.html` files" (there are 17); the adding commit said "17 component guideline
files" (there are 16 now).

| Export | Purpose (README, one line) | Props (`index.d.ts`) | States / variants (from `bundle.js`) | Preview |
|---|---|---|---|---|
| **StateChip** | "The whole status vocabulary of the product, in one component: five states and no others." Always a dot and a word. | `state: State` (`'working'｜'waiting'｜'attention'｜'steady'｜'notyet'`), `label: string`, `pulse?: boolean`, `className?` | Five `mf-is-<state>` tints; unknown state falls back to `notyet`; pulse defaults **on for `working` and `attention`**, off otherwise; `notyet` has a dashed border. | `StateChip/preview.html` — all five, plus a waiting chip with "waiting 42 seconds · about a day left to answer" |
| **LiveSteps** | "A list of what is actually happening, ticking as each part finishes." The resolution of C3 vs liveness. 5–8 steps. | `steps: Step[]` where `Step = { text, note?, state?: 'done'｜'now'｜'next'｜'halted' }`, `className?` | `<ol>`; `done` = green + tick; `now` = teal + pulse + `aria-current="step"`; `next` (default) = open ring, 0.35 opacity; `halted` = filled red, no tick, bold red text. | `LiveSteps/preview.html` — "Running" (5 build steps) and "Stopped at a wall" (Iterate's halted list) |
| **Timeline** | "A horizontal run of stations an app passes through while you watch." 3–5 stations, < 2 min. | `stations: Station[]` where `Station = { label, note?, state?: 'done'｜'now'｜'next'｜'halted' }`, `className?` | `<ol>`; rails on/off/none; halted station ends the run (no rail after); `now` pulses and sets `aria-current="step"`. | `Timeline/preview.html` — the Deploy 4-station run, and a 3-station run ending "It never answered" |
| **ProgressBar** | "Three bars, and the difference between them is the whole waiting vocabulary." | `kind?: 'working'｜'done'｜'clock'`, `value?: number` (0–100, ignored by clock), `label?`, `meta?`, `className?` | `working` = drifting teal stripe (`role=progressbar`, aria values); `done` = flat green; `clock` = 8px hatched amber track, never animated, default labels "Nothing counting yet" / "Takes weeks". `value` defaults to 100. | `ProgressBar/preview.html` — working 62 "Working, a few minutes"/"you can leave"; done "Built"/"2 minutes 14 seconds"; clock under "A privacy assessment" |
| **TwoFacts** | "*What is serving* and *what the last attempt did* are two different facts." | `serving: Fact`, `attempt: Fact` (`Fact = { overline, title, note?, tone?: Tone }`, `Tone = 'steady'｜'attention'｜'working'｜'neutral'`), `foot?: string｜null`, `className?` | Serving defaults to `steady` tone, attempt to `neutral`; default foot "Two facts, not one. The older version keeps answering until a new one proves it can."; `foot: null` drops it. Note: `note` is plain text — the README says the right cell "ends in a link" but the component renders the note as a `<span>`, not a link. | `TwoFacts/preview.html` — Project's two facts verbatim |
| **ClockItem** | "A thing that takes weeks, answered by somebody else, shown long before anybody needs it." | `title`, `body`, `chip?`, `clockLabel?`, `clockMeta?`, `admissionTitle?`, `admissionBody?`, `action?`, `actionHref?`, `className?` | Fixed composition: `h3` title + `StateChip state='waiting' pulse=false` (default label "Not started") + body + `ProgressBar kind='clock'` + optional dashed admission block + optional full-width primary `Button` (as a link, default `href '#'`). No started/in-progress/met variant. | `ClockItem/preview.html` — Launch's privacy-assessment card |
| **Button** | Four kinds (README) — `brand` reserved for the primary; destructive opener is a quiet ghost. | `kind?: 'primary'｜'secondary'｜'tertiary'｜'danger'｜'ghostDanger'`, `size?: 'sm'`, `href?` (renders `<a>`), `disabled?`, `onClick?`, `children?`, `className?`, `style?` | Five kinds (README table lists four + ghost); `sm` = 38px; hover/active per InteractionStates; `[disabled]` = grey fill + `ink-disabled`. A `type` prop is read in code (`props.type`) but not in the `.d.ts`. `disabled` is ignored when `href` is set. | `Button/preview.html` — "Make it", "Watch again", "Open the app", "Yes, revoke it", "Revoke it", disabled "Building…", focus ring |
| **Card** | "`surface-card` on `surface-page`, a 1px `border-default` edge … Depth comes from the border, not from a shadow." | `tone?: 'plain'｜'working'｜'waiting'｜'steady'｜'attention'`, `title?`, `children?`, `className?`, `style?` | Plain + four tints; title in `h3` (`heading` style), tinted titles go to `*-deep` for working/waiting only. | `Card/preview.html` — "Next: build it", working "You can close this page", waiting "Worth knowing now" |
| **FormField** | "Label, hint, control, and — where it applies — a refusal that shows the platform's own message and hint rather than a rewritten one." | `label`, `hint?`, `value?`, `placeholder?`, `mono?`, `id?` (default `'mf-field'` — collides if two fields omit it), `onChange?`, `message?: FieldMessage` (`{ tone: Tone, title, body? }`), `className?` | Input is `readOnly` when no `onChange`; message block `role="status"` with tick (steady) or "!" (anything else), `aria-describedby` wired. Text input only. | `FormField/preview.html` — New's live name check (`mock-app` taken → attention; else steady "Yours. It will live at …") |
| **SideNav** | "The product's whole navigation: a 240px rail in UBC blue at full strength, on every signed-in screen." | `active?`, `name?`, `org?`, `homeLabel?`, `homeHref?`, `newLabel?: string｜null`, `newHref?`, `projectName?`, `items?: NavItem[]` (`{ label, href?, icon? }`, icon ∈ apps, overview, preview, talk, live, people, agent, plus), `user?`, `signOutHref?`, `className?`, `style?` | Active matched by label (fill + 600 + `aria-current`); project section only if `items.length`; overline only with `projectName`; footer only with `user`. No focus style in `bundle.css`. | `SideNav/preview.html` — interactive (click changes active), mock-app, six items |
| **AppBar** | **Superseded by SideNav**; kept for a surface with no rail (signed-out page, embedded view). | `name?`, `org?`, `user?`, `children?`, `className?` | 60px white bar: mark (brand square) + right slot. | `AppBar/preview.html` (with ProjectBar) |
| **ProjectBar** | (in AppBar README) the project band: title, meta line, tabs (tab strip retired by SideNav). | `title`, `meta?`, `tabs?: Array<string｜{label, href?}>`, `active?`, `className?` | Tabs underline when active. | `AppBar/preview.html` — "mock-app", "Yours · made 18 September · for one class, all arriving at once", 5 tabs |
| **InverseSurface** | `surface-inverse` near-black navy with three and only three uses: the build log, a one-time key, an incident's repair prompt. | `title?`, `body?`, `inset?` (mono, selectable), `warn?` (triangle in `warning-mark`), `children?`, `className?`, `style?` | Title optional; warn icon only with title. | `InverseSurface/preview.html` — a LogPane, and the one-time key card with "Copy it" |
| **LogPane** | (in InverseSurface README) machine lines, numbered, earlier-stored lines muted. | `lines: string[]`, `writtenBefore?: number`, `className?`, `style?` | Lines `< writtenBefore` muted; numbers `user-select: none`. | `InverseSurface/preview.html` |
| **BrowserFrame** | "The app a faculty member made, shown inside the product that made it." The one use of `shadow-float`. | `url`, `phone?`, `secure?` (padlock unless `false`), `caption?`, `children?`, `className?`, `style?` | Desktop (three dots) vs phone (390px, no dots); caption below. README: "designed but not yet buildable end to end" (F12). | `BrowserFrame/preview.html` — staging app drawn + production empty phone "Not live yet" / "It stays empty until you go live." |
| **SegmentedControl** | "A small group of mutually exclusive views … It switches what you are looking at, never what you are doing." | `options: Array<string｜{label, value}>`, `value`, `onChange?`, `role?: 'tablist'｜'radiogroup'`, `className?` | `tablist` (aria-selected) or `radiogroup` (aria-checked); selected tab uses `shadow-raise`. README promises arrow-key navigation; the code has no key handler. | `SegmentedControl/preview.html` — env switch, Desktop/Phone, "All 4 / Needs you 1 / Working 1 / Over 2" |
| **Choice** | "One component, three jobs: a radio card …, a capability checkbox …, and the locked row." | `type?: 'radio'｜'checkbox'`, `name?`, `label?` (aria-label), `options: ChoiceOption[]` (`{ title, note?, value, checked? }`), `value?` (radio), `onChange?(value)`, `className?` | Radio = `role=radiogroup`; checkbox = `role=group` with per-option `checked`; selected = 2px brand, margin 0; 2-column grid. | `Choice/preview.html` — audience radios, capability checkboxes, a LockedRow, the "I have put it somewhere safe" confirmation on an InverseSurface |
| **LockedRow** | (in Choice README) "For a capability that can NEVER be granted. Not an unticked checkbox." | `label?`, `children?`, `className?` | Dashed row with padlock. README says it reads "never available". | `Choice/preview.html` — "Change who can get in — never available" |
| *Cover* (no export) | The system's cover card: "Manifest" / "Describe it, and it runs at a UBC address." with five coloured tiles. | — | — | `Cover/preview.html` (pure SVG/CSS; no script) |
| *InteractionStates* (no export) | Hover, focus, active and disabled, written down once. | — | Table: hover = one fill or border 0.12s; focus = 2px `focus-ring` at 3px; active = `translateY(1px)`; disabled = `border-default` fill + `ink-disabled`. | `InteractionStates/preview.html` — buttons, an input, a link, a whole-row link |

Components the prototype needs that the system **does not** have: a modal/dialog (Members' step-up),
a textarea (Queue, Describe), a select (Members' role), an activity/event feed (Project), a checklist
row with three mark shapes (Launch), a whole-card link (Main, Project, Conversations), a banner link
(Main's "Needs you"), the dark-teal success/repair card (Deploy, Incident), a tinted inline notice
(many screens), the vertical step list with connector line (Provision), a person avatar.
The admin mockup proposes 14 more (`EventLine`, `DataTable`, `FilterBar`…) in `admin/components.js`.

### 3.2 How `bundle.js` is built and consumed

- **It is not built.** It is a hand-written **ES5 classic script** in a single IIFE:
  `(function (global) { 'use strict'; var React = global.React; var h = React.createElement; … global.Manifest = { … }; })(window);`
  No JSX, no ES modules, no `import`/`export`, no UMD wrapper (no `define`/`module.exports` branch),
  no transpiler output markers. Every element is `h('tag', props, …children)`.
- **Dependency:** reads **`window.React`** at load time (so React must already be on the page) and
  uses only `React.createElement` (plus hooks in the previews, not in the bundle). It does **not**
  use ReactDOM — the consumer mounts with `ReactDOM.createRoot(...).render(h(M.X, …))`. React 18.3.1
  UMD from cdnjs is what every consumer here loads; nothing in the bundle is React-18-specific
  (it would run on 17), but `createRoot` in the previews is 18.
- **Export:** assigns **`window.Manifest`** — an object of 18 function components. The
  `/* @ds-bundle: {"format":4,"namespace":"Manifest","components":[…]} */` header is the manifest
  of the claude.ai design-system Artifact format ("format 4"); canvas.json names this system with
  `namespace: "manifest"` and `index.d.ts` mentions `x-import` by name — i.e. the canvas runtime can
  import these components into `.dc.html` screens, **but none of the 17 screens does**.
- All components are **stateless function components**; no hooks, no effects, no context. Class names
  are `mf-` prefixed BEM-ish (`mf-chip`, `mf-step__mark--now`). A few inline `style` objects remain
  (`display: block` on text spans, the ClockItem clock colour, etc.).
- **Load order in a consuming page** (README §2 and `index.d.ts`): `tokens.css`, `bundle.css`,
  React 18 + ReactDOM 18, `bundle.js`. "Load the runtime before anything that mounts" — the gallery
  generator once had exactly that ordering bug (commit `27b81d6`).
- **Worked consumer:** `design/admin-console.html` loads, as separate files, Google Fonts →
  `system/tokens.css` → `system/components/bundle.css` → `admin/components.css`, then React 18.3.1 and
  ReactDOM 18.3.1 UMD (cdnjs) → `system/components/bundle.js` → `admin/components.js` (which reads
  `window.React` and `window.Manifest` and assigns `window.ManifestAdmin`) → `admin/data.js`
  (`window.ADMIN_DATA`) → `admin/console.js`. It has no `<html>/<head>/<body>` (the Artifact
  publisher wraps it) and must be served over HTTP (`python3 -m http.server`), per `admin/README.md`.

### 3.3 How `gallery.html` loads it

`build-gallery.mjs` (Node ESM, `node system/build-gallery.mjs`) writes one self-contained HTML page:
- `<head>`: Google Fonts `<link>` (Instrument Sans 400–700, IBM Plex Mono 400–500);
  `<script src>` React 18.3.1 and ReactDOM 18.3.1 **production UMD from cdnjs**; then an **inline
  `<script>` containing the whole of `bundle.js`**; then an inline `<style>` with `tokens.css`, then
  `bundle.css`, then gallery chrome (`.g-wrap`, `.g-card`…).
- `<body>`: every `components/*/preview.html` that exists, sorted by group
  (`Cover, Foundations, States, Surfaces`, taken from the `@dsCard group=… subtitle=…` comment on the
  preview's first line) then name. Each preview is inlined verbatim with `id="root"` and
  `getElementById('root')` rewritten to `root-<Name>` so 16 mounts coexist (Cover has no script).
- Verified today: the inlined bundle, tokens.css, bundle.css and all 17 previews are byte-identical
  to the files on disk — the gallery is in sync.
- Needs the network (fonts + React CDN); no server needed. `<html data-theme="light">`.
- **Preview files are fragments**, not pages: an `@dsCard` comment, a `<div id="root">`, and a
  script that does `var h = React.createElement, M = window.Manifest; … ReactDOM.createRoot(…).render(…)`.
  They only work inside the gallery (or the Artifact), which supplies React, the bundle and the CSS.
  Four use `React.useState` (FormField, SegmentedControl, Choice, SideNav).

### 3.4 Where the CSS lives

- **`system/tokens.css`** (3,858 B) — custom properties on `:root, [data-theme="light"]` (58 colour
  tokens incl. `--nav-*` aliases, `--scrim`, three shadows, and two **leftover**
  `--speculative-hatch-a/b` from the removed SpeculativeBanner), and on `:root` spacing (`--space-1`
  … `--space-12`, 4px grid, no 7/9/11), radius (`xs 4, sm 6, md 8, lg 12, xl 14, pill 999`),
  `--font-sans` ("Instrument Sans", system-ui…) and `--font-mono` ("IBM Plex Mono", ui-monospace…).
  Then **14 global type classes** with bare names: `.hero .page-title .moment .heading .subheading
  .body-lead .body .body-small .label .caption .overline .mono .mono-address .mono-log` — unscoped,
  so `.body`/`.label`/`.heading` will collide with any app CSS using those names. **No dark theme**
  (tokens.json `themes: [{ id: 'light' }]`); the admin mockup states "Light only, on purpose".
- **`system/components/bundle.css`** (17,009 B) — all component styles, `mf-` prefixed, values from
  tokens; `@keyframes mf-breathe / mf-drift / mf-arrive`. No `@import`, no `@font-face`, no `url()`.
  **No `prefers-reduced-motion` rule** anywhere in the system or the prototype (only
  `admin/components.css` has one), although the README says "Motion is decorative only".
- **CSS is not inside the bundle** — `bundle.js` injects no styles.
- **Fonts:** not bundled or self-hosted anywhere; every consumer links Google Fonts. `tokens.json`'s
  `type.fonts` is an empty array. (Manifest otherwise runs offline after `make seed`; this design does
  not.)

### 3.5 Byte sizes

`bundle.js` 19,543 B / 393 lines · `bundle.css` 17,009 B / 170 lines · `index.d.ts` 7,516 B ·
`tokens.css` 3,858 B · `tokens.json` 16,686 B · `gallery.html` 71,380 B · `build-gallery.mjs` 3,847 B ·
`prototype/support.js` 10,106 B · READMEs 1.7–2.8 KB each · previews 0.9–3.0 KB each.

### 3.6 Where the bundle came from; is there JSX source anywhere?

- **Commit that added it:** `57e8b6e` (2026-09-26 20:33 −0700, Rich Tape, co-authored by Claude),
  *"docs(design): the faculty design as files, so a build agent can be handed it"*. Message: the
  design "existed only as two Artifacts on claude.ai and in a session scratchpad — and the scratchpad
  had ALREADY BEEN LOST between sittings… Everything here was pulled back out of the live Artifacts
  today." It lists `bundle.js (19 React components)`. The Artifact is
  `https://claude.ai/code/artifact/004ccdad-637d-4a42-b116-6976a386207d` (design system) and
  `…/1df61167-fdf0-41bc-acbe-e60c12f51060` (prototype).
- **Only other change to `bundle.js`:** `d614b08` (2026-09-26 20:41), which removed
  `SpeculativeBanner` (function, export, header entry; its `.mf-spec` CSS and types too).
- Later design commits: `27b81d6` (gallery + generator), `1a39711` (`support.js`), `c6151af`
  (lint fix in `support.js`), `577ad91` (spec §26 scope), `312ce2d` and `e1712d8` (admin mockup).
- **JSX/TSX search:** `git log --all --name-only | grep -Ei '\.(jsx|tsx)$'` finds only
  `packages/console/src/**` (the P5c plain reference console: `app.tsx`, `main.tsx`, `ui.tsx`,
  `screens/*.tsx`) — **none of it is these components**. `git log --all -S'StateChip'` touches only
  files under `docs/superpowers/design/` and `docs/superpowers/2026-09-27-admin-console-design.md`.
  A working-tree grep for `StateChip|LiveSteps|TwoFacts|ClockItem|window.Manifest|mf-chip` outside
  `design/` finds nothing.
- **Conclusion: no JSX/TSX source exists anywhere in the repository or its history. `bundle.js`
  *is* the source** — hand-authored `createElement` ES5, with `index.d.ts` as hand-written
  documentation-only types (not generated from anything, not checked against the code — e.g.
  `Button`'s `type` prop is missing from it).
- **The tokens generator is also missing.** `tokens.css` begins
  `/* GENERATED from tokens.json — do not edit. Regenerate with build-tokens-css.mjs. */`, and
  `design/README.md` says "the generator is fifteen lines and is described in the commit that added
  this directory". **No `build-tokens-css.mjs` exists in the tree or in any commit**, and `57e8b6e`'s
  message does not describe it (it says only "GENERATED from tokens.json — custom properties plus a
  class per type style").

### 3.7 `prototype/support.js` (the local viewer)

10,106 B, ES5-ish IIFE assigning `window.__dcRuntime = { resolve, interpolate }`. It implements only
what the screens use: `{{dotted.path}}` in text and attributes (a whole-string hole returns the raw
value), `<sc-for list as>` with `$index`, `<sc-if value>`, `onClick/onInput/onChange/onSubmit`,
`ref`, `checked`/`value` as properties, stripping `hint-*` attributes, hoisting `<helmet>` into
`<head>`, reading prop defaults from `data-props`, and `class Component extends DCLogic` with
`state`, `setState`, `forceUpdate`, `renderVals`, `componentDidMount/DidUpdate/WillUnmount`. It
re-renders by cloning the pristine template per `setState` (rAF-batched) and restores focus/caret by
element id. On a logic error it paints a red `support.js: …` bar. README: "a viewer, not a
reimplementation … If it and the canvas ever disagree, the canvas is right. Nothing in the product
should depend on it." It is linted by the repo's `pnpm lint` (commit `c6151af`).

### 3.8 The administrator console mockup (also under `design/`)

Not faculty-facing, but it is in the directory. `admin-console.html` + `admin/` — "a clickable
mockup" of the operations console (queue, fleet, health/risk, settings), published at
`https://claude.ai/artifact/N8qj84CVbvJ7f2L6xKfQ25`. It **mounts the real design system** and composes
`StateChip`, `Button`, `SegmentedControl`, `Choice`, `TwoFacts`, `InverseSurface`; proposes 14 new
components in the same idiom on `window.ManifestAdmin` (`ConsoleRail, SettingRow, WaitHeadline,
QueueRow, FilterBar, DataTable, EnvCell, DiffView, ObservedAction, EventLine, MachineValue, FactList,
Tags, RawChip`) "not yet in bundle.js"; its README has an API-backing table (findings A1–A13) and an
on-screen "Show API gaps" switch. It is the only place in `design/` that shows how a real page
consumes the bundle.

---

## 4. `design/README.md` — summary

*"Added 2026-09-26, so that a build-phase agent can be handed this directory and know what to build
without a person in the loop. Everything here was pulled from the two living Artifacts on the day it
was written."*

- **Header table:** design system = `system/` and live at
  `https://claude.ai/code/artifact/004ccdad-637d-4a42-b116-6976a386207d`; prototype = `prototype/`,
  live at `https://claude.ai/code/artifact/1df61167-fdf0-41bc-acbe-e60c12f51060`; rationale =
  `../2026-09-19-faculty-interface-design-rationale.md`; API = `../design-handover.md`, generated
  from the contract. "This design was drawn against its 2026-09-19 edition — 34 operations, 52
  schemas." (Today's handover: **54 operations, 78 schemas, 37 event types**.)
- **§1 Read these three first:** `system/README.md`, `system/10-language.md`,
  `system/20-states.md`, then each component's README.
- **§2 The system is real code:** file list; load order (`tokens.css`, `bundle.css`, React 18 +
  ReactDOM 18, `bundle.js`, then `window.Manifest.*`); "Load the runtime before anything that
  mounts"; open `gallery.html`; "Mount them rather than retyping the markup. Retyped markup is how a
  system and its product drift apart" (the prototype itself retypes everything); `tokens.css` is
  generated — "the generator is fifteen lines and is described in the commit that added this
  directory" (it is not — §3.6).
- **§3 The prototype: what is real and what is not.**
  - Open `prototype/Signin.dc.html` in a browser; `support.js` is "a viewer, not a reimplementation.
    If it and the canvas ever disagree, the canvas is right. Nothing in the product should depend on
    it."
  - **"Ten screens are the real journey.** Every value on them comes from the published contract's
    fixtures — the slug, all three hostnames, the twenty build-log lines, the 135 packages, the scan
    counts, the token secret, the 42-second wait, the incident's repair prompt."
    `Signin → Main → New → Provision → Build → Deploy → Preview → Project → Launch → Incident`
  - **"Three are moments that need particular care":** `Token` (a secret shown exactly once),
    `Members` (re-authenticating mid-task), `Queue` (an agent is refused; a human answers in their
    own words).
  - **"FOUR ARE SPECULATIVE AND MUST NOT BE BUILT FROM AS IF THEY WERE A SPEC."** No on-screen
    marking since 2026-09-26 (Rich removed the bands deliberately) — "That makes this table the only
    statement of which screens have no API behind them."

    | Screen | Status (verbatim) |
    |---|---|
    | `Describe.dc.html` | "**Speculative.** No API creates or changes an app — zero `PATCH`/`PUT`, no repository reference." |
    | `Draft.dc.html` | "**Speculative**, same gap. Its one real seam is *Yes, build that* → `POST /v1/projects`." |
    | `Conversations.dc.html` | "**Speculative.** A conversation is the one object with no counterpart anywhere in the API." |
    | `Iterate.dc.html` | "**Speculative in half.** Asking for a change is invented; the build, the deploy, the refusal, the question and the single retry a *yes* buys are all built and clicked today." |

  - `SpeculativeBanner` was removed from the system for the same reason.
  - **§3 does not name an operation per real screen.** What backs each, from the handover
    (v1.3.0): Signin → SAML + `getMe`; Main → `listProjects` (+ `?expand=environments`),
    `listPendingActions` per project, `getLaunchReadiness`; New → `checkSlug`, `listBlueprints`,
    `createProject`; Provision → `CreatedProject` + `project.created`/`repository.seeded`/
    `spec.validated`/`sso.registered` events; Build → `startBuild`, `getBuild`, `getBuildLog`,
    `streamProjectEvents` (`build.*`, `LogFrame`), `Build.scan`; Deploy → `createRelease`, `deploy`,
    `instance.*` events, `getEnvironment`, `listIncidents`; Preview → `listEnvironments`/
    `getEnvironment` (`hostname`, `url`, `instance`), `getRelease`, `listIncidents`; Project →
    `getProject`, environments, `listIncidents`, `getLaunchReadiness`, `getLaunchRecords`, events,
    `listMembers`; Launch → `getLaunchReadiness`, `getLaunchRecords` (IAM/PIA are recorded by an
    administrator via `recordIamRegistration`/`recordPrivacyAssessment`, not started by faculty);
    Incident → `listIncidents` (`exitReason`, `failedCheck`, `diffSinceHealthy`, `logTail`,
    `prompt`); Token → `mintToken`, `listTokens`, `revokeToken`; Members → `listMembers`,
    `addMember` (by `puid`), `removeMember`; Queue → `listPendingActions`, `confirmPendingAction`,
    `rejectPendingAction`.
  - **§3's reasoning for Describe/Draft is now stale.** "Zero `PATCH`/`PUT`, no repository reference"
    was true of the 2026-09-19 contract; since the authoring API (executed 2026-09-27) the contract
    has `PUT …/secrets/{name}`, `getTree`, `getFile`, `listCommits`, `getCommit`, `createCommit`
    and `Project.repository`. Describe/Draft remain speculative for a different reason: nothing
    turns a plain-language brief into a plan or code (that is an agent's job outside the API), and
    there is still no conversation object (F13).
- **§4 The thirteen API findings** (rationale §8). The four it highlights: **F1** build log lines
  have no faculty-legible counterpart (while all events do); **F3** the launch checklist cannot
  express time; **F4** no re-authentication signal in any refusal code; **F13** no conversation
  object. (The rest: F2 launch `why` strings are internal vocabulary; F5 two different "privileged
  fours"; F6 serving vs last attempt needs a join; F7 no human-readable project name; F8 nothing
  editable; F9 no notifications ("We'll email…" is unbacked); F10 `Token.capabilities` open on read,
  closed on mint; F11 `SLUG_INVALID`/`SLUG_RESERVED` have no fixture; F12 no authenticated preview.)
- **§5 What had drifted by 2026-09-26:** (a) FIXED — Build's logic block did not parse (nested
  quotes); (b) FIXED — Incident's repair-prompt inset was invisible (`#0A4E60` on `#0A4E60`; now
  `#04252F` + `#2C7A8E` border; "no fill reaches 3:1 against that card without going nearly
  black"); (c) NOT A DEFECT — speculative bands removed on purpose. "The previews are here" (all
  added 2026-09-26; four interactive via `useState`).
- **§6 What this design does not cover:** the administrator's console; the app a faculty member
  builds; "anything below 1440px except the preview's 390pt phone mode"; degraded states; "a
  faculty-legible sentence for the other 64 refusal codes".

---

## 5. States each screen shows vs omits

The documented states (`20-states.md`): **Working** (moving on its own; drifting bar, breathing dot,
honest duration), **Waiting on someone** (still, with how long it has waited), **Needs you** (one
clear action and what is still true), **Steady** (filled dot, plain word), **Not yet** (hatched,
muted, dashed, no action). Plus the ordinary UI states the system names or implies: loading, empty,
error/refusal, disabled. **No screen shows an initial data-loading state; no screen shows a network
or server error; no screen shows a signed-out/session-expired state.** (The system forbids spinners,
so a loading pattern is undefined — `20-states.md`: "There is no indeterminate spinner in this
system.")

| Screen | Shows | Omits (notable) |
|---|---|---|
| Signin | — (static) | CWL failure/cancel; "you were signed out"; access denied; loading during redirect |
| Main | Needs you (banner, pulsing); Steady (chip, "Answering"); Waiting-coloured "Two long waits" block (tint only, no chip, no elapsed count); plain-text "Nothing here yet" / "Not live yet" (not the dashed Not-yet chip) | Working (a build/deploy in progress on the card); the failed last attempt (no TwoFacts); zero apps (empty state); many apps; multiple pending questions |
| New | Refusal (attention tint, platform message + hint); success (steady tint); waiting-tint warning card | Live-check in flight; `SLUG_INVALID`/`SLUG_RESERVED`; create in flight; create failed; disabled "Make it" |
| Provision | Working (pill + drifting bar + pulsing step); Steady ("Ready", solid bar); disabled "Build it" (no reason in label) | Failure (spec invalid, SSO registration failed); Needs you |
| Build | Working; Steady ("Built"); disabled "Building…"; log closed/open; security result (clean) | Build failed (`Build.error`); scan refusal (fixable findings); stale vulnerability DB; queued/pending; Needs you |
| Deploy | Working (Timeline + pill); Steady ("It's up."); Needs you (prop `it fails`: halted last station + banner); TwoFacts in all three | Waiting on someone; hibernated/waking; first-deploy "nothing serving" (it claims a prior version); deploy refused |
| Preview | Steady (serving); Needs you (last attempt failed — static on every tab); Empty ×2 (sandbox "Your draft is empty", production "Not live yet") with one action each | Frame loading / failed to load (F12); Working (a deploy in flight); a real "Not yet" chip; reload feedback |
| Project | Steady (chip + "What people get"); Needs you ("What you tried last"); Waiting on someone (privacy row, **without** an elapsed number); event feed with coloured dots | Working; Not yet (sandbox "Empty." is plain text); empty feed; loading |
| Launch | Waiting-coloured "Not started" chips + hatched clocks (arguably **Not yet**); Steady (security tick); open-ring unstarted checks; dashed "not yet possible" (Not yet); Needs you (refusal panel after "Ask to go live") | A started clock (submitted, waiting N days — F3); a met clock; all-ready; launch in progress; launched; `code-review` item |
| Incident | Steady (reassurance banner); Needs you (chip); disclosure open/closed; copied | Resolved; multiple incidents; after "Send it" (goes to a different screen) |
| Token | Form; disabled "Make the key" (label unchanged); secret shown once; "Done" gated; gone; key "In use" (steady dot); revoke confirm | Expired key; revoked key; never-used key; zero keys; mint refused (e.g. a person-only capability); copy failure |
| Members | List; step-up modal; added (steady card); badge roles | Person not found / never signed in (the hint's case); already a member; remove confirm; step-up failed/cancelled message; Waiting |
| Queue | Needs you (pulsing, elapsed ticks); answered list: "Yes, once", "No" (with verbatim words), "Ran out"; zero-pending heading "Nothing is waiting on you"; disabled "Send this back" until text | Step-up on "Yes" (it is a members change); a consumed retry ("used its one try" appears only in history); error on confirm/reject |
| Describe | — (static) | everything |
| Draft | — (static; a waiting-tint "Two things only you know" block) | plan loading/generating; correction round-trip |
| Conversations | Working (pulsing); Needs you (pulsing); "ended" grey (Finished / Stopped — not one of the five) | Empty (no conversations); Waiting on someone; Steady |
| Iterate | LiveSteps Working → halted; "Stopped, and asking" chip; Steady ("Serving right now") | The "Last attempt" half of TwoFacts (text says "two facts"); success path; the agent failing |

---

## 6. Surprises: contradictions, copy that breaks `10-language.md`, machinery shown to faculty

### 6.1 Screens that contradict each other

1. **What is serving on staging.** Deploy (default `it works`) ends "It's up." / "The version you
   built just now." / "Succeeded a moment ago. It is the one serving." But Preview, Project and
   Iterate say serving is "The version from 18 September, 9:00am" and the last attempt "Failed 4
   minutes ago" / "A change that didn't take, 4 minutes ago". Main says "Steady" and does not mention
   any failure at all.
2. **First deploy has a "previous version".** Provision: "Nothing is running yet." Deploy, during the
   very next step: "Serving right now — The version from 18 September, 9:00am. Unchanged by any of
   this."
3. **Which request the agent is waiting on.** Main, Project, Token and Queue: "add a member to this
   project". Conversations ("Let students edit for 24 hours … asked to go live for your class, and is
   waiting on your answer") and Iterate ("tried to go live for your class … Answer it") both send the
   person to Queue — which shows the add-member question.
4. **Incident → "Send it" → Iterate** shows the 24-hour-edit conversation, not the health-check repair
   (Conversations lists the repair separately as "Fix the health check", which links to Iterate too).
5. **Dates.** Conversations dates "Make the seminar list printable" **17 September**, the day before
   the app was made (18 September).
6. **How the app was made.** Main/New/Provision: from the one template ("A note-taking app with CWL
   sign-in and an AI answer"). Conversations: "Reading responses, first build … Built the whole app
   from your description". Draft: "AI: None" and "Who gets in: Anyone with a CWL" — while the only
   template includes the AI helper, and Members says "Only the people listed here".
7. **The privileged four.** Token: "Change who can get in · Put something live for students · Change
   how much room it gets · Read its passwords and keys". Members: "Changing who can get in · Reading
   your app's keys and passwords · Changing how much room it gets · Approving a version for your
   students". Documented as deliberate (F5) but unresolved.
8. **Token offers what the API refuses and omits what the agent needs.** "Approve a version"
   (`release:approve`) is tickable, but the contract says `release:approve` is "person-only and
   refused outright" to a token. `source:write` and `secret:write` — what "An agent writes and changes
   your app for you" requires since the authoring API — are not offered.
9. **Step-up is inconsistent.** Members makes adding a person a step-up action ("One more time");
   Queue lets the person approve the agent's add-a-member request with a single click.
10. **Launch counts.** Launch "1 of 7" / "Six of seven" / heading "Five short jobs" / aside "Four are
    short jobs for later" (4 unmet + 1 met = 5 — consistent), but the contract now has 8 item ids
    (`code-review` added, non-blocking, D33), and for a `class` audience the spec adds **no**
    load rehearsal, so row "A test with everyone at once" should not be on mock-app's list.
11. **Waiting vs Not yet.** 20-states: "Not yet — Real, but no clock has started"; Launch and Project
    render the unstarted PIA/IAM clocks as **Waiting on someone** (amber, "Not started"), and the
    `ClockItem` component hard-codes `state: 'waiting'`. Project's "Waiting on someone" row has no
    elapsed number, which StateChip requires of a waiting state.
12. **Motion rule vs "Needs you".** The core rule is "Motion means a machine is moving. Stillness
    plus a number means a person has it." Yet `StateChip` pulses `attention` by default, and Main,
    Queue, Conversations and Iterate pulse "Needs you" — a state that by definition a person holds.
13. **Rail.** The project section appears on Main/New/Describe/Draft, contrary to SideNav's rule; New
    highlights "Your apps" instead of "Start something new".
14. **Members' own sentence.** "Students aren't on this list — they get in once the app is live",
    then the demo adds "Student One" as a "Helper".
15. **Iterate** says "These two facts stay on screen" and shows one.
16. **New's success message** promises `<name>.manifest.internal`; the next screen gives three
    addresses and the one you will use first is the staging one.

### 6.2 Copy that breaks `10-language.md` / the system's own rules

- **Designer's note left on a product screen** — Iterate's sub: "The thing faculty do far more often
  than building. It has to be as calm as this."
- **Tab titles still say "— speculative"** on Describe, Draft, Conversations and Iterate, although
  the on-screen markings were removed so the prototype "reads as a real product".
- **Overlines over three words** ("Overlines are never more than three words"): Deploy "It is real,
  and it is at" (6); Project "What you tried last" (4); Describe "In your own words" (4).
- **Countdowns / time remaining** ("A wait shows elapsed time, not a deadline"; StateChip "Elapsed,
  never a countdown"; Timeline "Never show … a time remaining"): Provision pill "Working, about a
  minute left"; Queue "about a day left to answer" (also in the StateChip preview itself).
- **Three-sentence runs** ("Three sentences in a row is almost always a sign that something is being
  explained that should have been designed instead"): Launch lede ("Going live isn't a button. Most of
  it takes minutes — but … take weeks. That's why this page exists from day one."); Token "Gone, as
  promised" ("The key works; we just can't read it back. Lost it? Revoke and make another — thirty
  seconds, not a disaster."); Draft "AI" row and "What students see" row; Incident body is two
  sentences plus an italic question.
- **Platform words on screen:** "project" alongside "app" ("a project already has this name", "add
  a member to this project", "Look at this project", "Delete the whole project", "In this project's
  history", "The plan becomes a real project"); "member" (AppBar README: "*People*, not *Members*")
  in Queue's heading "add a member to this project" — which is `PendingAction.summary` verbatim and
  lower-case.
- **Disabled buttons that don't say what they wait for** (Button/InteractionStates rule): Provision
  "Build it"; Token "Make the key".
- **Voice shift:** Draft is first person "Here's what I'd build", "Things I assumed"; everywhere else
  is "we".
- **Numbers rule** ("never a percentage a person cannot act on"): not broken in text, but Provision
  and Build bars are determinate percentage fills driven by timers; ProgressBar README requires a
  real fraction or LiveSteps instead.

### 6.3 Machinery shown to faculty (C3: "No containers, no YAML, no exit codes, no digests where a word would do")

- **Incident's repair prompt, visible by default:** "The app did not answer its health path. Check
  runtime.health in manifest.yaml." — "health path", a config key and **YAML** on a faculty screen,
  not behind a disclosure (10-language's table: readiness probe / health path → "the place we ask
  'are you ready?'"; "exit code, container, YAML, port — never appears"). InverseSurface's rule is
  "Always reachable, never the default."
- **Behind disclosures (sanctioned as "placed"):** Incident "the readiness probe never answered 200 /
  GET /healthz from inside the edge / runtime.health: /healthz → /never-ready / Error: connect
  ECONNREFUSED 127.0.0.1:27017" (an IP and port); Build's 20 BuildKit lines (Dockerfile, registry
  `127.0.0.1:7107`, `npm ci`, uid 10001).
- **Token secret** `mft_…` — sanctioned (InverseSurface use 2).
- **Members' "Their CWL" field holds `stu000001`,** a PUID-shaped identifier (`addMember` takes
  `puid`), not a CWL login a faculty member would know.
- **Hostnames** in mono on nearly every screen — explicitly allowed ("the one machine string the
  product is proud of").
- **Signin promises "No configuration files, ever"**, and the Incident screen then names one.

### 6.4 Values the prototype shows that the API (v1.3.0) cannot supply

| Value (screen) | Why not |
|---|---|
| Human app name "Reading responses" (Preview, Conversations) | F7 — only `slug` |
| App description (Main) | It is the blueprint **starter**'s summary, not the project's |
| Overall app status "Steady" (Main) | Derived; no field |
| Faculty sentences for build steps (Build, Provision) | F1 — raw `LogFrame.text` only; no per-step events |
| "We'll email if it goes wrong" (Build) | F9 — no notification mechanism |
| Serving vs last attempt in one read (Deploy, Preview, Project, Iterate) | F6 — join `Environment.instance` + incidents/stream |
| "Running without complaint for 9 hours" (Project) | `Instance` has `lastSeenAt` only; no started-at/uptime |
| Launch-item sentences, owners' phrasing, "Takes weeks", "Nothing counting yet" (Launch, Main, Project) | F2 (internal `why`), F3 (no time, no in-progress) |
| "Draft the request" / "Fill in what we know" (Launch) | No operation; records are written by an administrator after the fact |
| Plain-language "What changed / What it said" (Incident) | Designer's translation of `diffSinceHealthy` / `logTail` |
| "Send it" to an agent (Incident), conversations and change counts (Preview, Project, Conversations, Iterate) | F13 — no conversation object |
| Embedded authenticated preview (Preview) | F12 |
| Step-up prompt (Members) | F4 — no `REAUTH_REQUIRED` code |
| "added just now" (Members) | `Member` has no added-at |
| Who the agent wants to add (Queue — not shown) | Only in `path` / `bodySha256` |
| Rendering an existing token's capabilities in words (Token, Queue) | F10 — open `string[]` on read |
| "4 minutes ago" relative times | Available (`Incident.createdAt`, event times) |
| The 42-second wait, the scan counts, the secret, the hostnames | Available — fixture values verbatim |
