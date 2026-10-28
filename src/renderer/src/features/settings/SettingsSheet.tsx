import { useState, type ReactNode } from 'react';
import { KbdKey } from '../../components/KbdKey';
import { Button, cn, Segmented } from '../../components/ui';
import { useExportRecoveryKey, useSettings, useUpdateSettings } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import type { ThemeSource } from '../../../../shared/ipc';
import { IT, S, V17N, V17X, shellButton } from '../shared-ui';
import { AgentCard } from './AgentCard';
import { ClaudeKeyField } from './ClaudeKeyField';
import { CrewSlider } from './CrewSlider';
import { DEFAULT_SETTINGS, SUBMIT_MODES } from './data';
import { MemoryCard } from './MemoryCard';
import { LimitField } from './LimitField';
import { LIMIT_SPECS } from './model';

const THEMES: readonly { value: ThemeSource; label: string }[] = [
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
    <section className="border-t border-line py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 font-sans text-[15px] font-[650] tracking-[0]">{title}</h2>
          <div className={cn(S, 'mt-0.5 text-[13px] leading-[1.45]')}>{desc}</div>
        </div>
        {aside}
      </div>
      {children && <div className="mt-2.5">{children}</div>}
    </section>
  );
}

/** The V17 Settings sheet: 584px, slides in from the right. Persisted via main settings module. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state: theme, setSource, error: themeError } = useTheme();
  const [recoveryError, setRecoveryError] = useState(false);
  const exportRecoveryKey = useExportRecoveryKey();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const crew = settings?.crew ?? DEFAULT_SETTINGS.crew;
  const submitMode = settings?.submitMode ?? DEFAULT_SETTINGS.submitMode;
  const limits = settings?.limits ?? DEFAULT_SETTINGS.limits;
  const [advancedOpen, setAdvancedOpen] = useState(true);

  return (
    <aside
      role="dialog"
      aria-label="Settings"
      className="fixed top-0 right-0 bottom-0 z-2 flex w-[584px] animate-[v17Slide_0.3s_cubic-bezier(0.2,0.8,0.2,1)_both] flex-col overflow-hidden border-l border-line bg-bg shadow-float motion-reduce:animate-none in-[html[data-platform=darwin]]:top-(--app-toolbar-height)"
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-line px-7 pt-[22px] pb-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-brand-tint text-brand-text">
            <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke} aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </span>
          <div>
            <div className={V17X}>Settings · Cap can change any of these</div>
            <div className={cn(V17N, 'mt-1.5 text-[34px]')}>
              Crew <span className={IT}>controls.</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(shellButton('ghost'), 'h-[34px]!')}
          aria-label="Close settings"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-7">
        <AgentCard />
        <MemoryCard />
        <ClaudeKeyField />
        <Section
          title="Autopilot"
          desc="Crew picks up queued jobs on its own. Off means nothing starts without you."
          aside={
            <button
              type="button"
              role="switch"
              disabled
              aria-checked={false}
              aria-label="Autopilot"
              className="relative h-[26px] w-11 flex-none cursor-not-allowed rounded-full border-0 bg-line-2 p-0 opacity-60"
            >
              <i className="absolute top-[3px] left-[3px] block size-5 rounded-full bg-white" />
            </button>
          }
        >
          <div className={cn(S, 'flex items-center gap-2 text-[13px]')}>
            <i className="block size-[7px] rounded-full bg-line-2" />
            Not available yet.
          </div>
        </Section>
        <Section
          title="Crew size"
          desc="Jobs in flight at once, up to 32"
          aside={
            <span className={cn(V17N, 'text-[34px]')} aria-live="polite">
              {crew}
            </span>
          }
        >
          <CrewSlider value={crew} onChange={(v) => updateSettings.mutate({ crew: v })} />
        </Section>
        <Section title="Submit mode" desc="Who presses the final button on a form.">
          <div className="flex items-stretch gap-2.5" role="radiogroup" aria-label="Submit mode">
            {SUBMIT_MODES.map((m) => {
              const on = m.value === submitMode;
              return (
                <div
                  key={m.value}
                  role="radio"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={() => updateSettings.mutate({ submitMode: m.value })}
                  onKeyDown={(e) =>
                    (e.key === ' ' || e.key === 'Enter') &&
                    (e.preventDefault(), updateSettings.mutate({ submitMode: m.value }))
                  }
                  className={cn(
                    'flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 rounded-2xl px-[15px] py-[13px]',
                    on ? 'border-2 border-brand bg-brand-tint' : 'border border-line-2 bg-bg',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[14px]">{m.title}</b>
                    <span
                      className={cn(
                        'grid size-5 flex-none place-items-center rounded-md border-2 [&_svg]:size-3',
                        on ? 'border-ink bg-ink text-ground' : 'border-line-2 bg-bg',
                      )}
                    >
                      {on && (
                        <svg viewBox="0 0 24 24" strokeWidth="3.2" {...stroke} aria-hidden="true">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <div className={cn(S, 'text-[13px] leading-[1.45]')}>{m.body}</div>
                </div>
              );
            })}
          </div>
        </Section>
        <Section title="Sites" desc="Not available yet." />
        <Section
          title="Advanced"
          desc="Hard limits. The crew stops at these, even in Auto."
          aside={
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted! [&_svg]:size-[18px]"
              aria-label={advancedOpen ? 'Collapse advanced limits' : 'Expand advanced limits'}
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                strokeWidth="2"
                {...stroke}
                aria-hidden="true"
                className={cn(
                  'transition-transform duration-[120ms] ease-[ease]',
                  !advancedOpen && '[transform:rotate(-90deg)]',
                )}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          }
        >
          {advancedOpen && (
            <div className="grid grid-cols-4 gap-2.5">
              {LIMIT_SPECS.map((spec) => (
                <LimitField
                  key={spec.key}
                  spec={spec}
                  value={limits[spec.key]}
                  onChange={(v) => updateSettings.mutate({ limits: { ...limits, [spec.key]: v } })}
                />
              ))}
            </div>
          )}
        </Section>
        <Section title="Site logins" desc="Not available yet." />
        <Section
          title="Database recovery"
          desc="Keep a recovery key in your main Bitwarden vault in case this Mac loses Keychain access."
        >
          <Button
            onClick={() => {
              setRecoveryError(false);
              exportRecoveryKey.mutate(undefined, { onError: () => setRecoveryError(true) });
            }}
          >
            Export recovery key
          </Button>
          {recoveryError && <p role="alert">The recovery key could not be exported.</p>}
        </Section>
        <Section title="Theme" desc="Follows your Mac when set to System.">
          <Segmented label="Theme" options={THEMES} value={theme.source} onChange={setSource} className="w-[300px]" />
          {themeError && (
            <p role="alert" className="text-[13px] text-bad">
              {themeError}
            </p>
          )}
        </Section>
      </div>
      <div className="flex flex-none items-center justify-between gap-3 border-t border-line px-7 pt-4 pb-6">
        <span className={cn(S, 'text-[13px]')}>Saved as you change them</span>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
          onClick={onClose}
        >
          <span className={cn(S, 'text-[13px]')}>Close</span>
          <KbdKey>Esc</KbdKey>
        </button>
      </div>
    </aside>
  );
}
