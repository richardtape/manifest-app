import type {
  Allowance,
  Conversation,
  Intake,
  PlanRow,
  PlanView,
  StepKey,
} from '@manifest-app/server/progress'
import { Button, Card, FormField, LiveSteps, StateChip } from '@manifest-app/ui'
import { useEffect, useRef, useState } from 'react'
import { OurRefusal, reportProblem, type Ours } from '../../ours/api.js'
import type { Step } from '../../ours/conversation.js'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'
import { monthResetsAt, whenWords } from '../describe/model.js'
import { Making } from '../making/making.js'
import { handOverToken } from '../making/token.js'
import { SupportReference } from '../reference.js'

const ROWS: PlanRow[] = ['studentsSee', 'youSee', 'itKeeps', 'whoGetsIn', 'ai']
/** Our server has no token, or the platform refused it: a new one, once, without a word. */
const RENEW = new Set(['TOKEN_MISSING', 'TOKEN_REFUSED'])

/** A problem shown, with its reference (Decision 11), and the one way on. */
type Notice = {
  words: string
  reference: string
  tone: 'attention' | 'waiting'
  button: 'carryOn' | 'tryAgain'
}
type Said = Omit<Notice, 'reference'>

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

/**
 * MOMENT 5 (F2 Task 9), and the seconds before it: Making it's three lines, then the plan
 * written ("Reading how apps like this are built", "Writing the plan"), read, corrected in a
 * sentence, and agreed.
 * - **Never a stuck working state** (Review Focus 5): working is a step at work on our server,
 *   or a press not yet answered. Anything else is Carry on.
 * - **Our server without a token** (a restart forgot it) is answered by minting another, once,
 *   and carrying on, without a word.
 */
