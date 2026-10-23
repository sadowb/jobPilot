import type { ReactNode } from 'react';
import { cn } from '../../../components/ui';

export type DashboardTab = 'applied' | 'up-next';

export interface SegTab<T extends string> {
  key: T;
  label: string;
  count?: number;
}

/**
 * Tablist pill (board `.seg`). Not ui/Segmented: that is a radiogroup, and this control is a tablist with
 * Enter-to-select, which tests and the Up next keyboard flow rely on.
 */
export function SegTabs<T extends string>({
  label,
  tabs,
  active,
  onChange,
  className,
}: {
  label: string;
  tabs: readonly SegTab<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn('box-border inline-flex gap-0.5 rounded-full border border-line bg-bg p-1', className)}
      role="tablist"
      aria-label={label}
    >
      {tabs.map(({ key, label: text, count }) => {
        const on = active === key;
        return (
          <span
            key={key}
            role="tab"
            tabIndex={0}
            aria-selected={on}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-[7px] text-[14px] font-semibold',
              on ? 'bg-pri text-on-pri' : 'text-muted',
            )}
            onClick={() => onChange(key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onChange(key);
            }}
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
          </span>
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
