import { LiveSteps, type Step } from '@manifest-app/ui'
import { useEffect, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { words } from '../../words.js'

/** The three events `createProject` publishes, in order, and the line each ticks (moment 4). */
const EVENTS = ['project.created', 'repository.seeded', 'spec.validated'] as const

/**
 * MAKING IT'S THREE LINES: each ticks on its real event, never on a timer (LiveSteps). The
 * first not yet seen is the one working now.
 */
export function MakingSteps({ name, seen }: { name: string; seen: ReadonlySet<string> }) {
  const lines = [
    words.making.yours(name),
    words.making.startingPoint,
    words.making.addresses,
  ]
  const now = EVENTS.findIndex((type) => !seen.has(type))
  const steps: Step[] = EVENTS.map((type, i) => ({
    text: lines[i]!,
    state: seen.has(type) ? 'done' : i === now ? 'now' : 'next',
  }))
  return <LiveSteps steps={steps} />
}

/**
 * MOMENT 4'S END, HANDED OVER (F2 Task 8): the project is made and our server holds its
 * token. The page watches the project's stream for these seconds only: its replay carries the
 * three creation events, and once the replay is done the stream is closed. F3 owns it after.
 */
export function Making({
  platform,
  project,
  onSettled,
}: {
  platform: Platform
  project: { id: string; name: string }
  /** The replay is done, or the stream could not be opened: either way, on to the plan. */
  onSettled?: () => void
}) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    let live = true
    const watch = platform.watchProject(project.id, (event) => {
      if (live) setSeen((before) => new Set(before).add(event.type))
    })
    const settle = () => {
      watch.close()
      if (live) onSettled?.()
    }
    watch.ready.then(settle, settle)
    return () => {
      live = false
      watch.close()
    }
  }, [project.id])
  return (
    <div className="making">
      <h1 className="page-title">{project.name}</h1>
      <MakingSteps name={project.name} seen={seen} />
    </div>
  )
}
