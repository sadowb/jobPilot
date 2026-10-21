import type { ApplicationStatus, StatusFilter } from './types';

export interface StatusMeta {
  label: string;
  /** Label in the status menu and the peek panel, where the cause helps ("got contacted"). */
  longLabel: string;
  fg: string;
  bg: string;
  filter: Exclude<StatusFilter, 'all'>;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  submitted: { label: 'Submitted', longLabel: 'Submitted', fg: 'var(--ink-2)', bg: 'var(--line)', filter: 'submitted' },
  screening: {
    label: 'Screening',
    longLabel: 'Screening · got contacted',
    fg: 'var(--st-teal-fg)',
    bg: 'var(--st-teal-bg)',
    filter: 'screening',
  },
  interview: {
    label: 'Interview',
    longLabel: 'Interview',
    fg: 'var(--st-amber-fg)',
    bg: 'var(--st-amber-bg)',
    filter: 'interview',
  },
  offer: { label: 'Offer', longLabel: 'Offer', fg: 'var(--work)', bg: 'var(--work-tint)', filter: 'offer' },
  rejected: {
    label: 'Rejected',
    longLabel: 'Rejected',
    fg: 'var(--st-bad-fg)',
    bg: 'var(--st-bad-bg)',
    filter: 'rejected',
  },
  withdrawn: { label: 'Withdrawn', longLabel: 'Withdrawn', fg: 'var(--muted)', bg: 'var(--line)', filter: 'withdrawn' },
  // "Closed · no reply" is a withdrawn-style close, so the Withdrawn chip counts it too.
  closed: {
    label: 'Closed',
    longLabel: 'Closed · no reply',
    fg: 'var(--muted)',
    bg: 'var(--line)',
    filter: 'withdrawn',
  },
};

/** Order of the filter chips above the table. */
export const FILTER_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

/** Groups of the status picker (S). */
export const STATUS_MENU_GROUPS: { heading: string; statuses: ApplicationStatus[] }[] = [
  { heading: 'After applying', statuses: ['submitted', 'screening', 'interview', 'offer'] },
  { heading: 'Closed', statuses: ['rejected', 'withdrawn', 'closed'] },
];

/** Flat menu order, for ↑/↓ and type-to-jump. */
export const STATUS_MENU_ORDER: ApplicationStatus[] = STATUS_MENU_GROUPS.flatMap((g) => g.statuses);
