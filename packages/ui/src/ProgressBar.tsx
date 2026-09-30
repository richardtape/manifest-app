export interface ProgressBarProps {
  /** `clock` is the hatched, unstarted, never-animated bar for a wait measured in days. */
  kind?: 'working' | 'done' | 'clock'
  /** 0–100. Ignored by `clock`, which is never partly full. */
  value?: number
  label?: string | undefined
  meta?: string | undefined
  className?: string | undefined
}

/**
 * THREE BARS, AND THE DIFFERENCE BETWEEN THEM IS THE WHOLE WAITING VOCABULARY
 * (ProgressBar/README.md): drifting while a machine moves, solid when it is done, and the
 * hatched clock a person holds, which never moves. No percentage beside any of them.
 * Ported from the reference (F5 Task 4); parity.test.tsx holds its markup.
 */
export function ProgressBar(props: ProgressBarProps) {
  const kind = props.kind || 'working'
  if (kind === 'clock')
    return (
      <div className={props.className}>
        <div className="mf-clock" />
        <div className="mf-bar__meta" style={{ color: 'var(--waiting)' }}>
          <span>{props.label || 'Nothing counting yet'}</span>
          <span style={{ fontWeight: 600 }}>{props.meta || 'Takes weeks'}</span>
        </div>
      </div>
    )
  const pct = Math.max(0, Math.min(100, props.value === undefined ? 100 : props.value))
  return (
    <div className={props.className}>
      <div
        className="mf-bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={props.label}
      >
        <div
          className={'mf-bar__fill mf-bar__fill--' + kind}
          style={{ width: pct + '%' }}
        />
      </div>
      {props.label || props.meta ? (
        <div className="mf-bar__meta">
          <span
            style={{
              fontWeight: 600,
              color: kind === 'done' ? 'var(--steady)' : 'var(--working-deep)',
            }}
          >
            {props.label}
          </span>
          <span style={{ color: 'var(--ink-subtle)' }}>{props.meta}</span>
        </div>
      ) : null}
    </div>
  )
}
