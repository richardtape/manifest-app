import type { Schemas } from '@manifest/contract'
import type { AppConversation } from '@manifest-app/server/progress'
import { Card, StateChip } from '@manifest-app/ui'
import { useEffect, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import { linkTo } from '../../router.js'
import { words } from '../../words.js'
import { agoWords } from '../preview/facts.js'
import { SupportReference } from '../reference.js'
import { pressFailed } from './press.js'

const c = words.change.conversations

/** A row's chip, in words: one of the five states, and a waiting one's place. */
function said(row: AppConversation): string {
  switch (row.chip) {
    case 'waiting':
      return c.waiting(row.line?.place ?? 1)
    case 'steady':
      return c.built
    case 'notyet':
      return row.state === 'set-aside' ? c.setAside : c.stopped
    case 'working':
      return c.working
    case 'attention':
      return c.attention
  }
}

/**
 * THE APP'S CONVERSATIONS (walk-through moment 8; F4 Task 9): every piece of work on it, newest
 * first, and where each one left it: its title, a link to it, its chip, and when.
 */
export function AppConversations({
  ours,
  project,
  expire,
  now,
  timeZone,
}: {
  ours: Ours
  project: Schemas['Project']
  expire: () => void
  now: () => Date
  timeZone: string | undefined
}) {
  const [rows, setRows] = useState<AppConversation[] | null>(null)
  const [reference, setReference] = useState<string>()
  useEffect(() => {
    let live = true
    ours.conversationsOn(project.id).then(
      (answered) => live && setRows(answered),
      (error: unknown) => {
        if (!live) return
        const failed = pressFailed(error, 'conversationsOn')
        if (failed.expired) expire()
        else setReference(failed.reference)
      },
    )
    return () => {
      live = false
    }
  }, [ours, project.id, expire])

  const slug = encodeURIComponent(project.slug)
  return (
    <div className="conversations">
      <h1 className="page-title" id="conversations-title">
        {c.title}
      </h1>
      <p className="body-lead">{c.lead(project.name)}</p>
      {reference === undefined ? null : (
        <div role="alert">
          <Card tone="attention">
            <p className="body-lead">{words.refused.body}</p>
            <SupportReference reference={reference} />
          </Card>
        </div>
      )}
      {rows === null ? null : rows.length === 0 ? (
        <p>{c.none}</p>
      ) : (
        <ul className="conversations__list" aria-labelledby="conversations-title">
          {rows.map((row) => (
            <li key={row.id} className="conversations__row">
              <a
                className="conversations__title"
                {...linkTo(`/apps/${slug}/conversations/${encodeURIComponent(row.id)}`)}
              >
                {row.title}
              </a>
              <StateChip state={row.chip} label={said(row)} />
              <span className="conversations__when">
                {agoWords(new Date(row.updatedAt), now(), timeZone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
