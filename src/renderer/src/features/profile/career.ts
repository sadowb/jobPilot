export interface CareerEntry {
  id: string;
  role: string;
  organisation: string;
  /** YYYY-MM */
  start: string;
  /** YYYY-MM, or 'present' for a role that has not ended. */
  end: string;
}

export const PRESENT = 'present';
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ENTRIES = 50;
const MAX_TEXT = 200;

/** A user-facing problem with one entry, or null when it is valid. */
export function careerError(e: CareerEntry): string | null {
  if (!e.role.trim()) return 'Add a role title.';
  if (!e.organisation.trim()) return 'Add where you worked.';
  if (!MONTH.test(e.start)) return 'Choose a start month.';
  if (e.end !== PRESENT && !MONTH.test(e.end)) return 'Choose an end month, or mark it as present.';
  if (e.end !== PRESENT && e.end < e.start) return 'The end cannot be before the start.';
  return null;
}

/** Strict reader for the persisted list; throws on anything malformed. */
export function parseCareer(value: unknown): CareerEntry[] {
  if (!Array.isArray(value) || value.length > MAX_ENTRIES) throw new Error('Invalid career');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid career entry');
    const r = item as Record<string, unknown>;
    const { id, role, organisation, start, end } = r;
    if (
      typeof id !== 'string' ||
      !id ||
      ids.has(id) ||
      typeof role !== 'string' ||
      typeof organisation !== 'string' ||
      typeof start !== 'string' ||
      typeof end !== 'string' ||
      role.length > MAX_TEXT ||
      organisation.length > MAX_TEXT
    )
      throw new Error('Invalid career entry');
    ids.add(id);
    const entry = { id, role, organisation, start, end };
    if (careerError(entry)) throw new Error('Invalid career entry');
    return entry;
  });
}

/** Newest first: ongoing roles on top, then by end month, then by start month. */
export function sortCareer(entries: readonly CareerEntry[]): CareerEntry[] {
  const endKey = (e: CareerEntry) => (e.end === PRESENT ? '9999-99' : e.end);
  return [...entries].sort((a, b) => endKey(b).localeCompare(endKey(a)) || b.start.localeCompare(a.start));
}

const year = (month: string) => month.slice(0, 4);

/** "2025 – present", "2022 – 2026", "2026" (single year) or "" when both are missing. */
export function yearRange(start: string, end: string): string {
  const from = MONTH.test(start) ? year(start) : '';
  const to = end === PRESENT ? 'present' : MONTH.test(end) ? year(end) : '';
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from || to;
}
