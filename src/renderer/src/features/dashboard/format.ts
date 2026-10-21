const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m > 12) throw new RangeError(`Expected an ISO date (YYYY-MM-DD), got "${iso}"`);
  return { y, m, d };
}

/** "Oct 17". Calendar dates carry no time zone, so this never shifts a day. */
export function shortDate(iso: string): string {
  const { m, d } = parts(iso);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Oct 17, 2026". */
export function longDate(iso: string): string {
  return `${shortDate(iso)}, ${parts(iso).y}`;
}

/** Today's calendar date in the user's time zone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Local wall-clock time as "HH:MM" (24 h), e.g. when the user held a job. */
export function clockTime(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
