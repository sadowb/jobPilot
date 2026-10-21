import { STATUS_META } from './status';
import type { Application, StatusFilter } from './types';

/** Fields the search box covers (V17 empty state: "company, role, location and work mode"). */
const SEARCH_FIELDS = ['company', 'role', 'location', 'workMode'] as const;

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every token must appear in at least one searched field (AND across tokens, substring, case-insensitive). */
export function matchesQuery(app: Application, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const fields = SEARCH_FIELDS.map((f) => app[f].toLowerCase());
  return tokens.every((t) => fields.some((f) => f.includes(t)));
}

export function matchesFilter(app: Application, filter: StatusFilter): boolean {
  return filter === 'all' || STATUS_META[app.status].filter === filter;
}

export type FilterCounts = Record<StatusFilter, number>;

/** Per-chip counts over the rows that match the search text, ignoring the active chip (as the boards do). */
export function countByFilter(apps: readonly Application[], query: string): FilterCounts {
  const tokens = tokenize(query);
  const counts: FilterCounts = {
    all: 0,
    submitted: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  };
  for (const app of apps) {
    if (!matchesQuery(app, tokens)) continue;
    counts.all += 1;
    counts[STATUS_META[app.status].filter] += 1;
  }
  return counts;
}

export function filterApplications(apps: readonly Application[], query: string, filter: StatusFilter): Application[] {
  const tokens = tokenize(query);
  return apps.filter((a) => matchesQuery(a, tokens) && matchesFilter(a, filter));
}

export interface Segment {
  text: string;
  hit: boolean;
}

/** Splits `text` into runs, marking the parts any token matches. Overlapping/adjacent hits are merged. */
export function highlight(text: string, tokens: string[]): Segment[] {
  if (tokens.length === 0 || text === '') return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const t of tokens) {
    for (let at = lower.indexOf(t); at !== -1; at = lower.indexOf(t, at + t.length)) {
      ranges.push([at, at + t.length]);
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const out: Segment[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: text.slice(pos, s), hit: false });
    out.push({ text: text.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}
