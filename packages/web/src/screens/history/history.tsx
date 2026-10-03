import type { Line } from '@manifest-app/server/progress'
import { Button } from '@manifest-app/ui'
import { useCallback, useEffect, useState } from 'react'
import { OurRefusal, type Ours } from '../../ours/api.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { clockWords, dayWords, lineWords } from '../keeping/lines.js'

type Read = Awaited<ReturnType<Ours['history']>>
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble' }
  | { state: 'missing' }
  | { state: 'ready'; history: Read }

/** A day's lines, or a gap where we were not watching: in the order they happened, newest first. */
type Piece =
  { kind: 'day'; day: string; lines: Line[] } | { kind: 'gap'; from: string; to: string }

/**
 * Each gap goes where it happened: before the first line older than its end. A line AT its end is
 * the first one heard again, so it stays above the gap (minors m65). Lines and gaps both arrive
 * from our server, newest lines first.
 */
function piecesOf(history: Read, timeZone: string | undefined): Piece[] {
  const gaps = [...history.gaps].sort((a, b) => Date.parse(b.to) - Date.parse(a.to))
  const pieces: Piece[] = []
  const gapsUntil = (at: number) => {
    while (gaps.length > 0 && Date.parse(gaps[0]!.to) > at) {
      const gap = gaps.shift()!
      pieces.push({ kind: 'gap', from: gap.from, to: gap.to })
    }
  }
  for (const line of history.lines) {
    gapsUntil(Date.parse(line.at))
    const day = dayWords(line.at, timeZone)
    const last = pieces.at(-1)
    if (last?.kind === 'day' && last.day === day) last.lines.push(line)
    else pieces.push({ kind: 'day', day, lines: [line] })
  }
  gapsUntil(-Infinity)
  return pieces
}

/**
 * AN APP'S HISTORY (F6 Task 9, design §2, *[Everything]*): every line our server kept, newest
 * first, grouped by the person's day, each gap where it happened, and *"From 18 September."* at its
 * foot. Ours alone: our server answers the app's members, and anyone else is *"There's nothing
 * here."* A read that fails says so, and that nothing of theirs has changed.
 */
export function History({
  ours,
  project,
  timeZone,
}: {
  ours: Ours
  project: { id: string; slug: string; name: string }
  timeZone?: string | undefined
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    ours.history(project.id).then(
      (history) => live && setLoaded({ state: 'ready', history }),
      (error: unknown) => {
        if (!live) return
        const missing = error instanceof OurRefusal && error.status === 404
        setLoaded({ state: missing ? 'missing' : 'trouble' })
      },
    )
    return () => {
      live = false
    }
  }, [ours, project.id, attempt])
  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const h = words.keeping.history
  return (
    <div className="history">
      <h1 className="page-title">{h.title}</h1>
      {loaded.state === 'trouble' ? (
        <div role="alert" className="history__trouble">
          <p className="body-lead">{h.cantReach}</p>
          <div>
            <Button kind="secondary" onClick={retry}>
              {h.retry}
            </Button>
          </div>
        </div>
      ) : null}
      {loaded.state === 'missing' ? (
        <p className="body-lead">
          {words.notFound.body} <a {...linkTo('/')}>{words.notFound.link}</a>
        </p>
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          {loaded.history.lines.length === 0 ? (
            <p className="body-lead">{h.empty}</p>
          ) : null}
          {piecesOf(loaded.history, timeZone).map((piece) =>
            piece.kind === 'gap' ? (
              <p key={`gap-${piece.to}`} className="history__gap body-small">
                {h.gap(dayWords(piece.from, timeZone), dayWords(piece.to, timeZone))}
              </p>
            ) : (
              <section key={`day-${piece.lines[0]!.id}`} className="history__day">
                <h2 className="heading">{piece.day}</h2>
                <ul className="history__lines">
                  {piece.lines.map((line) => (
                    <li key={line.id} className="history__line">
                      <span className="history__when body-small">
                        {clockWords(line.at, timeZone)}
                      </span>
                      <span className="body">{lineWords(line, timeZone)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
          {loaded.history.from === null ? null : (
            <p className="history__from body-small">
              {h.from(dayWords(loaded.history.from, timeZone))}
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
