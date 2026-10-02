# The walk library

Headless Chrome over the DevTools protocol, for walking our screens in a real browser. Node 24's
own `WebSocket`, no dependency, TypeScript that plain `node` runs (it strips the types).

Every sitting since F1's wrote its own walk in its scratchpad and met the same traps
(ORIENTATION §7). They are solved here once. Write a sitting's walk in your scratchpad and import
this:

```js
import {
  walk,
  signInHere,
} from '/Users/rich/Developer/manifest-app/scripts/walk/index.ts'

const { page, report } = await walk({ out: process.argv[2] }) // shots and log.txt go there
await signInHere(page) // mock mode: Continue with CWL, Instructor One
for (const width of [1280, 375]) {
  await page.setWidth(width)
  await page.go('/apps/mock-app/preview')
  await page.untilWords('Your draft')
  report.check(`${width} fits`, (await page.layout()).length === 0)
  await page.shot('preview')
}
report.finish([page]) // adds: nothing thrown, no error logged, nothing written
```

```bash
node walk.mjs <your-scratchpad>/out
node scripts/walk/self-test.ts      # the library's own proof: every check red, then green
node scripts/walk/read-only.ts      # our screens at 1280 and 375; presses nothing
```

## What each piece closes

| Trap (ORIENTATION §7)                                                                                          | Where it is closed                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A walk that throws leaves Chrome holding its port; the next walk talks to the old one                          | `chrome.ts`: Chrome leads its own process group, stopped whole (its helpers otherwise outlive it) on `exit`, SIGINT, SIGTERM, SIGHUP and any throw; the port is `0` (the OS picks, never 7100–7199); a Chrome orphaned by a `kill -9` is stopped, and its profile removed, at the next launch |
| The IdP remembers who signed in                                                                                | `chrome.ts`: a fresh profile every launch, removed at exit; `newPage({ isolated: true })` gives a second person their own cookies                                                                                                                                                             |
| Headless Chrome refuses the clipboard (_"Document is not focused"_)                                            | `Page.open` emulates focus (measured: a tab is focused only while in front, so a second person's tab takes it) and grants the clipboard (a walk's click is no gesture: _"Write permission denied"_). Trust the page's own _"Copied"_: `readText` answers empty                                |
| A Tab check reads `<body>` past the last control, whose text holds a hidden control's name (F4a's folded rail) | `page.tabTo(name)`: matched by the focused control's accessible name, stopped at `<body>`, from the top of the page each time; answers the presses and the ring (`''` for none)                                                                                                               |
| jsdom's names are not Chrome's (_"Copythe address"_)                                                           | `page.names(role)` and `page.press(name)` read `Accessibility.getFullAXTree`                                                                                                                                                                                                                  |
| A chip runs past its card while the page fits                                                                  | `page.layout()`: each card's children against the card                                                                                                                                                                                                                                        |
| A word runs past its sentence while every box fits                                                             | `page.layout()`: each sentence's `scrollWidth` against its `clientWidth` (give it a word that cannot break: Chrome breaks at hyphens)                                                                                                                                                         |
| `End` in a wrapped textarea stops at the visual line                                                           | `page.type(field, text)`: `setSelectionRange` first                                                                                                                                                                                                                                           |
| A fast press reads the old page                                                                                | `page.after(what, action, read, args)`: waits until `read` answers differently                                                                                                                                                                                                                |
| A navigation's `readyState` can be the old page's                                                              | `page.go(path)` waits for the new document                                                                                                                                                                                                                                                    |
| A React id's `:` is refused by `#id`                                                                           | `page.type({ id })` uses `getElementById`                                                                                                                                                                                                                                                     |
| `textContent` runs words together; `innerText` upper-cases                                                     | `page.words(selector, without)` (`without: '.mono'` leaves hostnames out, for C3)                                                                                                                                                                                                             |
| Signing in through the edge from Node                                                                          | `signIn({ app, user })`: the three hops, one jar per person keyed by host; `person.stepUp(returnTo)` forgets the IdP's cookies first; `page.adopt(person.jar.cookies())` hands them to a tab                                                                                                  |
| A read-only walk starts work by mistake                                                                        | Every write to `/api/` or `/v1/` is refused in the browser and listed unless the walk passes `allowWrites: true`; `report.finish` fails a walk that tried one. A problem report and sign-in pass                                                                                              |

## Notes

- **Through the edge**, Node needs the platform's CA before it starts:
  `NODE_EXTRA_CA_CERTS=/Users/rich/Developer/manifest/infra/ca/manifest-root.crt`. Chrome uses the
  system's. A walk on the real platform (7100) is Rich's word, every time.
- **Make Bearer calls from Node**, never the page: the page adds its cookie.
- **The mock answers its own fixtures** (FE-27). `page.rewrite({ path, body })` answers a request
  under `/api/` or `/v1/` for it; assert what was sent, not what the mock said.
- **A function given to `page.run`, `until` or `after` runs in the page**: it is sent as its
  source, so it may use nothing from outside itself. Pass values as arguments.
- **Run a new walk check once with the fix removed**, as any control: `self-test.ts` does this for
  every check here.
