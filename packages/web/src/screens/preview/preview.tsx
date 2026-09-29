import type { Schemas } from '@manifest/contract'
import { Button, Card, SegmentedControl, StateChip, TwoFacts } from '@manifest-app/ui'
import { useCallback, useEffect, useId, useState } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo, remember, TABS, type Tab } from '../../router.js'
import { words } from '../../words.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { Hostname } from '../your-apps/your-apps.js'
import {
  attemptFact,
  needsIncidents,
  releasesToRead,
  servingFact,
  type Attempt,
  type Said,
} from './facts.js'
import { TryItAs } from './try-it-as.js'

const w = words.preview
/** The three worlds (walk-through moment 7), each an address of the app's. */
const KIND: Record<Tab, Schemas['Environment']['kind']> = {
  draft: 'sandbox',
  'trying-out': 'staging',
  students: 'production',
}

type Address = { env: Schemas['Environment']; serving: Said; attempt: Attempt | null }
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | { state: 'ready'; addresses: Partial<Record<Tab, Address>> }

/**
 * THE PREVIEW'S READS, IN THE PERSON'S SESSION (Decision 2): the app's addresses, then each
 * one's instances, the versions that date them, and, when a failure is the last attempt, its
 * incident. A version that cannot be read loses its date, not the page; a session that ended
 * anywhere is the shell's to say.
 */
async function read(
  platform: Platform,
  projectId: string,
  now: Date,
  timeZone: string | undefined,
): Promise<Partial<Record<Tab, Address>>> {
  const environments = await platform.listEnvironments(projectId)
  const addresses = await Promise.all(
    environments.map(async (env): Promise<[Tab, Address] | undefined> => {
      const tab = TABS.find((t) => KIND[t] === env.kind)
      if (tab === undefined) return undefined
      const { instances } = await platform.listInstances(env.id)
      const read = await Promise.allSettled(
        releasesToRead(env, instances).map((id) => platform.getRelease(id)),
      )
      for (const r of read)
        if (r.status === 'rejected') {
          const refusal = refusalOf(r.reason)
          if (refusal.kind === 'signed-out') throw r.reason
          if (refusal.kind === 'refused')
            console.warn(`Manifest refused a read: ${refusal.code} (${refusal.status})`)
        }
      const releases = new Map(
        read.flatMap((r) =>
          r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [],
        ),
      )
      const incidents = needsIncidents(env, instances, releases)
        ? (await platform.listIncidents(env.id)).incidents
        : []
      const release =
        env.instance === null ? undefined : releases.get(env.instance.releaseId)
      return [
        tab,
        {
          env,
          serving: servingFact(env, release, timeZone),
          attempt: attemptFact(env, instances, incidents, releases, now, timeZone),
        },
      ]
    }),
  )
  return Object.fromEntries(addresses.filter((a) => a !== undefined))
}

/**
 * MOMENT 7, SEEING IT (F4 Task 5): the switcher across the top, each address in mono with a way
 * to open it in a new tab (never a frame: apps refuse to be framed), what each world is, and the
 * two facts. Then *Ask for a change*.
 */
export function Preview({
  platform,
  project,
  tab: first,
  expire,
  now = () => new Date(),
  timeZone,
}: {
  platform: Platform
  project: Schemas['Project']
  tab: Tab
  expire: () => void
  now?: () => Date
  timeZone?: string
}) {
  const [tab, setTab] = useState<Tab>(first)
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const panels = useId()

  useEffect(() => {
    let live = true
    read(platform, project.id, now(), timeZone).then(
      (addresses) => live && setLoaded({ state: 'ready', addresses }),
      (error: unknown) => {
        if (!live) return
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') expire()
        else setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      live = false
    }
    // `now` is a clock, read once per attempt: never a reason to read again.
  }, [platform, project.id, timeZone, expire, attempt])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const choose = (value: string) => {
    const chosen = TABS.find((t) => t === value) ?? 'draft'
    setTab(chosen)
    remember(`/apps/${encodeURIComponent(project.slug)}?tab=${chosen}`)
  }

  return (
    <div className="preview">
      <h1 className="page-title">{project.name}</h1>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          <SegmentedControl
            label={w.switcherLabel}
            options={TABS.map((t) => ({
              value: t,
              label: w.tabs[t],
              controls: `${panels}-${t}`,
            }))}
            value={tab}
            onChange={choose}
          />
          {TABS.map((t) => (
            <section
              key={t}
              id={`${panels}-${t}`}
              role="tabpanel"
              aria-label={w.tabs[t]}
              hidden={t !== tab}
              className="preview__panel"
            >
              {loaded.addresses[t] === undefined ? null : (
                <Panel tab={t} address={loaded.addresses[t]} />
              )}
            </section>
          ))}
          <div className="preview__change">
            <p className="body-lead">{w.notRight}</p>
            <Button
              kind="secondary"
              {...linkTo(`/apps/${encodeURIComponent(project.slug)}/change`)}
            >
              {w.askForChange}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** One address: where it is, what its world is, and the two facts. */
function Panel({ tab, address }: { tab: Tab; address: Address }) {
  const { env, serving, attempt } = address
  const reaches = env.instance !== null
  return (
    <div className="preview__columns">
      <div className="preview__world">
        <div className="preview__address">
          <span className="mono">
            <Hostname name={env.hostname} />
          </span>
          {/* Only where something is there to open; a tab of its own, never a frame. */}
          {reaches ? (
            <a
              className="mf-btn mf-btn--secondary mf-btn--sm"
              href={env.url}
              target="_blank"
              rel="noopener"
            >
              {w.open}
            </a>
          ) : null}
        </div>
        {tab === 'draft' ? (
          <>
            <p className="body-lead">{w.draftIs}</p>
            {reaches ? <TryItAs /> : null}
          </>
        ) : null}
        {tab === 'trying-out' ? (
          <Card className="preview__wait" tone="waiting">
            <StateChip state="waiting" label={w.waitingOn} />
            <p className="body-lead">{w.tryingOut}</p>
          </Card>
        ) : null}
        {tab === 'students' ? <p className="body-lead">{w.students}</p> : null}
      </div>
      <div className="preview__facts">
        {attempt === null ? (
          // Nothing tried yet: the draft says when it appears; elsewhere the world says it.
          tab === 'draft' ? (
            <p className="body-lead">{serving.words}</p>
          ) : null
        ) : (
          <TwoFacts
            serving={{
              overline: w.facts.serving,
              title: serving.words,
              tone: serving.tone,
            }}
            attempt={{
              overline: w.facts.attempt,
              title: attempt.words,
              tone: attempt.tone,
            }}
            // The footnote promises an older version answering while a new one proves itself.
            {...(reaches && attempt.tone !== 'steady' ? {} : { foot: null })}
          />
        )}
      </div>
    </div>
  )
}
