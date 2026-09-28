import type { CSSProperties } from 'react'
import { cx } from './cx.js'
import { MARK, NavIcon } from './icons.js'

export interface NavItem {
  label: string
  href?: string
  /** One of: apps, overview, preview, talk, live, people, agent, plus. */
  icon?: string
}

export interface SideNavProps {
  /** The `label` of the item you are on. Matching is by label, so labels are unique. */
  active?: string
  name?: string
  org?: string
  homeLabel?: string
  homeHref?: string
  /** Pass null to drop the create action. */
  newLabel?: string | null
  newHref?: string
  /** The open project's name, shown as an overline above its section. */
  projectName?: string
  /** The project's sections. Six at most. */
  items?: NavItem[]
  user?: string
  signOutHref?: string
  className?: string
  style?: CSSProperties
}

/** The bundle's `navItem`: the active item is a fill, a weight and `aria-current`. */
function RailItem({ item, active }: { item: NavItem; active: string | undefined }) {
  const on = item.label === active
  return (
    <a
      href={item.href || '#'}
      className={cx('mf-rail__item', on && 'mf-rail__item--on')}
      aria-current={on ? 'page' : undefined}
    >
      <NavIcon name={item.icon} />
      {item.label}
    </a>
  )
}

/** The product's whole navigation, on every signed-in screen. */
export function SideNav(props: SideNavProps) {
  const items = props.items || []
  return (
    <nav
      className={cx('mf-rail', props.className)}
      aria-label={props.name || 'Manifest'}
      style={props.style}
    >
      <a className="mf-rail__mark" href={props.homeHref || '#'}>
        <span className="mf-rail__sq">
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--nav-surface)"
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={MARK[0]} />
            <path d={MARK[1]} />
          </svg>
        </span>
        <span className="mf-rail__name">{props.name || 'Manifest'}</span>
        <span className="mf-rail__bar" />
        <span className="mf-rail__org">{props.org || 'UBC'}</span>
      </a>
      <RailItem
        key="home"
        item={{
          label: props.homeLabel || 'Your apps',
          href: props.homeHref || '#',
          icon: 'apps',
        }}
        active={props.active}
      />
      {props.newLabel === null ? null : (
        <RailItem
          key="new"
          item={{
            label: props.newLabel || 'Start something new',
            href: props.newHref || '#',
            icon: 'plus',
          }}
          active={props.active}
        />
      )}
      {items.length ? <div className="mf-rail__rule" /> : null}
      {items.length && props.projectName ? (
        <span className="mf-rail__over">{props.projectName}</span>
      ) : null}
      {items.map((item, i) => (
        <RailItem key={i} item={item} active={props.active} />
      ))}
      <div style={{ flexGrow: 1 }} />
      {props.user ? (
        <div className="mf-rail__foot">
          <span className="mf-rail__who">{props.user}</span>
          <a className="mf-rail__out" href={props.signOutHref || '#'}>
            Sign out
          </a>
        </div>
      ) : null}
    </nav>
  )
}
