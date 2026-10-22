import { cx } from '../../../components/ui';
import { StatusMenu } from './StatusMenu';
import { APPLICATION_GRID, ApplicationRow } from './ApplicationRow';
import { tokenize } from '../filter';
import type { Application, ApplicationStatus } from '../types';
import type { StatusMenuState } from '../state';

const HEADERS = ['Company · role', 'Location', 'Status', 'Salary', 'Site', 'Applied ↓'];

export function ApplicationsTable({
  rows,
  query,
  selectedId,
  statusMenu,
  onSelect,
  onOpenStatus,
  onPickStatus,
  onCloseStatus,
}: {
  rows: Application[];
  query: string;
  selectedId: string | null;
  statusMenu: StatusMenuState | null;
  onSelect: (id: string) => void;
  onOpenStatus: (id: string) => void;
  onPickStatus: (s: ApplicationStatus) => void;
  onCloseStatus: () => void;
}) {
  const tokens = tokenize(query);
  return (
    <div
      className={cx(
        'flex-none rounded-3xl border border-line bg-bg',
        statusMenu ? 'overflow-visible' : 'overflow-hidden',
      )}
      role="table"
      aria-label="Applications"
    >
      <div
        className="grid min-h-10 items-center gap-4 px-5 font-mono text-[11.5px] font-medium tracking-[0.08em] text-muted uppercase"
        role="row"
        style={{ gridTemplateColumns: APPLICATION_GRID }}
      >
        {HEADERS.map((h) => (
          <div key={h} role="columnheader">
            {h}
          </div>
        ))}
      </div>
      {rows.map((app) => (
        <ApplicationRow
          key={app.id}
          app={app}
          tokens={tokens}
          selected={app.id === selectedId}
          onSelect={() => onSelect(app.id)}
          onOpenStatus={() => onOpenStatus(app.id)}
          menu={
            statusMenu && app.id === selectedId ? (
              <StatusMenu
                current={app.status}
                cursor={statusMenu.cursor}
                onPick={onPickStatus}
                onClose={onCloseStatus}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
