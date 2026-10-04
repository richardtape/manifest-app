import type { Conversation, Intake, RoundView, Said } from '@manifest-app/server/progress'
import { Button, Card } from '@manifest-app/ui'
import { linkTo, navigate } from '../../router.js'
import { useEffect, useRef, useState } from 'react'
import { OurRefusal, ourReported, reportProblem, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf, reported } from '../../platform/refusal.js'
import { words } from '../../words.js'
import { handOverToken, mintRequest } from '../making/token.js'
import { leaveOutWords } from './detail.js'
import { kindWords } from './kind.js'
import { SupportReference } from '../reference.js'
import { StartedBy, type Theirs } from '../change/together.js'
import { PutOnTryingOut } from '../trying-out/put.js'
import type { Presses } from './needs.js'
import { Thread } from './thread.js'
import { Work } from './work.js'

/**
 * A press our server did not take, said: with its reference if something failed, and the same
 * press again. CONVERSATION_BUSY (just after a Stop whose call is still in flight) failed
 * nothing, so it has none.
 */
/** `retry` null: nothing to try again here (the app switched off: F6 Task 11). */
type Notice = { words: string; reference: string | null; retry: (() => void) | null }

/**
 * MOMENT 6, WATCHING IT GET BUILT (F3 Task 11), layout C: the conversation on the left, the
 * work on the right, which stays in view. Everything it draws is the state frame's (`round`,
 * `thread`); every press goes to our server, which answers on the stream.
 * - **A token our server no longer holds** (a restart forgot it, or the platform refused it)
 *   is minted in their session and handed over without a word, once, then the press is sent
 *   again (F2's handOverToken). A second refusal straight after is said.
 * - **The round starts by itself** (Decision 11): nothing here starts it.
 */