export function PlanScreen({
  platform,
  ours,
  conversation,
  intake,
  plan,
  steps,
  refusal,
  expire,
  now,
  timeZone,
}: {
  platform: Platform
  ours: Ours
  conversation: Conversation
  intake: Intake
  plan: { version: number; plan: PlanView } | null
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
  const [pressed, setPressed] = useState(false)
  const [notice, setNotice] = useState<Notice>()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [correcting, setCorrecting] = useState(false)
  const [correction, setCorrection] = useState('')
  const renewed = useRef(false)
  /** The refusal already on the stream when this screen came: another moment's. */
  const before = useRef(refusal)

  // A press is over once a step begins, ends or halts: from then on, the steps say.
  const stepsKey = steps.map((s) => `${s.step}:${s.state}`).join()
  useEffect(() => setPressed(false), [stepsKey])

  const working = (key: StepKey) => steps.some((s) => s.step === key && s.state === 'now')
  const context: 'write' | 'agree' = state === 'plan-ready' ? 'agree' : 'write'

  /** Said, with its reference, and reported (Decision 11). */
  const show = (
    said: Said,
    problem: { code: string; operation: string; status: number | null },
  ) => {
    setPressed(false)
    const { status, ...rest } = problem
    setNotice({
      ...said,
      reference: reportProblem(status === null ? rest : { ...rest, status }),
    })
  }

  /** What our server or the platform refused, outside the stream. */
  const failed = (error: unknown, operation: string, during: 'write' | 'agree') => {
    let code: string
    let status: number | null
    if (error instanceof OurRefusal) {
      if (error.status === 401) return expire()
      code = error.code
      status = error.status
    } else {
      const refusal = refusalOf(error)
      if (refusal.kind === 'signed-out') return expire()
      code = refusal.kind === 'refused' ? refusal.code : 'UNREACHABLE'
      status = refusal.kind === 'refused' ? refusal.status : null
    }
    const said =
      during === 'agree' ? COULDNT_SAVE : planRefused(code, undefined, now(), timeZone)
    show(said, { code, operation, status })
  }

  /** A new token for our server, then the same again: once. */
  const renewThen = async (
    send: () => Promise<void>,
    operation: string,
    during: 'write' | 'agree',
  ) => {
    renewed.current = true
    let step = 'mintToken'
    try {
      if (projectId === null) throw new OurRefusal('PROJECT_MISSING', null)
      await handOverToken(platform, ours, { id, title: conversation.title }, projectId)
      step = operation
      await send()
    } catch (error) {
      failed(
        error,
        error instanceof OurRefusal && step === 'mintToken' ? 'handProject' : step,
        during,
      )
    }
  }

  /** A press: sent to our server, which answers on the stream. */
  const send = async (
    operation: string,
    call: () => Promise<void>,
    during: 'write' | 'agree',
  ) => {
    setNotice(undefined)
    setPressed(true)
    try {
      await call()
    } catch (error) {
      if (error instanceof OurRefusal && RENEW.has(error.code) && !renewed.current)
        return renewThen(call, operation, during)
      failed(error, operation, during)
    }
  }

  const writeIt = () => void send('plan', () => ours.plan(id), 'write')
  const agreeIt = () => {
    const given = Object.fromEntries(
      Object.entries(answers)
        .map(([question, answer]) => [question, answer.trim()] as const)
        .filter(([, answer]) => answer !== ''),
    )
    void send('agree', () => ours.agree(id, given), 'agree')
  }

  // A REFUSAL ON THE STREAM: a token renewed once, without a word; anything else said, with the
  // reference our server already recorded.
  useEffect(() => {
    if (refusal === undefined || refusal === before.current) return
    setPressed(false)
    if (RENEW.has(refusal.code) && !renewed.current) {
      void renewThen(
        context === 'agree' ? () => ours.agree(id, answers) : () => ours.plan(id),
        context === 'agree' ? 'agree' : 'plan',
        context,
      )
      return
    }
    const said =
      context === 'agree'
        ? COULDNT_SAVE
        : planRefused(refusal.code, refusal.allowance, now(), timeZone)
    setNotice({ ...said, reference: refusal.reference })
  }, [refusal])

  // Making it's replay done, or its stream never opened: on to the plan, once.
  const started = useRef(false)
  const start = () => {
    if (started.current) return
    started.current = true
    writeIt()
  }

  const noticeCard =
    notice === undefined ? null : (
      <div role="alert">
        <Card tone={notice.tone}>
          <p className="body-lead">{notice.words}</p>
          <SupportReference reference={notice.reference} />
          <div className="describe__actions">
            <Button kind="secondary" onClick={context === 'agree' ? agreeIt : writeIt}>
              {words.describe[notice.button]}
            </Button>
          </div>
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
        {noticeCard}
        <LiveSteps
          steps={(['reading', 'writing'] as const).map((key) => ({
            text: words.steps[key],
            state: stateOf(key),
          }))}
        />
        {!writing && notice === undefined ? (
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
  const rows = (
    <Card className="plan__rows">
      <dl className="plan__list">
        {ROWS.map((row) => (
          <div className="plan__row" key={row}>
            <dt className="plan__label">
              <span>{words.plan.rows[row]}</span>{' '}
              {shown.changed.includes(row) ? (
                <span className="plan__changed">{words.plan.changed}</span>
              ) : null}
            </dt>
            <dd className="plan__text">{shown[row]}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )

  if (state === 'agreed')
    return (
      <div className="plan-wait">
        <h1 className="page-title">{name}</h1>
        <p className="body-lead" role="status">
          {words.plan.agreed}
        </p>
        {rows}
      </div>
    )

  const saving = pressed || working('agreeing')
  return (
    <div className="plan">
      <div className="plan__main">
        <h1 className="page-title">{name}</h1>
        <h2 className="moment">{words.plan.title}</h2>
        <p className="body-lead">{words.plan.lead}</p>
        {noticeCard}
        {rows}
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
        {shown.onlyYouKnow.length > 0 ? (
          <Card tone="waiting" title={words.plan.onlyYouKnow(shown.onlyYouKnow.length)}>
            {shown.onlyYouKnow.map((q) => (
              <FormField
                key={q.id}
                id={`plan-answer-${q.id}`}
                label={q.ask}
                value={answers[q.id] ?? ''}
                onChange={(e) =>
                  setAnswers((current) => ({ ...current, [q.id]: e.target.value }))
                }
              />
            ))}
          </Card>
        ) : null}
      </div>
      <Card className="plan__aside" title={words.plan.yesTitle}>
        <p className="body-lead">{words.plan.yesBody}</p>
        {saving ? (
          <StateChip state="working" label={words.steps.agreeing} />
        ) : (
          <div className="plan__actions">
            <Button kind="primary" onClick={agreeIt}>
              {words.plan.yes}
            </Button>
            <Button kind="secondary" onClick={() => setCorrecting(true)}>
              {words.plan.notQuite}
            </Button>
          </div>
        )}
        {correcting && !saving ? (
          <div className="plan__correction">
            <FormField
              id="plan-correction"
              label={words.plan.correctionLabel}
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
            />
            <div>
              <Button
                kind="primary"
                disabled={correction.trim() === ''}
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
    </div>
  )
}
