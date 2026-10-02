import type { Schemas } from '@manifest/contract'
import type { Need, SinceLine } from '@manifest-app/server/progress'
import { Button, Card, StateChip } from '@manifest-app/ui'
import { Fragment, useCallback, useEffect, useState } from 'react'
import type { Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { rowsOf } from '../going-live/checklist.js'
import type { PageNeed } from '../keeping/lines.js'
import { NeedsBand } from '../keeping/needs.js'
import { useRole } from '../keeping/role.js'
import { Since } from '../keeping/since.js'
import { ensureEach } from '../keeping/watch.js'
import { refusalOf } from '../../platform/refusal.js'
import { linkTo } from '../../router.js'
import { SwitchBackOn } from '../overview/switching.js'
import { TroubleNotice, type Trouble } from '../trouble.js'
import { words } from '../../words.js'
import {
  appCard,
  beforeLaunch,
  mine,
  releasesToRead,
  unreadableCard,
  type Address,
  type AppCard,
} from './model.js'

/** Our server's reads (F6 Task 9): a failure of ours loses the band or the lines, never the page. */
type Ours_ = { needs: Need[]; since: { lastHere: string | null; lines: SinceLine[] } }
type Loaded =
  | { state: 'loading' }
  | { state: 'trouble'; trouble: Trouble }
  | {
      state: 'ready'
      /** The cards, with our watch's outages as our server last said (F6: arrives on its own). */
      cardsWith: (downs: ReadonlyMap<string, string>) => AppCard[]
      /** The page's own needs: a Going live row theirs to do. */
      goingLive: PageNeed[]
    }

/**
 * THE READS BEHIND *YOUR APPS*. `listProjects`, then one `getProject?expand=environments`
 * per app, then one `getRelease` per release an answering address reaches, and one
 * `getLaunchReadiness` per app built and not launched (F5 Decision 3). That is FE-10's N+1,
 * accepted at pilot scale. No `listInstances`: the address's own `instance` is what reaches
 * students (FE-27).
 */
async function read(
  platform: Platform,
  me: Schemas['Me'],
): Promise<{
  cardsWith: (downs: ReadonlyMap<string, string>) => AppCard[]
  read: Schemas['Project'][]
  goingLive: PageNeed[]
}> {
  const projects = mine(await platform.listProjects(), me)
  const read = await Promise.allSettled(projects.map((p) => platform.getProject(p.id)))
  const expanded = read.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const releaseIds = releasesToRead(expanded)
  const asking = expanded.filter((p) =>
    beforeLaunch(
      p,
      p.environments?.find((e) => e.kind === 'sandbox'),
    ),
  )
  const [releases, readiness] = await Promise.all([
    Promise.allSettled(releaseIds.map((id) => platform.getRelease(id))),
    Promise.allSettled(asking.map((p) => platform.getLaunchReadiness(p.id))),
  ])

  // ONE APP THAT CANNOT BE READ DOES NOT HIDE THE OTHERS: its card says it cannot tell, and a
  // release that cannot be read is Answering without its date. But a 401 anywhere is the
  // session ending, and when nothing at all could be read, it is the page's own notice.
  // A checklist that cannot be read loses its card's line, and nothing else.
  const failures = [...read, ...releases, ...readiness].flatMap((r) =>
    r.status === 'rejected' ? [r.reason as unknown] : [],
  )
  const ended = failures.find((reason) => refusalOf(reason).kind === 'signed-out')
  if (ended !== undefined) throw ended
  if (projects.length > 0 && read.every((r) => r.status === 'rejected')) throw failures[0]
  for (const reason of failures) {
    const refusal = refusalOf(reason)
    if (refusal.kind === 'refused')
      console.warn(`Manifest refused a read: ${refusal.code} (${refusal.status})`)
  }

  const releaseById = new Map(
    releases.flatMap((r) =>
      r.status === 'fulfilled' ? [[r.value.id, r.value] as const] : [],
    ),
  )
  const checklists = new Map(
    asking.flatMap((p, i) => {
      const r = readiness[i]
      return r?.status === 'fulfilled' ? [[p.id, r.value] as const] : []
    }),
  )
  const cardsWith = (downs: ReadonlyMap<string, string>) =>
    projects.map((project, i) => {
      const r = read[i]
      return r?.status === 'fulfilled'
        ? appCard(
            r.value,
            releaseById,
            undefined,
            checklists.get(r.value.id),
            downs.get(r.value.id),
          )
        : unreadableCard(project)
    })
  // The page's own (design §2, source 4): a Going live row theirs to do, for an app not yet live.
  const goingLive: PageNeed[] = asking.flatMap((p) => {
    const checklist = checklists.get(p.id)
    if (checklist === undefined) return []
    const theirs = rowsOf(checklist, { hostname: null }).some(
      (row) => row.state === 'attention',
    )
    return theirs
      ? [
          {
            kind: 'going-live',
            app: { projectId: p.id, name: p.name ?? p.slug, slug: p.slug },
          },
        ]
      : []
  })
  return { cardsWith, read: expanded, goingLive }
}

/** Our server's two reads, each lost alone: no band, or no lines (Task 9). */
async function keepingOf(ours: Ours): Promise<Ours_> {
  const [needs, since] = await Promise.allSettled([ours.needs(), ours.since()])
  return {
    needs: needs.status === 'fulfilled' ? needs.value : [],
    since: since.status === 'fulfilled' ? since.value : { lastHere: null, lines: [] },
  }
}

/** *YOUR APPS* (moments 2 and 16). */
export function YourApps({
  platform,
  ours,
  me,
  expire,
}: {
  platform: Platform
  ours: Ours
  me: Schemas['Me']
  expire: () => void
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // F6 TASK 9: our server's needs and lines, read on their own: the page never waits for them.
  const [keeping, setKeeping] = useState<Ours_ | null>(null)
  useEffect(() => {
    let live = true
    void keepingOf(ours).then((read) => live && setKeeping(read))
    return () => {
      live = false
    }
  }, [ours, attempt])

  useEffect(() => {
    let live = true
    read(platform, me).then(
      ({ cardsWith, read: apps, goingLive }) => {
        if (!live) return
        setLoaded({ state: 'ready', cardsWith, goingLive })
        // F6 TASK 8: each app's Keeping watch, after the page's own reads, one at a time.
        void ensureEach(platform, ours, apps, () => live)
      },
      (error: unknown) => {
        if (!live) return
        // A session that ended mid-page is the shell's to say (Review Focus 1). Anything else
        // is our words, never the platform's (Review Focus 2 and 5).
        const refusal = refusalOf(error)
        if (refusal.kind === 'signed-out') expire()
        else setLoaded({ state: 'trouble', trouble: refusal })
      },
    )
    return () => {
      live = false
    }
  }, [platform, ours, me, expire, attempt])

  const retry = useCallback(() => {
    setLoaded({ state: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const w = words.yourApps
  const downs = new Map(
    (keeping?.needs ?? []).flatMap((n) =>
      n.kind === 'down' ? [[n.app.projectId, n.from] as const] : [],
    ),
  )
  const cards = loaded.state === 'ready' ? loaded.cardsWith(downs) : []
  return (
    <>
      <h1 className="page-title">{words.shell.yourApps}</h1>
      {loaded.state === 'trouble' ? (
        <TroubleNotice trouble={loaded.trouble} onRetry={retry} />
      ) : null}
      {loaded.state === 'ready' && cards.length === 0 ? (
        <Card className="your-apps__empty">
          <p className="body-lead">{w.empty}</p>
          <div>
            <Button kind="primary" {...linkTo('/new')}>
              {w.describe}
            </Button>
          </div>
          {/* The lead time, anchored to the invitation in a note of its own (Rich, sitting 5:
              as a caption it was "really small and kinda just... floating there"). */}
          <div className="your-apps__lead-time">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-muted)"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <p className="body-small">{w.leadTime}</p>
          </div>
        </Card>
      ) : null}
      {loaded.state === 'ready' ? (
        <>
          <NeedsBand needs={[...(keeping?.needs ?? []), ...loaded.goingLive]} />
          {keeping === null ? null : (
            <Since lastHere={keeping.since.lastHere} lines={keeping.since.lines} />
          )}
        </>
      ) : null}
      {cards.map((card) => (
        <AppCardView
          key={card.id}
          card={card}
          platform={platform}
          ours={ours}
          me={me}
          expire={expire}
        />
      ))}
    </>
  )
}

function AppCardView({
  card,
  platform,
  ours,
  me,
  expire,
}: {
  card: AppCard
  platform: Platform
  ours: Ours
  me: Schemas['Me']
  expire: () => void
}) {
  const w = words.yourApps
  return (
    <Card className="app-card">
      <div className="app-card__head">
        <h2 className="heading app-card__name">
          {/* Its own page arrives in a later plan; until then it says so (Rich, sitting 5). */}
          <a
            className="app-card__link"
            {...linkTo(`/apps/${encodeURIComponent(card.slug)}`)}
          >
            {card.name}
          </a>
        </h2>
        {card.audience === '' ? null : (
          <p className="body-small app-card__audience">{card.audience}</p>
        )}
      </div>
      {card.switchedOff === null ? null : (
        <SwitchedOff
          card={card}
          switchedOff={card.switchedOff}
          platform={platform}
          ours={ours}
          me={me}
          expire={expire}
        />
      )}
      <p className="app-card__students">
        <span className="label">{w.forStudents}</span>
        <StateChip state={card.students.state} label={card.students.words} />
      </p>
      <dl className="app-card__addresses">
        <AddressView label={w.draft} address={card.draft} />
        <AddressView label={w.tryingOut} address={card.tryingOut} />
      </dl>
      {card.beforeStudents ? (
        <div className="app-card__before">
          <p className="body-small">{w.beforeStudents}</p>
          <Button
            kind="secondary"
            size="sm"
            {...linkTo(`/apps/${encodeURIComponent(card.slug)}/going-live`)}
          >
            {w.goingLive}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function AddressView({ label, address }: { label: string; address: Address }) {
  return (
    <div className="app-card__address">
      <dt className="label">{label}</dt>
      <dd>
        {address.hostname === undefined ? null : (
          <span className="mono">
            <Hostname name={address.hostname} />
          </span>
        )}
        <StateChip state={address.fact.state} label={address.fact.words} />
      </dd>
    </div>
  )
}

/**
 * SWITCHED OFF, ON ITS CARD (moment 20; F6 Task 11): *"Switched off, 12 December"*, and for an owner
 * *[Switch it back on]*. Once back, the card says so in place of the date: an app that has been
 * live is not running yet, and *Start it for your students* is on its Overview.
 */
function SwitchedOff({
  card,
  switchedOff,
  platform,
  ours,
  me,
  expire,
}: {
  card: AppCard
  switchedOff: string
  platform: Platform
  ours: Ours
  me: Schemas['Me']
  expire: () => void
}) {
  const s = words.keeping.switching
  const role = useRole(platform, card.id, me)
  const [back, setBack] = useState(false)
  return (
    <div className="app-card__switched-off">
      {back ? null : <p className="body-small">{switchedOff}</p>}
      {role === 'owner' ? (
        <SwitchBackOn
          platform={platform}
          ours={ours}
          project={{ id: card.id, name: card.name, launchedAt: card.launchedAt }}
          onChanged={() => setBack(true)}
          expire={expire}
          launched={
            <>
              <p className="body-small" role="status">
                {s.back}
              </p>
              <Button
                kind="secondary"
                size="sm"
                {...linkTo(`/apps/${encodeURIComponent(card.slug)}`)}
              >
                {s.students}
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  )
}

/** A hostname that breaks, when it must, after a dot: never mid-label, as `mock-` did. */
/**
 * THE LIVE ADDRESS, LARGE (Rich, 2026-09-30): it may wrap only after `://` and before a dot, never
 * at the slug's hyphen. Each piece is kept whole (`address__piece`, `nowrap`), a `<wbr>` between
 * them; the text is the address exactly, so what is read or selected is what *[Copy]* copies.
 */
export function LiveAddress({ url }: { url: string }) {
  const at = url.indexOf('://')
  const scheme = at === -1 ? null : url.slice(0, at + 3)
  const host = at === -1 ? url : url.slice(at + 3)
  const labels = host.split('.')
  const kept = [
    ...(scheme === null ? [] : [scheme]),
    ...labels.map((label, i) => (i === 0 ? label : `.${label}`)),
  ]
  return (
    <>
      {kept.map((piece, i) => (
        <Fragment key={i}>
          {i === 0 ? null : <wbr />}
          <span className="address__piece">{piece}</span>
        </Fragment>
      ))}
    </>
  )
}

export function Hostname({ name }: { name: string }) {
  const labels = name.split('.')
  return (
    <>
      {labels.map((label, i) => (
        <Fragment key={i}>
          {label}
          {i < labels.length - 1 ? (
            <>
              .<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  )
}
