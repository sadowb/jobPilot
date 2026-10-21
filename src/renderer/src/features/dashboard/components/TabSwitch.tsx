import type { CSSProperties } from 'react';

export type DashboardTab = 'applied' | 'up-next';

/** The Applied / Up next segmented control under the page title (board `.seg`). */
export function TabSwitch({
  active,
  appliedCount,
  upNextCount,
  onChange,
  style,
}: {
  active: DashboardTab;
  appliedCount: number;
  upNextCount: number;
  onChange: (tab: DashboardTab) => void;
  style?: CSSProperties;
}) {
  const tab = (key: DashboardTab, label: string, count: number) => (
    <span
      role="tab"
      tabIndex={0}
      aria-selected={active === key}
      className={active === key ? 'on' : undefined}
      onClick={() => onChange(key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onChange(key);
      }}
      style={{ cursor: 'pointer' }}
    >
      {label} <b>{count}</b>
    </span>
  );
  return (
    <div className="seg" role="tablist" aria-label="Dashboard view" style={style}>
      {tab('applied', 'Applied', appliedCount)}
      {tab('up-next', 'Up next', upNextCount)}
    </div>
  );
}
