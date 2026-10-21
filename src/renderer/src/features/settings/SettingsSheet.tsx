import { useState, type ReactNode } from 'react';
import { SegmentedChoice, type SegmentOption } from '../../components/SegmentedChoice';
import { SwitchToggle } from '../../components/SwitchToggle';
import { KbdKey } from '../../components/KbdKey';
import { useTheme } from '../../lib/theme';
import type { ThemeSource } from '../../../../shared/ipc';
import '../../styles/v17-surfaces.css';
import { CrewSlider } from './CrewSlider';
import { DEFAULT_SETTINGS, SITES, SITE_LOGINS, SUBMIT_MODES } from './data';
import { LimitField } from './LimitField';
import { LIMIT_SPECS, autopilotStatus, type Limits, type SiteMode } from './model';

const SITE_MODES: readonly SegmentOption<SiteMode>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'assisted', label: 'Assisted' },
  { value: 'manual', label: 'Manual' },
];

const THEMES: readonly SegmentOption<ThemeSource>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Section({
  title,
  desc,
  aside,
  children,
}: {
  title: string;
  desc: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
      <div className="row sp nw" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontWeight: 650, fontSize: 15, fontFamily: 'var(--sans)', letterSpacing: 0 }}>
            {title}
          </h2>
          <div className="s" style={{ fontSize: 13, marginTop: 2, lineHeight: 1.45 }}>
            {desc}
          </div>
        </div>
        {aside}
      </div>
      {children && <div style={{ marginTop: 10 }}>{children}</div>}
    </section>
  );
}

