import { filterApplications } from './filter';
import { STATUS_MENU_ORDER } from './status';
import type { Application, ApplicationStatus, StatusFilter } from './types';

export interface StatusMenuState {
  /** Index into STATUS_MENU_ORDER. */
  cursor: number;
}

interface UndoEntry {
  id: string;
  previous: Pick<Application, 'status' | 'statusSource' | 'statusSetOn'>;
}

export interface DashboardState {
  apps: Application[];
  query: string;
  filter: StatusFilter;
  selectedId: string | null;
  peekOpen: boolean;
  statusMenu: StatusMenuState | null;
  cvOpen: boolean;
  undo: UndoEntry | null;
}

export type DashboardAction =
  | { type: 'query'; query: string }
  | { type: 'filter'; filter: StatusFilter }
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'select'; id: string; peek?: boolean }
  | { type: 'togglePeek' }
  | { type: 'closePeek' }
  | { type: 'openStatus'; id?: string }
  | { type: 'closeStatus' }
  | { type: 'statusCursor'; delta: 1 | -1 }
  | { type: 'statusJump'; letter: string }
  | { type: 'setStatus'; status: ApplicationStatus; today: string }
  | { type: 'undoStatus' }
  | { type: 'openCv' }
  | { type: 'closeCv' }
  | { type: 'escape' };

export function initialState(apps: Application[]): DashboardState {
  return {
    apps,
    query: '',
    filter: 'all',
    selectedId: null,
    peekOpen: false,
    statusMenu: null,
    cvOpen: false,
    undo: null,
  };
}

export const visibleApps = (s: DashboardState): Application[] => filterApplications(s.apps, s.query, s.filter);

/** Undo is offered for the user's last change on the selected row, and for any status an email set. */
export const canUndo = (s: DashboardState): boolean => {
  const app = selectedApp(s);
  return Boolean(app && (s.undo?.id === app.id || app.statusSource === 'email'));
};

export const selectedApp = (s: DashboardState): Application | null =>
  s.selectedId ? (s.apps.find((a) => a.id === s.selectedId) ?? null) : null;

/** Keeps the selection only while its row is still on screen; closes what hangs off a vanished row. */
function reconcile(s: DashboardState): DashboardState {
  const rows = visibleApps(s);
  if (s.selectedId && rows.some((r) => r.id === s.selectedId)) return s;
  return { ...s, selectedId: null, peekOpen: false, statusMenu: null, cvOpen: false };
}

export function dashboardReducer(s: DashboardState, a: DashboardAction): DashboardState {
  switch (a.type) {
    case 'query':
      return reconcile({ ...s, query: a.query });
    case 'filter':
      return reconcile({ ...s, filter: a.filter });
    case 'move': {
      const rows = visibleApps(s);
      if (rows.length === 0) return s;
      const at = rows.findIndex((r) => r.id === s.selectedId);
      const next = at === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, at + a.delta));
      return { ...s, selectedId: (rows[next] as Application).id, statusMenu: null };
    }
    case 'select':
      return { ...s, selectedId: a.id, peekOpen: a.peek ? true : s.peekOpen, statusMenu: null };
    case 'togglePeek': {
      if (s.peekOpen) return { ...s, peekOpen: false, cvOpen: false };
      const rows = visibleApps(s);
      const id = s.selectedId ?? rows[0]?.id ?? null;
      return id ? { ...s, selectedId: id, peekOpen: true } : s;
    }
    case 'closePeek':
      return { ...s, peekOpen: false, cvOpen: false };
    case 'openStatus': {
      const id = a.id ?? s.selectedId ?? visibleApps(s)[0]?.id ?? null;
      const app = s.apps.find((x) => x.id === id);
      if (!app) return s;
      return { ...s, selectedId: app.id, statusMenu: { cursor: Math.max(0, STATUS_MENU_ORDER.indexOf(app.status)) } };
    }
    case 'closeStatus':
      return { ...s, statusMenu: null };
    case 'statusCursor': {
      if (!s.statusMenu) return s;
      const n = STATUS_MENU_ORDER.length;
      return { ...s, statusMenu: { cursor: (s.statusMenu.cursor + a.delta + n) % n } };
    }
    case 'statusJump': {
      if (!s.statusMenu) return s;
      const letter = a.letter.toLowerCase();
      const at = STATUS_MENU_ORDER.findIndex((st) => st.startsWith(letter));
      return at === -1 ? s : { ...s, statusMenu: { cursor: at } };
    }
    case 'setStatus': {
      const app = selectedApp(s);
      if (!app) return s;
      const changed = app.status !== a.status;
      const apps = changed
        ? s.apps.map((x) =>
            x.id === app.id ? { ...x, status: a.status, statusSource: 'you' as const, statusSetOn: a.today } : x,
          )
        : s.apps;
      const undo = changed
        ? {
            id: app.id,
            previous: { status: app.status, statusSource: app.statusSource, statusSetOn: app.statusSetOn },
          }
        : s.undo;
      // The row may no longer match the active chip after the change; reconcile drops a vanished selection.
      return reconcile({ ...s, apps, undo, statusMenu: null });
    }
    case 'undoStatus': {
      const app = selectedApp(s);
      if (!app) return s;
      if (s.undo?.id === app.id) {
        const { id, previous } = s.undo;
        return reconcile({ ...s, apps: s.apps.map((x) => (x.id === id ? { ...x, ...previous } : x)), undo: null });
      }
      if (app.statusSource === 'email') {
        // Undo an inbox inference: back to what the agent knew at submit time.
        const apps = s.apps.map((x) =>
          x.id === app.id
            ? { ...x, status: 'submitted' as const, statusSource: 'agent' as const, statusSetOn: x.appliedOn }
            : x,
        );
        return reconcile({ ...s, apps });
      }
      return s;
    }
    case 'openCv':
      return s.selectedId ? { ...s, cvOpen: true, peekOpen: true, statusMenu: null } : s;
    case 'closeCv':
      return { ...s, cvOpen: false };
    case 'escape': {
      if (s.cvOpen) return { ...s, cvOpen: false };
      if (s.statusMenu) return { ...s, statusMenu: null };
      if (s.peekOpen) return { ...s, peekOpen: false };
      if (s.query !== '') return reconcile({ ...s, query: '' });
      if (s.selectedId) return { ...s, selectedId: null };
      return s;
    }
  }
}
