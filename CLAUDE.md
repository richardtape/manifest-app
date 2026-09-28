# manifest-app — working notes for Claude

**Read [`docs/ORIENTATION.md`](docs/ORIENTATION.md) before doing anything else.** It is written for zero context:
what this repository is, the rules, the document map, and where the next job is (the current plan's sittings table,
via [`docs/plans/roadmap.md`](docs/plans/roadmap.md)).

The short version of the rules:
- **Never change anything in `/Users/rich/Developer/manifest`**, and never run its tests, `make reset`,
  `make demo*` or `pnpm contract:write`. `manifest-mock` on 7102 is fine. Ask before starting the real control
  plane.
- **7105 is ours.** The platform owns 7100–7199. Never touch Laravel Valet.
- **Passwords are Rich's to type. Ask before `sudo`. Never edit the platform's spec.**
- **Stage by name**: never `git add -A`, `.` or `commit -a`. Commit on `main`, per task. Nothing is pushed.
- **C3:** a faculty member is never shown infrastructure. Five states only. *We*, everywhere.
- **An API gap is a finding** (`docs/api-findings.md`, the next `FE-n`), never a workaround.
