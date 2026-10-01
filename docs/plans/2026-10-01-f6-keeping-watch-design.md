# F6 — Keeping watch: the design

*Written 2026-10-01 by `manifest-app-34`, from a brainstorm with Rich in which he approved each section. **This is the
design, not the plan.** The plan, `2026-10-01-f6-keeping-watch.md`, is written from it with superpowers:writing-plans once
Rich has reviewed this file. The walk-through ([`../walkthrough.md`](../walkthrough.md), moments 16, 19 and 20) stays the
source of the faculty member's words. This file decides how we build them, and where it departs from the walk-through
it says so.*

## What F6 is for

A faculty member's app is live, and they have gone back to teaching. F6 is everything that happens while nobody is
looking:
- **we notice** when something needs them, and tell them by email;
- **they come back** to a page that says what happened since, and what (if anything) is theirs to do;
- **when the live app falls over**, they can start it again from one button;
- **at the end of term** they can switch it off without losing anything, have it back in September, or clear away an
  app that never went live.

**Success** is Rich's click on the real platform: an app live on 7100 falls over and is started again from an email; it
is switched off, back on, and started for its students; a draft is deleted; and the emails arrive in Mailpit, in our
words, once each.

## Rich's decisions (2026-10-01)

- **D1. Two plans, not one** (Rich chose *"Two plans"*):
  - **F6, *Keeping watch*** (this design): moments **16** (*coming back*), **19** (*it breaks*) and **20** (*end of term*).
  - **F6b, *Working on it together***, written after F6: moments **17** (*a change after launch*), **18** (*People*) and
    the *Agents* screen with its question card (the walk-through's *Throughout*). Moment 17's *"an administrator's look"*
    leads into asking for a sign-off, which is F5b's, so F6b waits for F5b where it can.
  - *Switching off belongs with the watch* because it revokes the watch token and restoring re-mints it (§1, §5).
  - *Rejected:* one plan for moments 16–20 (eight or nine sittings, the longest before Rich clicks anything); one plan
    with the *Agents* screen too.
- **D2. The watch token is kept on disk, encrypted** (Rich chose *"Encrypted on disk"*). It is the one credential our
  server keeps at rest. **F2's Decision 1 is amended for it alone** (F2 left this to F6: *"F6's watch token will need to
  survive restarts, and it decides this again with its own reasons"*).
  - *Why:* the email that matters most (*"a change didn't go live"*) is sent during the weeks nobody visits. A token in
    memory only would be gone after any restart of our server, until a member came back, and so would the email.
  - *Rejected:* memory only, re-minted on the next visit; no event stream at all (no history of our own, no
    failed-change email).
- **D3. Four kinds of email** (Rich chose all four): *it's in trouble*, *your work is waiting*, *a long wait is over*,
  *who's on it changed* (§3). One email per happening, never a digest.
- **D4. The keeper runs inside our server** (Rich chose *"A: keeper in our server"*): one event stream per app, a
  `history` table, pure rules, and a once-a-minute check of each live address.
  - *Rejected:* a separate keeper process sharing the SQLite file (two processes to run and check, and the token handed
    across through the database); polling each app's state every minute (slower, it spends the token's rate limit, and a
    dry run's result is on the stream alone: FE-43).
- **D5. nodemailer** is our first new dependency since F1 (Rich: yes). It is pure JavaScript, with no dependencies of its
  own. Writing SMTP ourselves, with TLS and authentication for production, is security work not worth writing ourselves.
- **D6. The live-address watch is ours, with no dependency** (Rich: *"I'm okay with another dependency here if something
  light exists that makes sense. Up to you."*). Node's own `fetch` and a timer do the probing. The real logic (what
  counts as down, the outage, the email, the band, the button) is ours whatever we choose.
  - *Rejected:* a scheduler library, which would only replace one timer; Uptime Kuma, a whole service with its own
    database and screens, joined to ours by webhooks.
  - **FE-4 stays the platform's** (Phase 4's reconciler). This watch steps aside when it lands.
- **D7. Only an app that never went live can be deleted by its owner** (Rich: *"We can't allow folks to delete apps that
  have been actively used. i.e. production databases can't be deleted. We'll need some way to 'mark as deleted' which
  removes it from all paths, but we can't delete the data. That can only be an admin decision (due to data
  retention)"*; he chose *"Never been live"* as the line).
  - An app that has been live is only switched off. **FE-45** asks the platform for an owner's *mark as removed*, with
    an administrator alone deciding when its data goes. It is written in `api-findings.md`, and was carried at Rich's
    word to `manifest-8e` for the platform's record (`manifest-60` was not running).

