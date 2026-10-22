import { Segmented } from '../../../components/ui';

export type DashboardTab = 'applied' | 'up-next';

/** The Applied / Up next segmented control under the page title (board `.seg`). */
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
    <Segmented
      label="Dashboard view"
      value={active}
      onChange={onChange}
      className={className}
      options={[
        { key: 'applied', label: 'Applied', count: appliedCount },
        { key: 'up-next', label: 'Up next', count: upNextCount },
      ]}
    />
  );
}
