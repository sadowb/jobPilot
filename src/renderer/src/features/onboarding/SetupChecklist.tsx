import { cx } from '../../components/ui';
import { cssVars } from '../../lib/css-vars';
import { A_RISE, S } from '../shared-ui';
import type { ChecklistItem } from './data';

const CHECK = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
);

/** One done row of the setup checklist. `compact` is the dashboard's side-card density; otherwise the Liftoff step's. */
export function ChecklistRow({ item, delay, compact }: { item: ChecklistItem; delay?: string; compact?: boolean }) {
  return (
    <div
      className={cx(
        'flex items-center border-t border-line',
        compact ? 'gap-3 py-3' : 'gap-3.5 py-1.5',
        delay && A_RISE,
      )}
      style={delay ? cssVars({ '--d': delay }) : undefined}
    >
      <span className="grid size-5 flex-none place-items-center rounded-md border-2 border-ink bg-ink text-ground">
        {CHECK}
      </span>
      <div className="min-w-0">
        <div className={cx('font-semibold', compact ? 'text-[14.5px]' : 'text-[15px]')}>{item.title}</div>
        <div className={cx(S, 'text-[13px]')}>{compact ? (item.shortDetail ?? item.detail) : item.detail}</div>
      </div>
    </div>
  );
}
