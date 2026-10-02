import type { AppRef, SinceLine } from '@manifest-app/server/progress'
import { useId } from 'react'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { clockWords, dayWords, lineWords } from './lines.js'

/** At most five lines (design §2); our server answers no more, and the page keeps to it too. */
const MOST = 5

/**
 * *SINCE YOU WERE LAST HERE* (F6 Task 9, design §2): only when they have been here before and
 * something has happened since. On *Your apps* each line names its app, a link to its history; on
 * an app's Overview, its own lines and **[Everything]**.
 */
export function Since({
  lastHere,
  lines,
  timeZone,
  app,
}: {
  lastHere: string | null
  lines: SinceLine[]
  timeZone?: string | undefined
  /** The Overview's own app: its lines are its own, and [Everything] opens its history. */
  app?: AppRef
}) {
  const id = useId()
  if (lastHere === null || lines.length === 0) return null
  const s = words.keeping.since
  const history = (slug: string) => `/apps/${encodeURIComponent(slug)}/history`
  return (
    <section className="since" aria-labelledby={id}>
      <h2 id={id} className="heading">
        {s.title}
      </h2>
      <ul className="since__lines">
        {lines.slice(0, MOST).map((line) => (
          <li key={line.id} className="since__line">
            <span className="since__when body-small">
              {`${dayWords(line.at, timeZone)}, ${clockWords(line.at, timeZone)}`}
            </span>
            <span className="since__what body">
              {app === undefined ? (
                <>
                  <a {...linkTo(history(line.app.slug))}>{line.app.name}</a>
                  {': '}
                </>
              ) : null}
              {lineWords(line, timeZone)}
            </span>
          </li>
        ))}
      </ul>
      {app === undefined ? null : (
        <p className="since__everything">
          <a {...linkTo(history(app.slug))}>{s.everything}</a>
        </p>
      )}
    </section>
  )
}
