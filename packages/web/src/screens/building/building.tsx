import type { Conversation, Intake, RoundView, Said } from '@manifest-app/server/progress'
import { Button, Card } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import { OurRefusal, reportProblem, type Ours } from '../../ours/api.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'
import { handOverToken } from '../making/token.js'
import { SupportReference } from '../reference.js'
import type { Presses } from './needs.js'
import { Thread } from './thread.js'
import { Work } from './work.js'

/**
 * A press our server did not take, said: with its reference if something failed, and the same
 * press again. CONVERSATION_BUSY (just after a Stop whose call is still in flight) failed
 * nothing, so it has none.
 */
type Notice = { words: string; reference: string | null; retry: () => void }

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
  connecting,
  expire,
  now,
  timeZone,
}: {
  platform: Platform
  ours: Ours
  conversation: Conversation
  intake: Intake
  /** Null for the moment between agree and the round's first frame. */
  round: RoundView | null
  thread: Said[]
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

  const handOver = () =>
    projectId === null
      ? Promise.reject(new OurRefusal('PROJECT_MISSING', null))
      : handOverToken(platform, ours, { id, title: conversation.title }, projectId)

  /** Said, with a reference where something failed; a 401 is the session ending, as everywhere. */
  const failed = (error: unknown, operation: string, retry: () => void) => {
    let code: string
    let status: number | null
    if (error instanceof OurRefusal) {
      if (error.status === 401) return expire()
      if (error.code === 'CONVERSATION_BUSY')
        return setNotice({ words: words.building.busy, reference: null, retry })
      code = error.code
      status = error.status
    } else {
      const refusal = refusalOf(error)
      if (refusal.kind === 'signed-out') return expire()
      code = refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE'
      status = refusal.kind === 'refused' ? refusal.status : null
    }
    setNotice({
      words: words.building.couldntPress,
      reference: reportProblem(
        status === null ? { code, operation } : { code, operation, status },
      ),
      retry,
    })
  }

  /** A press, sent; without a token held, one is handed over and the press sent again, once. */
  const send = async (operation: string, call: () => Promise<void>) => {
    setNotice(undefined)
    const again = () => void send(operation, call)
    try {
      await call()
    } catch (error) {
      if (!(error instanceof OurRefusal && error.code === 'TOKEN_MISSING'))
        return failed(error, operation, again)
      let step = 'mintToken'
      try {
        await handOver()
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

  const presses: Presses = {
    build: (way) =>
      void send('build', () =>
        way === undefined ? ours.build(id) : ours.build(id, way),
      ),
    stop: () => void send('stop', () => ours.stop(id)),
  }

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
  useEffect(() => {
    if (!needsToken || renewing.current) return
    if (!renewed.current) return void renewAndCarryOn()
    setNotice({
      words: words.building.couldntPress,
      reference: reportProblem({ code: 'TOKEN_REFUSED', operation: 'build' }),
      retry: () => void renewAndCarryOn(),
    })
  }, [needsToken, round?.round])

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
        <Card tone={notice.reference === null ? 'waiting' : 'attention'}>
          <p className="body-lead">{notice.words}</p>
          {notice.reference === null ? null : (
            <SupportReference reference={notice.reference} />
          )}
          <div className="describe__actions">
            <Button kind="secondary" onClick={notice.retry}>
              {words.building.tryAgain}
            </Button>
          </div>
        </Card>
      </div>
    )

  const state = conversation.state
  return (
    <div className="building">
      <h1 className="page-title">{name}</h1>
      <div className="building__columns">
        <Work
          round={round}
          connecting={connecting}
          notice={noticeCard}
          presses={presses}
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
          timeZone={timeZone}
        />
      </div>
    </div>
  )
}
