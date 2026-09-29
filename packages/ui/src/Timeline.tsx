import { cx } from './cx.js'

export interface Station {
  label: string
  /** What the station means in a person's terms: "It replied to us, so it will reply to people". */
  note?: string
  /** `done` is passed, `now` pulses, `next` is ahead, `halted` is where a run ended badly. */
  state?: 'done' | 'now' | 'next' | 'halted'
}

export interface TimelineProps {
  stations: Station[]
  className?: string
}

/**
 * A SHORT, BOUNDED JOURNEY WITH A KNOWN END (Timeline/README.md): a deploy's stations, ticking
 * on events, never a timer. An `<ol>`; the current station is `aria-current="step"`, and only
 * it pulses. A run that ended badly stops at its halted station, with no rail after it. Its
 * markup is the reference's, byte for byte (parity.test.tsx).
 */
export function Timeline(props: TimelineProps) {
  const stations = props.stations || []
  const last = stations.length - 1
  return (
    <ol
      className={cx('mf-timeline', props.className)}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {stations.map((s, i) => {
        const state = s.state || 'next'
        const before =
          i === 0
            ? 'none'
            : state === 'done' || state === 'now' || state === 'halted'
              ? 'on'
              : 'off'
        const after =
          i === last || state === 'halted' ? 'none' : state === 'done' ? 'on' : 'off'
        return (
          <li
            key={i}
            className={cx('mf-station', 'mf-station--' + state)}
            aria-current={state === 'now' ? 'step' : undefined}
          >
            <span className="mf-station__rail">
              <span className={'mf-station__line mf-station__line--' + before} />
              <span
                className={cx(
                  'mf-station__dot',
                  'mf-station__dot--' + state,
                  state === 'now' && 'mf-pulse',
                )}
              />
              <span className={'mf-station__line mf-station__line--' + after} />
            </span>
            <span className="mf-station__label">{s.label}</span>
            {s.note ? <span className="mf-station__note">{s.note}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}
