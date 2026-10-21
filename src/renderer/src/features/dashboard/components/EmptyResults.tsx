import { V17CapDart } from '../../../components/V17CapDart';

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
      className="tbl"
      role="status"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
        textAlign: 'center',
        minHeight: 0,
      }}
    >
      <V17CapDart size={96} />
      <div className="h2" style={{ fontSize: 30, lineHeight: 1.1, marginTop: 8 }}>
        No jobs match <span className="it">“{query}”</span>
      </div>
      <div className="s" style={{ fontSize: 14, maxWidth: 470, lineHeight: 1.55 }}>
        Search covers company, role, location and work mode across your {appliedTotal} applied jobs.
        {upNextCompany ? ` ${upNextCompany} is still in Up next, so it isn’t here yet.` : ''}
      </div>
      <div className="row nw" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn pri sm" type="button" onClick={onClear}>
          Clear filters
        </button>
        <button className="btn sm" type="button" onClick={onOpenUpNext}>
          Open Up next
        </button>
      </div>
    </div>
  );
}
