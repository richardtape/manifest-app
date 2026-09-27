# manifest-app — the faculty front-end for Manifest

The product faculty members use: they describe an app, an agent builds it, and Manifest deploys it. It is served
at `https://app.manifest.internal` on the laptop, from this repository's server on port 7105. It is a separate
project from the platform (`../manifest`, spec §5), and consumes its API through `@manifest/contract`.

**Where things stand (2026-09-27, end of the first session):** no code yet, by design.
- **The walk-through is drafted end to end** (20 moments, with Rich's decisions recorded), and awaits his
  review as a whole.
- **The API findings are listed** (FE-1 to FE-25), with what to carry to the platform session first.
- **Next:** Rich's review of the walk-through, then a plan in sittings (`superpowers:writing-plans`), then the
  first clickable slice against the mock.

| Read | For |
|---|---|
| [`walkthrough.md`](./walkthrough.md) | **The design**: one instructor, one app, from sign-in to the end of term |
| [`api-findings.md`](./api-findings.md) | Every gap in the platform's API, numbered `FE-n`, for Rich to carry to the platform session |
| [`agents.md`](./agents.md) | The agents that do the work: who calls whom, what each is given, who pays |
| [`2026-09-27-reading-note.md`](./2026-09-27-reading-note.md) | What the first session read, and what surprised it |
| [`research/`](./research) | The first session's read-only research: a digest of the contract, and an inventory of the prototype and components |

**Rules this repository keeps** (from the brief of 2026-09-27):
- Nothing in `../manifest` is changed from here. Never run its tests, `make reset`, `make demo*` or
  `pnpm contract:write`: they truncate the shared database or restart the shared edge.
- Port 7105 is ours; 7102 is `manifest-mock`.
- Passwords are Rich's to type.
- An API gap is a finding, never a workaround.