## §1 The watch token, and the keeper

**Minting.** The browser mints one token per app: name *"Keeping watch"*, capabilities `project:read` and
`output:read`, `expiresInDays: 365` (the contract's ceiling). Minting needs no step-up, and any member may mint one.
It mints at two points:
- **when the app is made**, alongside the conversation's token (F2's *Make it*);
- **whenever a member opens *Your apps* or one of the app's own pages, and our server has no working token for that
  app.** The page asks `GET /api/apps/:projectId/keeping`, which answers `{ watching: boolean, until: string | null }`.

So every way of losing the token mends itself at the next member's visit:
- an app made before F6;
- an app switched back on (`restoreProject` leaves its tokens revoked);
- a token the platform refused (`4401`), which includes FE-11: removing a member revokes every token they minted;
- a token with under 30 days left.

**Handing it over.** `POST /api/apps/:projectId/keeping` with the secret, guarded as every change is (`Origin`, the
person). Our server tries it once (`getProject` with it) before keeping it, and answers `422` if it does not read that
project. When an expiring token is replaced, the page revokes the old one if this person minted it. Otherwise the old
one is left to expire, because only its minter may revoke it (`revokeToken`'s `404` for anyone else).

**Storage** (D2). A new table, `watch_tokens`:

| Column | |
|---|---|
| `project_id` | primary key |
| `token_id` | the platform's id, never secret |
| `sealed` | the secret, AES-256-GCM: a random 12-byte nonce, the ciphertext and its tag |
| `expires_at` | from the minted token |
| `minted_by` | our person id |
| `minted_at` | |

- **The key** is 32 bytes. In production it comes from `MANIFEST_APP_KEEPING_KEY` (base64). On the laptop it is a
  file our server generates at its first start, `packages/server/.keys/keeping.key`, mode `0600`, git-ignored.
- **Never in `.data/`**, so the database's copies kept there (`app-before-f4a.sqlite`, `app-f4a-checks.sqlite`) carry no
  usable token.
- **A missing or changed key** makes the sealed tokens unreadable. They are treated as missing, and re-minted at the
  next visit: nothing breaks.
- Node's own `crypto`, no dependency.

**The keeper** (`packages/server/src/keeping/`) starts with our server, in both modes, and opens one stream per stored
token through F3's `platformStream` (`platform/stream.ts`). That stream already sees each event once, reconnects after
a drop, and stops for good on a refusal, `4401` included.
- **Each event** is written once to `history`, keyed by the event's `id`, then handed to the rules (§2 to §4). The rules
  are pure: an event and what we know in, a line, an email or a *needs you* out.
- **A refusal**: the token is forgotten, and the history notes when watching stopped.
- **A gap**: after a restart or a reconnect, the replay is the newest 50 events (FE-7: no cursor). If none of them is
  one we already hold, the history records a gap from the last event we held to the oldest replayed, and says so
  (§2).
- **It only reads.** It calls nothing with the watch token but reads: the stream, `getProject` (the production
  address, the name), `listMembers` (who owns it, their addresses, refreshed on `member.added` and `member.removed`).
  `launch-actions.test.ts`'s scan grows to cover `keeping/`.

## §2 Coming back (moment 16)

***Your apps*: one card per app**, as F1 and F5 built it (the students' fact first, the other two addresses smaller, F5's
line before launch). F6 adds two states to the card:
- **switched off**, from `Project.state` and `archivedAt`: *"Switched off, 12 December"*, with **[Switch it back on]**
  for an owner (§5);
- **can't be reached**, from our keeper (§4): the students' fact turns *attention*, *"Your students can't reach it,
  since 10:03"*. Until F6, it would have kept reading *Answering*, because the platform's instance still reads
  `healthy` (FE-4).

**The needs-you band**, across the top of *Your apps* and on each app's Overview, **only when something does**. Each line
names the app and the thing, and carries its button. F6's sources:
1. **a question waiting in one of our conversations** (our own store), linking to the conversation;
2. **the live address down** (§4), with **[Start it again]**;
3. **a change that didn't go live**: a production incident with no fix under way, *"Nobody has lost anything; your
   students still have the version from before"*, with **[Give this to your agent]** (F5 starts that fix);
4. **a *Going live* row that is theirs to do**: a row F5's checklist draws as *attention*, for an app built and not
   launched, linking to its row.

A question an agent of their own raised (`listPendingActions`, FE-10) waits for F6b, whose *Agents* screen is where it is
answered.

***Since you were last here*.** At most five lines, newest first: on *Your apps* across their apps (each line names its
app), on the Overview the app's own.
- **"Last here"** is when their previous visit ended. A visit is page loads less than an hour apart, so a refresh does
  not empty the list. `persons` gains two times: `seen_at` and `previous_visit_ended_at`.
- **What becomes a line**, in our words:
  - it went live (`project.launched`);
  - a new version reached the students (`instance.healthy` on production);
  - a change didn't go live (`incident.opened` on production);
  - the students couldn't reach it, and it answered again (our watch's own entries, §4);
  - signed off, or turned down (`release.approved`, `release.approval_rejected`);
  - the dry run passed, or didn't (`rehearsal.completed`);
  - a request was sent to UBC's identity team or the Privacy Office, or they answered (`iam_registration.submitted`,
    `privacy_assessment.submitted`, `iam_registration.recorded`, `privacy_assessment.recorded`);
  - someone was added, removed, or changed role (`member.added`, `member.removed`);
  - switched off, or back on (`project.archived`, `project.restored`);
  - renamed (`project.renamed`).
