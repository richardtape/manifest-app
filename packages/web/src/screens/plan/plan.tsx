import type {
  Allowance,
  Conversation,
  Intake,
  PieceView,
  PlanRow,
  PlanView,
  StepKey,
} from '@manifest-app/server/progress'
import { Button, Card, FormField, LiveSteps, StateChip } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import { OurRefusal, ourReported, reportProblem, type Ours } from '../../ours/api.js'
import type { Step } from '../../ours/conversation.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf, reported } from '../../platform/refusal.js'
import { countProp, LIMITS, tooLong } from '../limits.js'
import { words } from '../../words.js'
import { monthResetsAt, whenWords } from '../describe/model.js'
import { Making } from '../making/making.js'
import { handOverToken } from '../making/token.js'
import { StartedBy, type Theirs } from '../change/together.js'
import { SupportReference } from '../reference.js'

const ROWS: PlanRow[] = ['studentsSee', 'youSee', 'itKeeps', 'whoGetsIn', 'ai']
/** An answer belongs to its question: its id and its words. */
const answerKey = (q: { id: string; ask: string }) => `${q.id}\n${q.ask}`
/** Our server has no token, or the platform refused it: a new one, once, without a word. */
const RENEW = new Set(['TOKEN_MISSING', 'TOKEN_REFUSED'])

/**
 * A problem shown, with its reference (Decision 11), and the one way on: `retry` is the very
 * thing that failed, never whatever the state suggests (the final review: a failed correction's
 * Carry on once agreed the uncorrected plan).
 */
type Problem = {
  words: string
  reference: string
  tone: 'attention' | 'waiting'
  button: 'carryOn' | 'tryAgain'
  retry: () => void
}
/** Or words alone, when nothing failed: another window corrected the plan (a deferred Minor). */
type Notice = Problem | { words: string; tone: 'attention' }
type Said = Omit<Problem, 'reference' | 'retry'>

const COULDNT_WRITE: Said = {
  words: words.plan.couldntWrite,
  tone: 'attention',
  button: 'carryOn',
}

/**
 * WHAT STOPPED THE PLAN BEING WRITTEN, IN WORDS: Rich's for a spent allowance (whose, and when
 * it resets, in their own time) and for what waits on an administrator; the walk-through's
 * for a plan that came back wrong. By code, never by message.
 */
export function planRefused(
  code: string,
  allowance: Allowance | undefined,
  now: Date,
  timeZone: string | undefined,
): Said {
  switch (code) {
    case 'MODEL_BUDGET_EXHAUSTED': {
      if (allowance === undefined) return COULDNT_WRITE
      // Before a first session there is no reset: the contract's rule, the first of the month.
      const resets =
        allowance.resetsAt === null ? monthResetsAt(now) : new Date(allowance.resetsAt)
      return {
        words: words.plan.allowanceUsed(
          `$${allowance.monthlyUsd.toFixed(2)}`,
          whenWords(resets, timeZone),
        ),
        tone: 'attention',
        button: 'carryOn',
      }
    }
    case 'MODEL_NOT_AVAILABLE':
    case 'MODEL_GATEWAY_REFUSED':
      return { words: words.plan.waitingOnAdmin, tone: 'waiting', button: 'carryOn' }
    case 'MODEL_ANSWER_INVALID':
      return { words: words.plan.didntComeOut, tone: 'attention', button: 'tryAgain' }
    // F5 Decision 14: the model's answer stopped coming, or went on too long.
    case 'MODEL_STALLED':
      return { words: words.stalled.quiet, tone: 'attention', button: 'tryAgain' }
    case 'MODEL_TOO_LONG':
      return { words: words.stalled.ceiling, tone: 'attention', button: 'tryAgain' }
    case 'MODEL_UNREACHABLE':
    case 'MODEL_KEY_REFUSED':
    case 'PLATFORM_UNAVAILABLE':
    case 'UNREACHABLE':
    case 'TOKEN_MISSING':
    case 'TOKEN_REFUSED':
      return COULDNT_WRITE
    default:
      return { words: words.refused.body, tone: 'attention', button: 'carryOn' }
  }
}

const COULDNT_SAVE: Said = {
  words: words.plan.couldntSave,
  tone: 'attention',
  button: 'tryAgain',
}
/** Not now, not taken: nothing was set aside yet (F4). */
const COULDNT_LEAVE: Said = {
  words: words.building.couldntPress,
  tone: 'attention',
  button: 'tryAgain',
}

