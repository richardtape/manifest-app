/**
 * A WALK'S RECORD: each check PASS or FAIL with what it saw, a log with times, and the exit
 * code. `finish` adds the page's own trouble as checks (nothing thrown, nothing written by a
 * read-only walk), prints everything, and ends the walk, which stops Chrome (`chrome.ts`).
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from './page.ts'

export class Report {
  readonly out: string
  readonly results: { ok: boolean; name: string; detail: string }[] = []
  private started = Date.now()

  constructor(out: string) {
    this.out = out
    mkdirSync(out, { recursive: true })
  }

  /** One check; answers whether it passed. */
  check(name: string, ok: boolean, detail = ''): boolean {
    this.results.push({ ok, name, detail })
    this.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`)
    return ok
  }

  /** A line to the console and to `log.txt`, with the seconds since the walk began. */
  log(line: string): void {
    const stamped = `${((Date.now() - this.started) / 1000).toFixed(1).padStart(6)}s ${line}`
    console.log(stamped)
    appendFileSync(join(this.out, 'log.txt'), stamped + '\n')
  }

  get failed(): number {
    return this.results.filter((r) => !r.ok).length
  }

  /**
   * The page's trouble as checks, the tally, and the end of the walk: exit 0 only when every
   * check passed. Failed requests are listed, not failed: a walk that expects a 404 says so.
   */
  finish(pages: Page[] = []): never {
    for (const page of pages) {
      const { exceptions, consoleErrors, failedRequests, blocked } = page.trouble
      const which =
        pages.length > 1 ? ` (${page.options.base}, ${page.sessionId.slice(0, 6)})` : ''
      this.check(
        `the page threw nothing${which}`,
        exceptions.length === 0,
        exceptions.join(' | '),
      )
      this.check(
        `the page logged no error${which}`,
        consoleErrors.length === 0,
        consoleErrors.join(' | '),
      )
      if (!page.options.allowWrites)
        this.check(
          `the walk wrote nothing${which}`,
          blocked.length === 0,
          blocked.join(', '),
        )
      if (failedRequests.length)
        this.log(`requests that failed: ${failedRequests.join(', ')}`)
    }
    const passed = this.results.length - this.failed
    this.log(
      `${this.failed ? 'WALK: FAILURES' : 'WALK: ALL PASS'} — ${passed}/${this.results.length}; shots and log in ${this.out}`,
    )
    process.exit(this.failed ? 1 : 0)
  }
}