/** The V17 Settings sheet: 584px, slides in from the right. State is local sample state (no persistence yet). */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state: theme, setSource } = useTheme();
  const [autopilot, setAutopilot] = useState(DEFAULT_SETTINGS.autopilot);
  const [crew, setCrew] = useState(DEFAULT_SETTINGS.crew);
  const [submitMode, setSubmitMode] = useState(DEFAULT_SETTINGS.submitMode);
  const [sites, setSites] = useState(
    () => Object.fromEntries(SITES.map((s) => [s.name, s.mode])) as Record<string, SiteMode>,
  );
  const [limits, setLimits] = useState<Limits>(DEFAULT_SETTINGS.limits);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [logins, setLogins] = useState(SITE_LOGINS);

  return (
    <aside
      className="v17sheet"
      role="dialog"
      aria-label="Settings"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 584,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--line)',
        boxShadow: 'var(--float)',
        overflow: 'hidden',
      }}
    >
      <div
        className="row sp nw"
        style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--line)', flex: 'none' }}
      >
        <div className="row nw" style={{ gap: 14 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--brand-tint)',
              color: 'var(--brand-text)',
              display: 'grid',
              placeItems: 'center',
              flex: 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke} aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </span>
          <div>
            <div className="v17x">Settings · Cap can change any of these</div>
            <div className="v17n" style={{ fontSize: 34, marginTop: 6 }}>
              Crew <span className="it">controls.</span>
            </div>
          </div>
        </div>
        <button className="btn ghost ic sm" type="button" aria-label="Close settings" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 28px' }}>
        <Section
          title="Autopilot"
          desc="Crew picks up queued jobs on its own. Off means nothing starts without you."
          aside={<SwitchToggle label="Autopilot" on={autopilot} onChange={setAutopilot} />}
        >
          <div className="row nw s" style={{ gap: 8, fontSize: 13 }}>
            <i
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: autopilot ? 'var(--brand)' : 'var(--line-2)',
                display: 'block',
              }}
            />
            {autopilotStatus(autopilot, crew)}
          </div>
        </Section>
        <Section
          title="Crew size"
          desc="Jobs in flight at once, up to 32"
          aside={
            <span className="v17n" style={{ fontSize: 34 }} aria-live="polite">
              {crew}
            </span>
          }
        >
          <CrewSlider value={crew} onChange={setCrew} />
        </Section>
        <Section title="Submit mode" desc="Who presses the final button on a form.">
          <div className="row nw" role="radiogroup" aria-label="Submit mode" style={{ gap: 10, alignItems: 'stretch' }}>
            {SUBMIT_MODES.map((m) => {
              const on = m.value === submitMode;
              return (
                <div
                  key={m.value}
                  role="radio"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={() => setSubmitMode(m.value)}
                  onKeyDown={(e) =>
                    (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), setSubmitMode(m.value))
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderRadius: 16,
                    padding: '13px 15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    border: on ? '2px solid var(--brand)' : '1px solid var(--line-2)',
                    background: on ? 'var(--brand-tint)' : 'var(--bg)',
                  }}
                >
                  <div className="row sp nw" style={{ gap: 8 }}>
                    <b style={{ fontSize: 14 }}>{m.title}</b>
                    <span className={on ? 'chk on' : 'chk'}>
                      {on && (
                        <svg viewBox="0 0 24 24" strokeWidth="3.2" {...stroke} aria-hidden="true">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <div className="s" style={{ fontSize: 13, lineHeight: 1.45 }}>
                    {m.body}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
        <Section
          title="Sites"
          desc="How the crew handles each board. Submit mode above still decides who presses the button."
        >
          {SITES.map((s) => (
            <div
              key={s.name}
              className="row sp nw"
              style={{ gap: 12, padding: '7px 0', borderTop: '1px solid var(--line)' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div className="s" style={{ fontSize: 13 }}>
                  {s.stat}
                </div>
              </div>
              <SegmentedChoice
                label={`${s.name} mode`}
                options={SITE_MODES}
                value={sites[s.name] ?? s.mode}
                onChange={(m) => setSites((cur) => ({ ...cur, [s.name]: m }))}
                width={236}
              />
            </div>
          ))}
        </Section>
        <Section
          title="Advanced"
          desc="Hard limits. The crew stops at these, even in Auto."
          aside={
            <button
              type="button"
              className="btn ghost ic sm"
              aria-label={advancedOpen ? 'Collapse advanced limits' : 'Expand advanced limits'}
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
              style={{
                display: 'inline-flex',
                color: 'var(--muted)',
                minHeight: 0,
                width: 'auto',
                height: 'auto',
                padding: 0,
                border: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                strokeWidth="2"
                {...stroke}
                aria-hidden="true"
                style={{ transform: advancedOpen ? undefined : 'rotate(-90deg)', transition: 'transform .12s' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          }
        >
          {advancedOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
              {LIMIT_SPECS.map((spec) => (
                <LimitField
                  key={spec.key}
                  spec={spec}
                  value={limits[spec.key]}
                  onChange={(v) => setLimits((l) => ({ ...l, [spec.key]: v }))}
                />
              ))}
            </div>
          )}
        </Section>
        <Section
          title="Site logins"
          desc="Accounts the crew created on job boards. Encrypted on this Mac; Reveal asks for your Mac password."
          aside={
            <span className="s" style={{ fontSize: 13 }}>
              {logins.length}
            </span>
          }
        >
          {logins.map((l) => (
            <div
              key={l.id}
              className="row sp nw"
              style={{ gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 16 }}
            >
              <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--line-2)',
                    display: 'grid',
                    placeItems: 'center',
                    flex: 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke} aria-hidden="true">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13.5 }}>{l.host}</div>
                  <div className="s" style={{ fontSize: 13 }}>
                    {l.meta}
                  </div>
                </div>
              </div>
              <div className="row nw" style={{ gap: 6, flex: 'none' }}>
                {/* Reveal needs the OS keychain prompt, which is backend work (docs/FRONTEND.md section 9). */}
                <button className="btn sm" type="button" disabled title="Needs the system keychain (not connected yet)">
                  Reveal
                </button>
                <button
                  className="btn sm neg"
                  type="button"
                  onClick={() => setLogins((cur) => cur.filter((x) => x.id !== l.id))}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </Section>
        <Section title="Theme" desc="Follows your Mac when set to System.">
          <SegmentedChoice label="Theme" options={THEMES} value={theme.source} onChange={setSource} width={300} />
        </Section>
      </div>
      <div
        className="row sp nw"
        style={{ flex: 'none', padding: '16px 28px 24px', borderTop: '1px solid var(--line)' }}
      >
        <span className="s" style={{ fontSize: 13 }}>
          Saved as you change them
        </span>
        <button
          type="button"
          className="row nw"
          onClick={onClose}
          style={{ gap: 8, background: 'none', border: 0, padding: 0 }}
        >
          <span className="s" style={{ fontSize: 13 }}>
            Close
          </span>
          <KbdKey>Esc</KbdKey>
        </button>
      </div>
    </aside>
  );
}