- **Never a line**: builds, instances starting or retiring, commits, pushes, scans, tokens, secrets, AI keys, Manifest's
  own sign-on registrations (`sso.*`), and a registration's draft (`iam_registration.drafted`, F5b's to show). That is
  machinery (C3), or not yet anything to tell. The history table keeps every event; only the rules choose lines.
- **A person is named only where we can read who**: a member, by `userId`, from `listMembers`. Otherwise *"a Manifest
  administrator"* or *"someone"*. An event carries no actor's name.

**[Everything]** opens `/apps/:slug/history`:
- every line we kept, newest first, grouped by day;
- *"From 18 September."* at its foot, from the first event we hold;
- each gap the keeper recorded: *"We weren't watching between 2 and 5 October."*

`GET /api/apps/:projectId/history` answers only a member of the app, checked against the members the keeper keeps. Anyone
else is `404`, as the platform answers a stranger.

**If the reads fail:** *"We can't reach Manifest just now. Nothing of yours has changed."*

## §3 The emails

| Kind | What sends it | To |
|---|---|---|
| **It's in trouble** | `incident.opened` on production (*"a change didn't go live; your students still have the version from before"*); our watch finding the live address down; answering again, with how long it was down | every owner |
| **Your work is waiting** | a round ended while no page had the conversation open (F3's *"You can leave"*); a question waiting 24 hours, once per question | the conversation's person |
| **A long wait is over** | `release.approved`, `release.approval_rejected`; `rehearsal.completed`; `iam_registration.recorded`, `privacy_assessment.recorded` | every owner |
| **Who's on it changed** | `member.added` (a role change included), `member.removed` | every owner |

- **Nobody is emailed about what they did themselves**: the event's `machineDetail.userId` says who did it, where it
  carries one.
- **What one looks like:** plain text. The subject is *"Reading responses: a change didn't go live"*, and the body is two
  to four sentences in our words, one link to the right page (built from `config.origin`, so the laptop's links work in
  either mode), and *"You're getting this because you own Reading responses on Manifest."* No machinery, no log, no
  secret (C3).
- **The sentences** live in one words file for emails on our server, under the same words guard as the page's.
- **Once each.** An `emails` table, unique on kind, happening (an incident's id, an outage's start, a question's id, an
  event's id) and recipient. A replay, a reconnect or a restart sends nothing twice. A failed send is retried with
  growing waits for an hour, then recorded as not sent. It never holds up the keeper.
- **Delivery** (D5): nodemailer over SMTP. `MANIFEST_APP_SMTP_URL`, on the laptop `smtp://127.0.0.1:7111` (Mailpit, no
  authentication, no TLS), and `MANIFEST_APP_MAIL_FROM`. **Both modes send to Mailpit**, so nothing leaves the laptop.
- **Addresses:** owners' from `listMembers` (the watch token); the conversation's person's from `getMe`, kept in
  `persons` (an address is not a credential).

## §4 When the live app falls over (moment 19)

**The watch** (D6). Once a minute, the keeper sends one `GET` to each launched, switched-on app's students' address,
through the edge, as a student's browser would arrive, without following a redirect and with a 10-second ceiling:

| It answers | It is |
|---|---|
| `2xx`, `3xx`, `4xx` but `410` (a CWL app's sign-in redirect included) | answering |
| `410` | switched off: never down |
| `502`, `503`, `504`, or nothing within 10 s | a miss |

**Two misses in a row is down.** Nobody is emailed for a blip, and a fall is noticed within about two minutes. The draft
and trying-out addresses are not watched: the agent sees those. A small pure state machine holds it: *answering →
missed once → down → answering again*.

**Down:**
- the history: *"Your students couldn't reach it, from 10:03."*;
- every owner: the *in trouble* email;
- the card's students' fact and the band, with **[Start it again]**;
- a helper (`collaborator`) sees the same words and *"An owner can start it again."* in place of the button: only an
  owner may deploy to the students' address (§13).

**[Start it again]** runs in the person's own browser, never on our server, which deploys only to the draft. It is a
fresh `deploy` of the release the students' address was serving, behind F5's step-up card (moment 14). A redeploy
interrupts nobody (P4c).
- **`RELEASE_NOT_STAGED`** (trying-out has moved on to a newer version, and production takes only what staging
  serves): *"Your trying-out address has a newer version. Start that one instead, or put last week's back on trying-out
  first?"* The first is one deploy; the second is two (trying-out, then the students', with the sign-in).
- **Any other refusal** is said as F5's press already says it.
- **While it starts**, the students' address keeps whatever it has, and the page says *"Nobody has lost anything"*
  wherever that is true.

**Answering again** closes the outage at its first answer:
- the history and the owners' email: *"Answering again since 10:07. It was down for 4 minutes."*;
- for a day, the band shows that line with **[What happened?]**. It starts a conversation seeded plainly: *"Your
  students couldn't reach it between 10:03 and 10:07. Manifest didn't notice it stop, so there's no record of why, and
  nothing it wrote while it ran can be read."* A new kind of fix, `{ fix: { outage: { from, to } } }`, beside F5's
  incident and dry-run fixes. The lead agent reads the code for a cause. It cannot read production's output (§14), and
  says so.

**A change that didn't go live** (the platform sees this one): `incident.opened` on production → the email, the band's
line, and the Overview's *what went wrong* in our words with **[Give this to your agent]**. FE-38's `createdAt` (landed)
means the last attempt reads right after *Start it again* puts an older version back.

**What this cannot do**, on the Overview behind a quiet *"How we keep watch"*:
- it cannot say why the app fell over;
- it cannot see an app that answers wrongly;
- it watches only while our server runs.

## §5 End of term (moment 20)

**Where.** At the foot of the Overview, a quiet section, *"Switching it off"*, **for owners only**: **[Switch it off]**
for every app, and **[Delete it]** beside it only for an app that never went live. Helpers see neither. On *Your apps*, a
switched-off app's card reads *"Switched off, 12 December"*, with **[Switch it back on]** for an owner.

**[Switch it off].**
- A confirming step on the page, never a browser dialog: *"Your students' address will show 'This app has been switched
  off by its owner.' Everything is kept: its code, what students wrote, its settings. Switch it back on whenever you
  like."*, with **[Switch it off]** and **[Keep it running]**.
- `archiveProject`, behind F5's step-up card when the platform asks for one.
- **`500 PROJECT_TEARDOWN_INCOMPLETE`**: the page repeats the request once by itself (the platform's remedy). If it is
  still incomplete: *"It's switched off, but we didn't finish tidying up. Nothing is lost, and we'll finish by
  ourselves."*
- **Ours:** every token is revoked, so the keeper's stream closes `4401` and the watch token is forgotten; a round on that
  app pauses as for any refused token; the live watch reads `410` as switched off.
- **`409 PROJECT_ARCHIVED`**, anywhere: *"Reading responses is switched off. Switch it back on first."* One entry in our
  refusal words, so every screen says it the same way.

**[Switch it back on]**: no step-up (restoring takes nothing from anyone).
- `restoreProject`, then the page mints a fresh watch token at once (§1). The new stream's replay carries
  `project.archived` and `project.restored`, so the history has both lines although nobody watched in between.
- **An app that had been live:** *"It's back, but not running yet. [Start it for your students] puts the version from
  last term back, with everything they wrote."* Two deploys from the browser: trying-out first, then the students'
  address with the sign-in. The version is the one the students' address last served, read from production's newest
  instance (FE-38's `createdAt`).
- **A deploy refused because a registration lapsed over the summer** is said in F5's words, with a link to *Going live*,
  whose row shows what is needed.
- **An app that never went live:** *"It's back. Your draft starts again the next time we work on it."*

**[Delete it]**, only for an app that never went live (D7):
- a confirming step: *"Everything goes: its code, its addresses, what anyone wrote in it. This can't be undone. Its name
  becomes free."*, with **[Delete it for good]**, then the step-up card, which is the real friction (no typing its name);
- `deleteProject`, then `DELETE /api/apps/:projectId` on our server (owners only, guarded as every change is): our
  conversations, messages, plans, history, email records and watch token for it all go, since *"what anyone wrote in
  it"* includes what was written to us;
- **`409 PROJECT_LAUNCHED_NOT_DELETABLE`** (it went live meanwhile): *"Apps that have been live are kept, because UBC's
  rules decide when students' data is removed."*

**An app that has been live** shows, where *[Delete it]* would be: *"Apps that have been live are kept, because UBC's
rules decide when students' data is removed. Switch it off, and a Manifest administrator removes it when the rules
allow."* No button until FE-45 lands. Then **[Remove it from your apps]** follows, and our own rows for it are kept under
the same retention.

## §6 How we will know it works

- **Test first, as every plan.** Unit tests for each pure part:
  - the rules: event → line, email, *needs you*;
  - the outage machine, `410` included;
  - the seal: a round trip; a wrong or missing key gives *no token*, never a crash;
  - once-each: a replay, a reconnect or a restart sends nothing twice;
  - the gap: a replay with no event we hold;
  - *last here*'s one-hour visits.

  The keeper gets a recording fake stream, as F3's round has, and nodemailer's own test transport.
- **Screens** (jsdom):
  - the band's four sources;
  - *Since you were last here*, and the history page with its *"From …"* and its gaps;
  - the card's *switched off* and *can't reach it*;
  - *Start it again*: the `RELEASE_NOT_STAGED` choice, and a helper's view;
  - switching off, with the repeat on `TEARDOWN_INCOMPLETE`;
  - switching back on, and *Start it for your students*;
  - deleting, and the live app's sentence where *Delete it* would be.
- **The guards:** `launch-actions.test.ts`'s scan covers `keeping/`. The scan for `mft_` and `sk-` covers
  `watch_tokens` (sealed bytes only, never a secret in the clear) and the emails.
- **`scripts/check-keeping.sh`, in mock mode.** The platform's mock cannot play a launch or an incident (FE-40), so the
  script runs our keeper against a scripted stream and a pretend live address, both on a free port outside 7100–7199
  that the script makes answer or fall over, with our real SQLite store and **real email to Mailpit**, read back by our
  own subjects through its API. No test-only setting is added to our server. The screens get a headless-Chrome walk in
  mock mode, as every sitting has.
- **On the real platform, at Rich's word**, in a window after `manifest-8e`'s sitting 7 closes (an app live on 7100
  again, as F5's):
  - switch off, back on, and *Start it for your students*;
  - *Start it again* after the app falls over: **stopping its container touches the platform's Docker, so Rich is asked
    first**;
  - the emails in Mailpit;
  - the measurements below.

  Then Rich's click.

## To measure on 7100 (the plan's first sitting, in the platform's window)

1. What production's instances show after `archiveProject`: is the last-served release readable from the newest
   instance?
2. Whether a restored app's first deploys are refused for a lapsed registration, or a used sign-off (an approval is
   bound to an image digest).
3. Whether `archiveProject` asks for a step-up on the laptop.
4. How long `incident.opened` takes to reach a watch token's stream after a production deploy fails, and what a CWL
   app's students' address answers through the edge (expected: its sign-in redirect).

## What waits on the platform

- **Nothing to build F6.** Contract 1.5.0 (69 operations) has every operation it calls: `mintToken`, `revokeToken`,
  `listMembers`, `getProject`, `listInstances`, `deploy`, `archiveProject`, `restoreProject`, `deleteProject`, and the
  event stream with `4401`.
- **FE-45** (*mark as removed*): F6 says the sentence until it lands.
- **FE-4** (the platform noticing a dead app): our watch is the stop-gap.
- **FE-7** (a cursor on the stream's replay): our history says *"From …"* and names its gaps meanwhile.

## What F6 does not build

- **Moments 17 and 18, and the *Agents* screen**: F6b (D1). So also: questions from an agent of their own in the band;
  collaborators seeing each other's conversations (F2 left it to *People*).
- **F5b's actions** (drafting and sending the registrations, asking for sign-off). F6 emails when the long waits end,
  and F5b starts them.
- **A digest, quiet hours, or turning an email off.** One per happening (D3); add these if faculty ask.
- **Repository warnings** (`repository.secret_detected`, `visibility_enforced` and the rest): they are recorded in
  `history`, and are not lines, emails or *needs you* in F6. Whether a faculty member should hear of them, and in what
  words, is a question for later.
- **A copy of what students wrote**, and *"the same app, empty, for next year"*: the platform's list (the walk-through's
  moment 20).
