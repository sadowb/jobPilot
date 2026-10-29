import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../../components/ui';
import { controlFocus } from '../../../components/ui/controlStyles';

export type DashboardTab = 'applied' | 'up-next';

export interface SegTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

// Arrow keys leave `body[data-tab-focus]`: the dashboard swaps whole views, so the new tablist mounts and claims focus.

/** DOM ids tying a tab to its panel (`aria-controls` / `aria-labelledby`). */
export const tabId = (prefix: string, key: string) => `${prefix}-tab-${key}`;
export const panelId = (prefix: string, key: string) => `${prefix}-panel-${key}`;

/**
 * Tablist pill (board `.seg`). Accessible tablist with aria-selected, roving tabindex,
 * and arrow key navigation.
 */
export function SegTabs<T extends string>({
  label,
  idPrefix,
  tabs,
  active,
  onChange,
  className,
}: {
  label: string;
  /** Set when each tab controls a `role=tabpanel` with `panelId(idPrefix, key)`. */
  idPrefix?: string;
  tabs: readonly SegTab<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}): ReactNode {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = tabs.findIndex((t) => t.key === active);
  const tabStop = activeIndex >= 0 ? activeIndex : 0;

  useEffect(() => {
    if (document.body.getAttribute('data-tab-focus') !== `${label}:${active}`) return;
    document.body.removeAttribute('data-tab-focus');
    tabRefs.current[activeIndex]?.focus();
  }, [label, active, activeIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (step !== 0 || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const nextIndex =
        e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
      const next = tabs[nextIndex];
      if (next) {
        document.body.setAttribute('data-tab-focus', `${label}:${next.key}`);
        onChange(next.key);
        tabRefs.current[nextIndex]?.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(tabs[index]!.key);
    }
  };

  return (
    <div
      className={cn('box-border inline-flex gap-0.5 rounded-full border border-line bg-bg p-1', className)}
      role="tablist"
      aria-label={label}
    >
      {tabs.map(({ key, label: text, count }, index) => {
        const on = active === key;
        return (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? tabId(idPrefix, key) : undefined}
            // Only the active panel is mounted, so only the selected tab may point at it.
            aria-controls={idPrefix && on ? panelId(idPrefix, key) : undefined}
            tabIndex={index === tabStop ? 0 : -1}
            aria-selected={on}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full border-0 px-3.5 py-[7px] text-[14px] font-semibold',
              on ? 'bg-pri text-on-pri' : 'bg-transparent text-muted',
              controlFocus,
            )}
            onClick={() => onChange(key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {text}
            {count !== undefined && (
              <b
                className={cn(
                  'rounded-full px-[7px] text-[12.5px]',
                  on ? 'bg-[color-mix(in_srgb,var(--on-pri)_18%,transparent)] text-on-pri' : 'bg-hover text-ink-2',
                )}
              >
                {count}
              </b>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The Applied / Up next segmented control under the page title. */
export function TabSwitch({
  active,
  appliedCount,
  upNextCount,
  onChange,
  className,
}: {
  active: DashboardTab;
  appliedCount: number;
  upNextCount: number;
  onChange: (tab: DashboardTab) => void;
  className?: string;
}) {
  return (
    <SegTabs
      label="Dashboard view"
      idPrefix="dashboard"
      active={active}
      onChange={onChange}
      className={className}
      tabs={[
        { key: 'applied', label: 'Applied', count: appliedCount },
        { key: 'up-next', label: 'Up next', count: upNextCount },
      ]}
    />
  );
}