/**
 * MOMENT 5 (F2 Task 9), and the seconds before it: Making it's three lines, then the plan
 * written ("Reading how apps like this are built", "Writing the plan"), read, corrected in a
 * sentence, and agreed.
 * - **Never a stuck working state** (Review Focus 5): working is a step at work on our server,
 *   or a press not yet answered. Anything else is Carry on.
 * - **Our server without a token** (a restart forgot it) is answered by minting another, once,
 *   and carrying on, without a word.
 * - **A change's plan (F4 Task 9)**: "Here's what we'd change", the parts it changes and no
 *   others, "Everything else stays as we agreed.", Yes, change it, and Not now, which sets it aside.
 */
export function PlanScreen({
  platform,
  ours,
  conversation,
  intake,
  plan,
  piece = null,
  steps,
  refusal,
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
   * F6b D3: not the reader's (another member's): the plan to read, nothing started, renewed or
   * agreed for it, and only an owner's Stop.
   */
  theirs?: Theirs
  plan: { version: number; plan: PlanView } | null
  /** F4: the piece of work; a change's plan shows only what changes. */
  piece?: PieceView | null
  steps: Step[]
  refusal: { code: string; reference: string; allowance?: Allowance } | undefined
  expire: () => void
  now: () => Date
  timeZone: string | undefined
}) {
  const id = conversation.id
  const state = conversation.state
  const projectId = conversation.projectId
  const name = intake.project?.name ?? conversation.title
  const change = piece?.kind === 'change'
  const [pressed, setPressed] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [correcting, setCorrecting] = useState(false)
  const [correction, setCorrection] = useState('')
  const renewed = useRef(false)
  /** The refusal already on the stream when this screen came: another moment's. */
  const before = useRef(refusal)
  const doneBefore = useRef(new Set<string>())

  // A press is over once a step begins, ends or halts: from then on, the steps say. A step
  // newly done is progress, so a token may be renewed again for a later failure (the final
  // review: once per failure, never once per page); a step done long ago is not.
  const stepsKey = steps.map((s) => `${s.step}:${s.state}`).join()
  useEffect(() => {
    setPressed(false)
    const done = new Set(steps.filter((s) => s.state === 'done').map((s) => s.step))
    if ([...done].some((key) => !doneBefore.current.has(key))) renewed.current = false
    doneBefore.current = done
  }, [stepsKey])

  const working = (key: StepKey) => steps.some((s) => s.step === key && s.state === 'now')
  const context: 'write' | 'agree' = state === 'plan-ready' ? 'agree' : 'write'

  /** Said, with its reference, and reported (Decision 11). */
  const show = (
    said: Said,
    problem: { code: string; operation: string; status?: number; requestId?: string },
    retry: () => void,
  ) => {
    setPressed(false)
    setNotice({ ...said, retry, reference: reportProblem(problem) })
  }

  /** What our server or the platform refused, outside the stream; `retry` does it again. */
  const failed = (
    error: unknown,
    operation: string,
    during: 'write' | 'agree' | 'leave',
    retry: () => void,
  ) => {
    let report: ReturnType<typeof reported>
    if (error instanceof OurRefusal) {
      if (error.status === 401) return expire()
      // Ours, relaying the platform's request id when it carried one (m124).
      report = ourReported(error)
    } else {
      const refusal = refusalOf(error)
      if (refusal.kind === 'signed-out') return expire()
      // The platform's request id rides the report (FE-30).
      report = reported(refusal)
    }
    const { code } = report
    // F6 Task 11: the app switched off (a new token refused): said in words, never a problem.
    if (code === 'PROJECT_ARCHIVED') {
      setPressed(false)
      return setNotice({ words: words.refused.archived(name), tone: 'attention' })
    }
    const said =
      during === 'agree'
        ? COULDNT_SAVE
        : during === 'leave'
          ? COULDNT_LEAVE
          : planRefused(code, undefined, now(), timeZone)
    show(said, { ...report, operation }, retry)
  }

  /** A new token for our server, then the same again: once. */
  const renewThen = async (
    call: () => Promise<void>,
    operation: string,
    during: 'write' | 'agree' | 'leave',
  ) => {
    renewed.current = true
    let step = 'mintToken'
    try {
      if (projectId === null) throw new OurRefusal('PROJECT_MISSING', null)
      await handOverToken(
        platform,
        ours,
        { id, title: conversation.title },
        projectId,
        change ? 'changing' : 'building',
      )
      step = operation
      await call()
    } catch (error) {
      failed(
        error,
        error instanceof OurRefusal && step === 'mintToken' ? 'handProject' : step,
        during,
        () => void send(operation, call, during),
      )
    }
  }

  /**
   * OTHER WORK FIRST (found on the real platform): the plan, asked while another piece of
   * work finishes on our server (one at a time), is asked again once nothing is at work,
   * without a word. Three times at most; then it is said.
   */
  const [whenFree, setWhenFree] = useState<(() => void) | undefined>()
  const busyTries = useRef(0)
  useEffect(() => {
    if (whenFree === undefined || steps.some((s) => s.state === 'now')) return
    setWhenFree(undefined)
    whenFree()
  }, [whenFree, stepsKey])

  /** A press: sent to our server, which answers on the stream. */
  const send = async (
    operation: string,
    call: () => Promise<void>,
    during: 'write' | 'agree' | 'leave',
  ) => {
    setNotice(undefined)
    setPressed(true)
    try {
      await call()
      busyTries.current = 0
    } catch (error) {
      if (error instanceof OurRefusal && RENEW.has(error.code) && !renewed.current)
        return renewThen(call, operation, during)
      // A WINDOW BEHIND (a deferred Minor, Rich's word): nothing failed and nothing was
      // saved. The stream brings the plan as it is now, and Yes agrees to that.
      if (error instanceof OurRefusal && error.code === 'PLAN_CHANGED') {
        setPressed(false)
        setNotice({ words: words.plan.changedElsewhere, tone: 'attention' })
        return
      }
      if (
        error instanceof OurRefusal &&
        error.code === 'CONVERSATION_BUSY' &&
        busyTries.current < 3
      ) {
        busyTries.current++
        setWhenFree(() => () => void send(operation, call, during))
        return
      }
      failed(error, operation, during, () => void send(operation, call, during))
    }
  }

  const writeIt = () => void send('plan', () => ours.plan(id), 'write')
  /**
   * Their answers to what THIS plan asks, and nothing else: a correction can change the
   * questions, and our server refuses an answer to one it never asked (the final review).
   */
  // Found on the real platform: a correction can ask a new question under an old id, so an
  // answer is kept by the question it was typed for, its id and its words together.
  const given = () =>
    Object.fromEntries(
      (plan?.plan.onlyYouKnow ?? [])
        .map((q) => [q.id, (answers[answerKey(q)] ?? '').trim()] as const)
        .filter(([, answer]) => answer !== ''),
    )
  /** Yes to the plan on screen, by its version: our server refuses a window behind. */
  const agreement = () => ({ version: plan?.version ?? 0, answers: given() })
  const agreeIt = () => {
    const agreed = agreement()
    void send('agree', () => ours.agree(id, agreed), 'agree')
  }
  /** Not now (F4): the change set aside. Nothing is working meanwhile, so nothing says it is. */
  const leave = () => {
    setNotice(undefined)
    ours.stop(id).catch((error: unknown) => failed(error, 'stop', 'leave', leave))
  }

  // A REFUSAL ON THE STREAM: a token renewed once, without a word; anything else said, with the
  // reference our server already recorded.
  useEffect(() => {
    // Another's: its own person's page answers what its work met (F6b D3).
    if (theirs !== null || refusal === undefined || refusal === before.current) return
    setPressed(false)
    if (RENEW.has(refusal.code) && !renewed.current) {
      const agreed = agreement()
      void renewThen(
        context === 'agree' ? () => ours.agree(id, agreed) : () => ours.plan(id),
        context === 'agree' ? 'agree' : 'plan',
        context,
      )
      return
    }
    const said =
      context === 'agree'
        ? COULDNT_SAVE
        : planRefused(refusal.code, refusal.allowance, now(), timeZone)
    // On the stream, what failed is the state's own work: agreeing, or writing (which carries
    // on a correction our server already holds).
    setNotice({
      ...said,
      reference: refusal.reference,
      retry: context === 'agree' ? agreeIt : writeIt,
    })
  }, [refusal])

  // Making it's replay done, or its stream never opened: on to the plan, once.
  const started = useRef(false)
  const start = () => {
    if (theirs !== null || started.current) return
    started.current = true
    writeIt()
  }

  const noticeCard =
    notice === undefined ? null : (
      <div role="alert">
        <Card tone={notice.tone}>
          <p className="body-lead">{notice.words}</p>
          {'retry' in notice ? (
            <>
              <SupportReference reference={notice.reference} />
              <div className="describe__actions">
                <Button kind="secondary" onClick={notice.retry}>
                  {words.describe[notice.button]}
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>
    )

  if (state === 'making' && intake.project !== null)
    return (
      <>
        <Making platform={platform} project={intake.project} onSettled={start} />
        {noticeCard}
      </>
    )

  if (state === 'planning' || plan === null) {
    const writing = pressed || working('reading') || working('writing')
    const stateOf = (key: StepKey) =>
      steps.find((s) => s.step === key)?.state ?? ('next' as const)
    return (
      <div className="plan-wait">
        <h1 className="page-title">{name}</h1>
        <StartedBy theirs={theirs} />
        {noticeCard}
        <LiveSteps
          steps={(['reading', 'writing'] as const).map((key) => ({
            text: words.steps[key],
            state: stateOf(key),
          }))}
        />
        {theirs !== null && theirs.mayStop && change ? (
          <div>
            <Button kind="secondary" onClick={leave}>
              {words.building.stop}
            </Button>
          </div>
        ) : null}
        {theirs === null && !writing && notice === undefined ? (
          <div>
            <Button kind="primary" onClick={writeIt}>
              {words.describe.carryOn}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const shown = plan.plan
  // A change shows only what changes: every part shown is changed, so none is marked.
  const rows = (
    <Card className="plan__rows">
      <dl className="plan__list">
        {(change ? ROWS.filter((row) => shown.changed.includes(row)) : ROWS).map(
          (row) => (
            <div className="plan__row" key={row}>
              <dt className="plan__label">
                <span>{words.plan.rows[row]}</span>{' '}
                {!change && shown.changed.includes(row) ? (
                  <span className="plan__changed">{words.plan.changed}</span>
                ) : null}
              </dt>
              <dd className="plan__text">{shown[row]}</dd>
            </div>
          ),
        )}
      </dl>
    </Card>
  )

  const saving = pressed || working('agreeing')
  return (
    <div className="plan">
      <div className="plan__main">
        <h1 className="page-title">{name}</h1>
        <StartedBy theirs={theirs} />
        <h2 className="moment">{change ? words.change.planTitle : words.plan.title}</h2>
        {theirs === null ? <p className="body-lead">{words.plan.lead}</p> : null}
        {noticeCard}
        {rows}
        {/* Said only when something is left as agreed: never about nothing. */}
        {change && shown.changed.length < ROWS.length ? (
          <p className="body-lead">{words.change.unchanged}</p>
        ) : null}
        {shown.assumed.length > 0 ? (
          <section className="plan__section">
            <h3 className="subheading">{words.plan.assumedTitle}</h3>
            <ul className="plan__assumed">
              {shown.assumed.map((assumed) => (
                <li key={assumed}>{assumed}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {theirs !== null && shown.onlyYouKnow.length > 0 ? (
          // Another's: what it asks them, to read; only they answer (F6b D3).
          <Card
            tone="waiting"
            title={words.together.onlyTheyKnow(shown.onlyYouKnow.length, theirs.name)}
          >
            <ul className="plan__assumed">
              {shown.onlyYouKnow.map((q) => (
                <li key={q.id}>{q.ask}</li>
              ))}
            </ul>
            <p className="body">{words.together.onlyThey(theirs.name)}</p>
          </Card>
        ) : null}
        {theirs === null && shown.onlyYouKnow.length > 0 ? (
          <Card tone="waiting" title={words.plan.onlyYouKnow(shown.onlyYouKnow.length)}>
            {shown.onlyYouKnow.map((q) => (
              <FormField
                key={q.id}
                id={`plan-answer-${q.id}`}
                label={q.ask}
                value={answers[answerKey(q)] ?? ''}
                onChange={(e) =>
                  setAnswers((current) => ({
                    ...current,
                    [answerKey(q)]: e.target.value,
                  }))
                }
                {...countProp(answers[answerKey(q)] ?? '')}
              />
            ))}
          </Card>
        ) : null}
      </div>
      {theirs !== null ? (
        // Only a change is set aside: the first plan has nothing to go back to (F4).
        theirs.mayStop && change ? (
          <div className="plan__aside">
            <div className="describe__actions">
              <Button kind="secondary" onClick={leave}>
                {words.building.stop}
              </Button>
            </div>
          </div>
        ) : null
      ) : (
        <Card className="plan__aside" title={words.plan.yesTitle}>
          <p className="body-lead">
            {change ? words.change.yesBody : words.plan.yesBody}
          </p>
          {saving ? (
            <StateChip state="working" label={words.steps.agreeing} />
          ) : (
            <div className="plan__actions">
              <Button
                kind="primary"
                disabled={Object.values(given()).some((a) => tooLong(a, LIMITS.sentence))}
                onClick={agreeIt}
              >
                {change ? words.change.yes : words.plan.yes}
              </Button>
              <Button kind="secondary" onClick={() => setCorrecting(true)}>
                {words.plan.notQuite}
              </Button>
              {change ? (
                <Button kind="tertiary" onClick={leave}>
                  {words.change.notNow}
                </Button>
              ) : null}
            </div>
          )}
          {correcting && !saving ? (
            <div className="plan__correction">
              <FormField
                id="plan-correction"
                label={words.plan.correctionLabel}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                {...countProp(correction)}
              />
              <div>
                <Button
                  kind="primary"
                  disabled={
                    correction.trim() === '' || tooLong(correction, LIMITS.sentence)
                  }
                  onClick={() =>
                    void send(
                      'correct',
                      async () => {
                        await ours.correct(id, correction.trim())
                        setCorrecting(false)
                        setCorrection('')
                      },
                      'write',
                    )
                  }
                >
                  {words.describe.carryOn}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  )
}
