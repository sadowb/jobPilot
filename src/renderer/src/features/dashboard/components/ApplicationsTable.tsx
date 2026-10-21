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
      className="tbl"
      role="table"
      aria-label="Applications"
      style={{ flex: 'none', overflow: statusMenu ? 'visible' : undefined }}
    >
      <div
        className="th"
        role="row"
        style={{
          gridTemplateColumns: APPLICATION_GRID,
          gap: 16,
          padding: '0 20px',
          minHeight: 40,
          alignItems: 'center',
        }}
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
