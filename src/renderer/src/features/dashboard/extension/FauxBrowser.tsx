import type { ReactNode } from 'react';
import { Eyebrow, cx } from '../../../components/ui';
import { V17Icon } from '../../../components/V17Icon';

const filterChip = 'flex-none rounded-full border px-[13px] py-1.5 text-[13px] whitespace-nowrap';

const ROLES = [
  ['Software Engineer, New Grad', 'New York, NY · Engineering'],
  ['Backend Engineer, Early Career', 'New York, NY · Engineering'],
  ['Data Engineer, New Grad', 'New York, NY · Data'],
  ['Software Engineer, Payments', 'New York, NY · Engineering'],
  ['Senior Staff Engineer', 'Remote US · Engineering'],
  ['Account Executive', 'New York, NY · Sales'],
  ['Product Designer, Growth', 'New York, NY · Design'],
  ['Solutions Engineer, Public Sector', 'Washington, DC · Sales'],
] as const;

/** The JobPilot dart glyph used for the toolbar button, filled with the current colour. */
function ToolbarDart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 11.2 L21.5 2.5 L14.2 21.5 L11 13.4 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 13.4 L21.5 2.5" stroke="var(--bg)" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <circle cx="15.6" cy="8.6" r="1.9" fill="var(--bg)" />
      <circle cx="16.1" cy="8.3" r=".8" fill="currentColor" />
    </svg>
  );
}

/**
 * A mock browser window around a mock careers page (jobs.ashbyhq.com/ramp). Pure illustration of where the
 * extension lives: the toolbar button toggles the popup passed as children.
 */
export function FauxBrowser({
  badge,
  popupOpen,
  onTogglePopup,
  children,
}: {
  badge: number;
  popupOpen: boolean;
  onTogglePopup: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-[20px] border border-line-2 bg-bg shadow-float">
      <div className="box-border flex h-[52px] flex-nowrap items-center gap-3.5 border-b border-line bg-panel px-4">
        <span className="flex gap-[7px]">
          <i className="size-[11px] rounded-full bg-line-2" />
          <i className="size-[11px] rounded-full bg-line-2" />
          <i className="size-[11px] rounded-full bg-line-2" />
        </span>
        <span className="ml-1.5 flex gap-3.5 text-muted">
          <V17Icon name="back" />
          <V17Icon name="forward" />
          <V17Icon name="reload" />
        </span>
        <div className="flex h-[34px] max-w-[620px] min-w-0 flex-1 flex-nowrap items-center gap-2.5 rounded-full border border-line bg-bg px-3.5 font-mono text-[12.5px] text-muted">
          <V17Icon name="lock" />
          <span className="truncate">
            jobs.ashbyhq.com/<b className="font-semibold text-ink">ramp</b>
          </span>
        </div>
        <button
          type="button"
          aria-label="JobPilot"
          aria-expanded={popupOpen}
          onClick={onTogglePopup}
          className="relative ml-auto grid size-9 cursor-pointer place-items-center rounded-[11px] border border-brand bg-brand-tint p-0 text-brand-text"
        >
          <ToolbarDart />
          <span className="absolute -top-[7px] -right-[7px] box-border grid h-5 min-w-5 place-items-center rounded-full bg-pri px-1.5 text-[11px] font-bold text-on-pri">
            {badge}
          </span>
        </button>
      </div>
      <div className="relative box-border h-[612px] overflow-hidden px-14 py-[30px]">
        <div className="flex flex-nowrap items-center justify-between gap-3">
          <span className="font-serif text-[26px] tracking-[-0.01em]">Ramp</span>
          <span className="text-[13px] text-muted">Teams · Benefits · Life</span>
        </div>
        <div className="mt-[26px] flex flex-nowrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Careers</Eyebrow>
            <div className="mt-1.5 font-serif text-[34px] leading-tight font-normal tracking-[-0.015em]">Open roles</div>
          </div>
          <span className="text-[13px] text-muted">{badge} roles · Engineering, Sales, Data</span>
        </div>
        <div className="mt-4 flex flex-nowrap items-center gap-2">
          <span className={cx(filterChip, 'border-pri bg-pri text-on-pri')}>Engineering</span>
          <span className={cx(filterChip, 'border-line-2 text-ink-2')}>New York</span>
          <span className={cx(filterChip, 'border-line-2 text-ink-2')}>Early career</span>
        </div>
        <div className="mt-3.5 flex max-w-[820px] flex-col">
          {ROLES.map(([role, where]) => (
            <div
              key={role}
              className="flex flex-none flex-nowrap items-center justify-between gap-3 border-t border-line py-4"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{role}</div>
                <div className="text-[13px] text-muted">{where}</div>
              </div>
              <span className="text-[13px] text-muted">View →</span>
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(transparent,var(--bg))]"
        />
        {children}
      </div>
    </div>
  );
}
