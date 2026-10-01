import { MARK } from '@manifest-app/ui'

/** The mark, *Manifest* and *UBC*: the head of the two screens with no rail (sign-in, not open). */
export function Brand() {
  return (
    <div className="signin__mark">
      <span className="signin__sq">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {MARK.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </span>
      <span className="signin__name">Manifest</span>
      <span className="signin__bar" />
      <span className="signin__org">UBC</span>
    </div>
  )
}
