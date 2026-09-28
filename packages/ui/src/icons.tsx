/**
 * THE BUNDLE'S ICON PATHS, AS DATA, copied from reference/bundle.js (`TICK`, `NAV_ICONS`)
 * and SideNav's house mark. 24×24 viewBox, stroked, never filled.
 */
export const TICK: readonly string[] = ['M5 13l4 4L19 7']

export const NAV_ICONS: Readonly<Record<string, readonly string[]>> = {
  apps: [
    'M4 4.5h6.5V11H4z',
    'M13.5 4.5H20V11h-6.5z',
    'M4 13.5h6.5V20H4z',
    'M13.5 13.5H20V20h-6.5z',
  ],
  overview: ['M12 4l8 4.5-8 4.5-8-4.5z', 'M4 14l8 4.5 8-4.5'],
  preview: ['M3.5 5.5h17v10.5h-17z', 'M9 20h6', 'M12 16v4'],
  talk: ['M4.5 5.5h15v9.5h-9l-6 4.5z'],
  live: ['M6.5 20.5V4', 'M6.5 4.5h11l-2 3.5 2 3.5h-11'],
  people: [
    'M4 20a5 5 0 0 1 9.5 0',
    'M8.75 11.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2',
    'M16.5 20a5 5 0 0 0-2.6-4.4',
  ],
  agent: ['M13.5 3.5L6 14h5.5l-1 6.5L18 10h-5.5z'],
  plus: ['M12 5.5v13', 'M5.5 12h13'],
}

/**
 * ONE PERSON: ours, not the bundle's (its `people` is two). The rail's link to a person's
 * profile (Rich's click-through, F1 sitting 5).
 */
export const PERSON: readonly string[] = [
  'M5 20a7 7 0 0 1 14 0',
  'M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5',
]

/** The house in the rail's mark. */
export const MARK: readonly string[] = ['M4 19V9.5L12 4l8 5.5V19', 'M9.5 19v-6h5v6']

/** A rail item's icon, as `navItem` draws it; an unknown name draws `overview`. */
export function NavIcon({
  name,
  paths: given,
}: {
  name?: string
  paths?: readonly string[]
}) {
  const paths =
    given ?? (name === undefined ? undefined : NAV_ICONS[name]) ?? NAV_ICONS['overview']!
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
