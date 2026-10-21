import type { ReactNode } from 'react';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { shortDate } from '../format';
import { STATUS_META } from '../status';
import type { Application } from '../types';
import { Highlighted } from './Highlighted';

export const APPLICATION_GRID =
  'minmax(0,2.5fr) minmax(0,1.5fr) minmax(0,1.25fr) minmax(0,.95fr) minmax(0,.9fr) minmax(0,.7fr)';

export function ApplicationRow({
  app,
  tokens,
  selected,
  onSelect,
  onOpenStatus,
  menu,
}: {
  app: Application;
  tokens: string[];
  selected: boolean;
  onSelect: () => void;
  onOpenStatus: () => void;
  /** The status picker, when it is open on this row. */
  menu?: ReactNode;
}) {
  const meta = STATUS_META[app.status];
  return (
    <div
      role="row"
      aria-selected={selected}
      data-row-id={app.id}
      className={selected ? 'tr sel' : 'tr'}
      onClick={onSelect}
      style={{
        gridTemplateColumns: APPLICATION_GRID,
        gap: 16,
        minHeight: 46,
        padding: '0 20px',
        fontSize: 13.5,
        cursor: 'pointer',
      }}
    >
      <div className="row nw" style={{ gap: 12, minWidth: 0 }}>
        <V17AgentBot name={app.company} state={app.agent} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="cut" style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>
            <Highlighted text={app.company} tokens={tokens} />
          </div>
          <div className="cut s" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
            <Highlighted text={app.role} tokens={tokens} />
          </div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="cut" style={{ fontSize: 13.5 }}>
          <Highlighted text={app.location} tokens={tokens} />
        </div>
        <div className="s" style={{ fontSize: 12 }}>
          <Highlighted text={app.workMode} tokens={tokens} />
        </div>
      </div>
      <span className="row nw" style={{ gap: 6, position: 'relative', minWidth: 0 }}>
        <button
          type="button"
          className="row nw dash-iconbtn"
          aria-label={`Status: ${meta.longLabel}. Change status`}
          aria-haspopup="listbox"
          onClick={(e) => {
            e.stopPropagation();
            onOpenStatus();
          }}
          style={{ gap: 6, padding: 0, border: 0, background: 'transparent', minWidth: 0 }}
        >
          <V17StatusChip fg={meta.fg} bg={meta.bg}>
            {meta.label}
          </V17StatusChip>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flex: 'none' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {menu}
      </span>
      <span className="s" style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        {app.salary}
      </span>
      <span className="s cut" style={{ fontSize: 13 }}>
        {app.site}
      </span>
      <span className="s" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
        {shortDate(app.appliedOn)}
      </span>
    </div>
  );
}
