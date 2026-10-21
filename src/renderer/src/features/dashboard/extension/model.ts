export type LinkState =
  /** Already in the tracker: shows its date and can't be ticked. */
  | { kind: 'applied'; on: string }
  /** Selectable. */
  | { kind: 'open' }
  /** Excluded by "Match my roles" while it is on; ticking is allowed again when it is off. */
  | { kind: 'filtered'; reason: 'not your level' | 'not your roles' };

export interface PageLink {
  id: string;
  title: string;
  place: string;
  team: string;
  state: LinkState;
}

export interface PageScan {
  host: string;
  /** Job links the popup found on the page. */
  total: number;
  /** The popup lists at most this many; the rest wait behind "showing N". */
  links: PageLink[];
}

/**
 * What the popup finds on the V17 board's page (jobs.ashbyhq.com/ramp). Stands in for the content-script scan
 * until the extension exists; `total` is the page's count, `links` the rows the popup draws.
 */
export const SAMPLE_SCAN: PageScan = {
  host: 'jobs.ashbyhq.com/ramp',
  total: 14,
  links: [
    {
      id: 'swe-ng',
      title: 'Software Engineer, New Grad',
      place: 'New York',
      team: 'Engineering',
      state: { kind: 'applied', on: '2026-10-17' },
    },
    {
      id: 'backend',
      title: 'Backend Engineer, Early Career',
      place: 'New York',
      team: 'Engineering',
      state: { kind: 'open' },
    },
    { id: 'data', title: 'Data Engineer, New Grad', place: 'New York', team: 'Data', state: { kind: 'open' } },
    {
      id: 'payments',
      title: 'Software Engineer, Payments',
      place: 'New York',
      team: 'Engineering',
      state: { kind: 'open' },
    },
    {
      id: 'staff',
      title: 'Senior Staff Engineer',
      place: 'Remote US',
      team: 'Engineering',
      state: { kind: 'filtered', reason: 'not your level' },
    },
    {
      id: 'ae',
      title: 'Account Executive',
      place: 'New York',
      team: 'Sales',
      state: { kind: 'filtered', reason: 'not your roles' },
    },
  ],
};

export interface PopupState {
  matchRoles: boolean;
  /** Ticked link ids. */
  ticked: string[];
  sent: PageLink[] | null;
}

export type PopupAction =
  | { type: 'toggle'; id: string }
  | { type: 'all' }
  | { type: 'none' }
  | { type: 'match'; on: boolean }
  | { type: 'send' }
  | { type: 'reset' };

/** A link the user can tick right now. */
export function isSelectable(l: PageLink, matchRoles: boolean): boolean {
  if (l.state.kind === 'applied') return false;
  if (l.state.kind === 'filtered') return !matchRoles;
  return true;
}

export function initialPopupState(scan: PageScan = SAMPLE_SCAN): PopupState {
  return { matchRoles: true, ticked: scan.links.filter((l) => isSelectable(l, true)).map((l) => l.id), sent: null };
}

export function popupReducer(scan: PageScan) {
  return (s: PopupState, a: PopupAction): PopupState => {
    const byId = new Map(scan.links.map((l) => [l.id, l]));
    switch (a.type) {
      case 'toggle': {
        const l = byId.get(a.id);
        if (!l || !isSelectable(l, s.matchRoles)) return s;
        return { ...s, ticked: s.ticked.includes(a.id) ? s.ticked.filter((x) => x !== a.id) : [...s.ticked, a.id] };
      }
      case 'all':
        return { ...s, ticked: scan.links.filter((l) => isSelectable(l, s.matchRoles)).map((l) => l.id) };
      case 'none':
        return { ...s, ticked: [] };
      case 'match': {
        // Turning the filter on unticks what it excludes; turning it off leaves ticks as they are.
        const ticked = a.on
          ? s.ticked.filter((id) => byId.get(id) && isSelectable(byId.get(id) as PageLink, true))
          : s.ticked;
        return { ...s, matchRoles: a.on, ticked };
      }
      case 'send': {
        const sent = scan.links.filter((l) => s.ticked.includes(l.id));
        return sent.length ? { ...s, sent, ticked: [] } : s;
      }
      case 'reset':
        return initialPopupState(scan);
    }
  };
}
