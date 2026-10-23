import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { AppearanceControl } from './AppearanceControl';
import { useProfileIdentity } from '../features/profile/useProfileIdentity';
import { cn } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inbox', label: 'Inbox' },
  { to: '/analytics', label: 'Analytics' },
] as const;

// macOS draws the native traffic lights over the top bar, so there the bar becomes a sticky, draggable toolbar
// of the platform's fixed height: a spacer stands in for the controls and the nav moves to the middle column.
// Interactive children opt back out of dragging. `html[data-platform=darwin]` is set in main.tsx.
const BAR =
  'grid grid-cols-[1fr_auto_1fr] items-center gap-6 bg-transparent px-8 py-4 ' +
  '[html[data-platform=darwin]_&]:sticky [html[data-platform=darwin]_&]:top-0 [html[data-platform=darwin]_&]:z-[1] ' +
  '[html[data-platform=darwin]_&]:box-border [html[data-platform=darwin]_&]:h-(--app-toolbar-height) ' +
  '[html[data-platform=darwin]_&]:min-h-(--app-toolbar-height) [html[data-platform=darwin]_&]:gap-4 ' +
  '[html[data-platform=darwin]_&]:px-6 [html[data-platform=darwin]_&]:py-1.5 [html[data-platform=darwin]_&]:bg-ground ' +
  '[html[data-platform=darwin]_&]:[-webkit-app-region:drag] [html[data-platform=darwin]_&]:[app-region:drag] ' +
  '[html[data-platform=darwin]_&]:select-none ' +
  "[html[data-platform=darwin]_&]:before:col-start-1 [html[data-platform=darwin]_&]:before:row-start-1 [html[data-platform=darwin]_&]:before:h-8 [html[data-platform=darwin]_&]:before:w-20 [html[data-platform=darwin]_&]:before:content-['']";
const NO_DRAG =
  '[html[data-platform=darwin]_&]:[-webkit-app-region:no-drag] [html[data-platform=darwin]_&]:[app-region:no-drag]';
const PILL_NAV = cn(
  'flex justify-self-center gap-0.5 rounded-full border border-line bg-bg p-1 [html[data-platform=darwin]_&]:col-start-2 [html[data-platform=darwin]_&]:row-start-1',
  NO_DRAG,
);
const PILL =
  'relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-[18px] text-[14.5px] font-medium hover:bg-hover ' +
  'aria-[current=page]:bg-pri aria-[current=page]:text-on-pri! ' +
  '[html[data-platform=darwin]_&]:min-h-8 [html[data-platform=darwin]_&]:px-3.5 [html[data-platform=darwin]_&]:text-[13px] ' +
  NO_DRAG;
const RIGHT =
  'flex items-center justify-self-end gap-2 [html[data-platform=darwin]_&]:col-start-3 [html[data-platform=darwin]_&]:row-start-1';
// Keep the compact keyboard and icon controls explicitly colored and sized.
const GHOST_BTN =
  'flex min-h-[34px] items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-transparent bg-transparent px-3.5 ' +
  'text-[12px]! font-mono! text-ink-2! [html[data-platform=darwin]_&]:h-8 [html[data-platform=darwin]_&]:min-h-8 ' +
  NO_DRAG;
const ICON_BTN =
  'flex min-h-11 w-10 min-w-10 items-center justify-center gap-2 whitespace-nowrap rounded-full [&_svg]:size-[18px] border-[1.5px] border-transparent bg-transparent p-0 text-ink-2! ' +
  '[html[data-platform=darwin]_&]:h-8 [html[data-platform=darwin]_&]:min-h-8 [html[data-platform=darwin]_&]:w-8 ' +
  NO_DRAG;
const AVATAR =
  'grid size-[38px] place-items-center rounded-full bg-ink text-[14px] font-semibold text-ground! ' +
  '[html[data-platform=darwin]_&]:size-8 [html[data-platform=darwin]_&]:text-[12px] ' +
  NO_DRAG;

const GearIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
);

/** The V17 top bar: logo, pill nav (Dashboard · Inbox · Analytics), ⌘K, settings, account. */
export function TopBar({ onAsk, onSettings }: { onAsk?: () => void; onSettings?: () => void }) {
  const identity = useProfileIdentity();
  return (
    <header className={BAR}>
      {window.jobpilot?.platform !== 'darwin' && <Logo />}
      <nav className={PILL_NAV} aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item} className={PILL}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={RIGHT}>
        <button className={GHOST_BTN} type="button" onClick={onAsk}>
          ⌘K Ask Cap
        </button>
        <AppearanceControl />
        <button className={ICON_BTN} type="button" aria-label="Settings" title="Settings (,)" onClick={onSettings}>
          <GearIcon />
        </button>
        <NavLink
          className={AVATAR}
          to="/profile"
          aria-label="About me — profile and documents"
          title="Your profile & documents"
        >
          {identity.initials}
        </NavLink>
      </div>
    </header>
  );
}
