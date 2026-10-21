import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inbox', label: 'Inbox', badge: 3 },
  { to: '/analytics', label: 'Analytics' },
] as const;

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
  return (
    <header className="top">
      <Logo />
      <nav className="pillnav" aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={'end' in item} className="pn">
            {item.label}
            {'badge' in item && <b title={`${item.badge} need you`}>{item.badge}</b>}
          </NavLink>
        ))}
      </nav>
      <div className="right">
        <button
          className="btn ghost sm"
          type="button"
          style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          onClick={onAsk}
        >
          ⌘K Ask Cap
        </button>
        <button className="btn ghost ic" type="button" aria-label="Settings" title="Settings (,)" onClick={onSettings}>
          <GearIcon />
        </button>
        <button className="avatar" type="button" aria-label="Account menu">
          AM
        </button>
      </div>
    </header>
  );
}
