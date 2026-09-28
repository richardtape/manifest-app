export type FactTone = 'steady' | 'attention' | 'working' | 'neutral'

export interface Fact {
  overline: string
  title: string
  note?: string
  tone?: FactTone
}

export interface TwoFactsProps {
  /** What people currently get. Always the left cell. */
  serving: Fact
  /** What the last attempt did. Takes the tint its outcome earns. */
  attempt: Fact
  /** Pass null to drop the footnote. Keeping it is strongly preferred. */
  foot?: string | null
  className?: string
}

const TONE: Record<string, { bg: string; bd: string; fg: string; note: string }> = {
  steady: {
    bg: 'var(--steady-tint)',
    bd: 'var(--steady-border)',
    fg: 'var(--steady)',
    note: 'var(--steady-muted)',
  },
  attention: {
    bg: 'var(--attention-tint)',
    bd: 'var(--attention-border)',
    fg: 'var(--attention)',
    note: 'var(--attention-muted)',
  },
  working: {
    bg: 'var(--working-tint)',
    bd: 'var(--working-border)',
    fg: 'var(--working-deep)',
    note: 'var(--working-deep)',
  },
  neutral: {
    bg: 'var(--surface-sunken)',
    bd: 'var(--border-subtle)',
    fg: 'var(--ink-subtle)',
    note: 'var(--ink-muted)',
  },
}

function FactCell({ fact, fallback }: { fact: Partial<Fact>; fallback: FactTone }) {
  const t = TONE[fact.tone || fallback] || TONE['neutral']!
  return (
    <div className="mf-fact" style={{ background: t.bg, border: '1px solid ' + t.bd }}>
      <span className="mf-overline" style={{ color: t.fg }}>
        {fact.overline}
      </span>
      <span className="mf-fact__title">{fact.title}</span>
      {fact.note ? (
        <span className="mf-fact__note" style={{ color: t.note }}>
          {fact.note}
        </span>
      ) : null}
    </div>
  )
}

/**
 * WHAT IS SERVING, AND WHAT THE LAST ATTEMPT DID: two facts, never one (TwoFacts/README.md).
 * The left cell is always what people get. Ported from the reference (F3 Task 10);
 * parity.test.tsx holds its markup.
 */
export function TwoFacts(props: TwoFactsProps) {
  return (
    <div className={props.className}>
      <div className="mf-facts">
        <FactCell fact={props.serving || {}} fallback="steady" />
        <FactCell fact={props.attempt || {}} fallback="neutral" />
      </div>
      {props.foot === null ? null : (
        <p className="mf-facts__foot">
          {props.foot ||
            'Two facts, not one. The older version keeps answering until a new one proves it can.'}
        </p>
      )}
    </div>
  )
}