export function BuildingScreen({
  platform,
  ours,
  conversation,
  intake,
  round,
  thread,
  purpose = 'building',
  connecting,
  expire,
  now,
  timeZone,
  theirs = null,
}: {
  platform: Platform
  ours: Ours
  conversation: Conversation
  intake: Intake
  /**
   * F6b D3: not the reader's (another member's): read-only, nothing handed over for it, and only
   * an owner's Stop.
   */
  theirs?: Theirs
  /** Null for the moment between agree and the round's first frame. */
  round: RoundView | null
  thread: Said[]
  /** What a token minted here is named for: a change's says so (F4 Task 9). */
  purpose?: 'building' | 'changing'
  /** The page's stream is reopening: "Reconnecting…", quietly. */
  connecting: boolean
  expire: () => void
  now: () => Date
  timeZone: string | undefined
}) {
  const id = conversation.id
  const projectId = conversation.projectId
  const name = intake.project?.name ?? conversation.title
  const [notice, setNotice] = useState<Notice>()
  // F6b Decision 8: the kind of change, our server's to judge (null: begun before launch, or we
  // cannot tell; the review's I1); said as soon as a commit names a field, and at the round's end
  // whatever it changed; never once stopped, since a stopped change reaches nobody.
  const sensitive = round?.sensitive ?? null
  const kind =
    round === null || sensitive === null || round.status === 'stopped'
      ? null
      : round.status === 'done' || sensitive.length > 0
        ? kindWords(sensitive)
        : null

  const handOver = () =>
    projectId === null
      ? Promise.reject(new OurRefusal('PROJECT_MISSING', null))
      : handOverToken(
          platform,
          ours,
          { id, title: conversation.title },
          projectId,
          purpose,
        )

  /** Said, with a reference where something failed; a 401 is the session ending, as everywhere. */
  const failed = (
    error: unknown,
    operation: string,
    retry: () => void,
    couldnt: string = words.building.couldntPress,
  ) => {
    let report: ReturnType<typeof reported>
    if (error instanceof OurRefusal) {
      if (error.status === 401) return expire()
      if (error.code === 'CONVERSATION_BUSY')
        return setNotice({ words: words.building.busy, reference: null, retry })
      // Ours, relaying the platform's request id when it carried one (m124).
      report = ourReported(error)
    } else {
      const refusal = refusalOf(error)
      if (refusal.kind === 'signed-out') return expire()
      // The platform's request id rides the report (FE-30).
      report = reported(refusal)
    }
    const { code } = report
    // F6 Task 11: the app switched off (a new token refused): said in words, never a problem,
    // and nothing to try again until it is switched back on.
    if (code === 'PROJECT_ARCHIVED')
      return setNotice({
        words: words.refused.archived(name),
        reference: null,
        retry: null,
      })
    setNotice({
      words: couldnt,
      reference: reportProblem({ ...report, operation }),
      retry,
    })
  }

  /**
   * A press, sent; without a token held, one is handed over and the press sent again, once. Only
   * on their own conversation: a token is never minted for another's (minors m96: an owner's Stop
   * needs none today, and a page that did would hand its own person's token to someone else's).
   */
  const send = async (operation: string, call: () => Promise<void>) => {
    setNotice(undefined)
    const again = () => void send(operation, call)
    try {
      await call()
    } catch (error) {
      if (
        theirs !== null ||
        !(error instanceof OurRefusal && error.code === 'TOKEN_MISSING')
      )
        return failed(error, operation, again)
      let step = 'mintToken'
      try {
        await handOver()
        // m46's review: a token their press handed over counts as the renewal, so one refused
        // again before anything got done is said, never renewed again unasked.
        renewed.current = true
        step = operation
        await call()
      } catch (again_) {
        failed(
          again_,
          again_ instanceof OurRefusal && step === 'mintToken' ? 'handProject' : step,
          again,
        )
      }
    }
  }

  const stop = () => void send('stop', () => ours.stop(id))

  // F6b DECISION 10: [LEAVE IT OUT]. A new change on the app, seeded with our words and a token of
  // its own (F5's Talk it through), planned and agreed first; then the stuck one stopped, so the
  // new one has the app; then the new conversation. A press refused leaves the stuck one as it was.
  const [leaving, setLeaving] = useState(false)
  const leaveOut = async () => {
    const slug = intake.project?.slug
    const details = round?.needs?.kind === 'detail' ? round.needs.details : []
    if (projectId === null || slug === undefined) return
    const said = leaveOutWords(details, conversation.title)
    setNotice(undefined)
    setLeaving(true)
    let step = 'mintToken'
    try {
      const minted = await platform.mintToken(
        projectId,
        mintRequest(said, 'changing'),
        crypto.randomUUID(),
      )
      step = 'startChange'
      const made = await ours.startChange(projectId, {
        words: said,
        token: minted.secret,
        tokenId: minted.token.id,
      })
      // The new change exists: a Stop that fails leaves it waiting in line, which says so.
      await ours.stop(id).catch(() => undefined)
      navigate(
        `/apps/${encodeURIComponent(slug)}/conversations/${encodeURIComponent(made.id)}`,
      )
    } catch (error) {
      setLeaving(false)
      failed(error, step, () => void leaveOut(), words.building.detail.couldntLeaveOut)
    }
  }

  const presses: Presses =
    theirs === null
      ? {
          build: (way) =>
            void send('build', () =>
              way === undefined ? ours.build(id) : ours.build(id, way),
            ),
          stop,
          leaveOut: () => void leaveOut(),
          leaving,
        }
      : theirs.mayStop
        ? { stop }
        : {}

  // F6b DECISION 6: WHO STOPPED IT, when it says something its own person did not do.
  const stopped = round?.status === 'stopped' ? round.stopped : null
  const stoppedBy =
    stopped === null
      ? null
      : stopped.why === 'removed'
        ? { said: words.together.removed(stopped.by.name, name), removed: true }
        : stopped.by.id === conversation.personId
          ? null
          : { said: words.together.stoppedBy(stopped.by.name), removed: false }

  // NEEDS: TOKEN. The round dropped its token when the platform refused it: a new one, minted
  // and handed over without a word, then carried on. Refused again before anything got done,
  // it is said (the plan screen's rule: once per failure, never once per page).
  const renewed = useRef(false)
  const renewing = useRef(false)
  const renewAndCarryOn = async () => {
    renewing.current = true
    renewed.current = true
    setNotice(undefined)
    let step = 'mintToken'
    try {
      await handOver()
      step = 'build'
      await ours.build(id)
    } catch (error) {
      failed(
        error,
        error instanceof OurRefusal && step === 'mintToken' ? 'handProject' : step,
        () => void renewAndCarryOn(),
      )
    } finally {
      renewing.current = false
    }
  }
  const needsToken = round?.status === 'needs-you' && round.needs?.kind === 'token'
  // MINORS m46 (Rich, "Interrupted card"): renewed by itself only when this page watched the round
  // go there. One it opened on, already needing a token (refused while nobody watched, however
  // long ago), is drawn as interrupted, with nothing to report, and its Carry on hands one over
  // as every press does: a session is started only by a press.
  const [watched, setWatched] = useState(false)
  useEffect(() => {
    if (round !== null && !needsToken) setWatched(true)
  }, [round, needsToken])
  const arrived = theirs === null && needsToken && !watched
  useEffect(() => {
    // Another's: only its own person's page hands a token over (F6b D3).
    if (theirs !== null || !needsToken || !watched || renewing.current) return
    if (!renewed.current) return void renewAndCarryOn()
    setNotice({
      words: words.building.couldntPress,
      reference: reportProblem({ code: 'TOKEN_REFUSED', operation: 'build' }),
      retry: () => void renewAndCarryOn(),
    })
  }, [needsToken, round?.round, watched])

  // A step newly done is progress: a token may be renewed again for a later refusal.
  const done = (round?.steps ?? []).filter((s) => s.state === 'done').length
  const doneBefore = useRef(done)
  useEffect(() => {
    if (done > doneBefore.current) renewed.current = false
    doneBefore.current = done
  }, [done])

  const noticeCard =
    notice === undefined ? null : (
      <div role="alert">
        <Card
          tone={
            notice.reference === null && notice.retry !== null ? 'waiting' : 'attention'
          }
        >
          <p className="body-lead">{notice.words}</p>
          {notice.reference === null ? null : (
            <SupportReference reference={notice.reference} />
          )}
          {notice.retry === null ? null : (
            <div className="describe__actions">
              <Button kind="secondary" onClick={notice.retry}>
                {words.building.tryAgain}
              </Button>
            </div>
          )}
        </Card>
      </div>
    )

  // THE WORK'S END, ONCE BUILT (walk-through moment 9): try it, or put this version on trying-out.
  const slug = intake.project?.slug
  const end =
    round?.status !== 'done' || projectId === null || slug === undefined ? null : (
      <div className="building__end">
        <p className="body-lead">
          {kind === null ? words.tryingOut.ready : `${words.tryingOut.ready} ${kind}`}
        </p>
        <div className="describe__actions">
          <Button kind="primary" {...linkTo(`/apps/${encodeURIComponent(slug)}/preview`)}>
            {words.tryingOut.tryIt}
          </Button>
        </div>
        {theirs === null ? (
          <PutOnTryingOut
            platform={platform}
            ours={ours}
            project={{ id: projectId, slug, name: intake.project?.name ?? slug }}
            expire={expire}
            now={now}
            timeZone={timeZone}
          />
        ) : null}
      </div>
    )

  const state = conversation.state
  return (
    <div className="building">
      <h1 className="page-title">{name}</h1>
      <StartedBy theirs={theirs} />
      <div className="building__columns">
        <Work
          round={
            arrived
              ? { ...round!, status: 'interrupted', needs: null, forgotten: true }
              : round
          }
          connecting={connecting}
          notice={noticeCard}
          end={end}
          kind={round?.status === 'done' ? null : kind}
          presses={presses}
          stoppedBy={stoppedBy}
          whose={theirs?.name ?? null}
          now={now}
          timeZone={timeZone}
        />
        <Thread
          description={conversation.description}
          thread={thread}
          questions={round?.questions ?? []}
          talking={state === 'building' || state === 'paused'}
          built={state === 'built'}
          onAnswer={(questionId, said) =>
            void send('answer', () => ours.answer(id, questionId, said))
          }
          onMessage={(said) => void send('message', () => ours.message(id, said))}
          theirs={theirs?.name ?? null}
          timeZone={timeZone}
        />
      </div>
    </div>
  )
}
