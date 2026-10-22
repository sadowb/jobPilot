import { V17CapDart } from '../../../components/V17CapDart';
import { AppButton } from './AppButton';

/** Empty search result (board Dash_Empty): Cap on the dart, what was searched, and the two ways out. */
export function EmptyResults({
  query,
  appliedTotal,
  upNextCompany,
  onClear,
  onOpenUpNext,
}: {
  query: string;
  appliedTotal: number;
  /** A company from Up next that the search would have matched, if any. */
  upNextCompany?: string;
  onClear: () => void;
  onOpenUpNext: () => void;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-line bg-bg p-10 text-center"
      role="status"
    >
      <V17CapDart size={96} />
      <div className="mt-2 font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.015em]">
        No jobs match <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">“{query}”</span>
      </div>
      <div className="max-w-[470px] text-[14px] leading-[1.55] text-muted">
        Search covers company, role, location and work mode across your {appliedTotal} applied jobs.
        {upNextCompany ? ` ${upNextCompany} is still in Up next, so it isn’t here yet.` : ''}
      </div>
      <div className="mt-2 flex flex-nowrap items-center gap-2">
        <AppButton variant="primary" size="sm" onClick={onClear}>
          Clear filters
        </AppButton>
        <AppButton size="sm" onClick={onOpenUpNext}>
          Open Up next
        </AppButton>
      </div>
    </div>
  );
}
