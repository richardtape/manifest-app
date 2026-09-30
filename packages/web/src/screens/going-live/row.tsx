import { StateChip } from '@manifest-app/ui'
import type { ReactNode } from 'react'
import { words } from '../../words.js'
import { Hostname } from '../your-apps/your-apps.js'
import type { Row } from './checklist.js'

const g = words.goingLive

/**
 * One short job: its state in a word, what it is, one sentence, and whose it is; and, when it is
 * theirs, the one thing to press (`children`).
 */
export function RowView({ row, children }: { row: Row; children?: ReactNode }) {
  const [before, after] =
    row.address !== null && row.words.includes(row.address)
      ? row.words.split(row.address, 2)
      : [row.words, undefined]
  return (
    <li className="going-live__row">
      <StateChip state={row.state} label={g.state[row.state]} />
      <div className="going-live__row-words">
        <span className="going-live__name">{row.name}</span>
        <p className="body-small">
          {before}
          {after === undefined || row.address === null ? null : (
            <>
              <span className="mono">
                <Hostname name={row.address} />
              </span>
              {after}
            </>
          )}
        </p>
        {row.owner === '' ? null : <span className="going-live__owner">{row.owner}</span>}
        {children}
      </div>
    </li>
  )
}
