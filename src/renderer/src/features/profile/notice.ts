/** How soon the owner can start. Replaces the old free-text "earliest start date". */
export type Notice = { kind: 'period'; days: number } | { kind: 'date'; iso: string };

export const NOTICE_PERIODS: readonly { days: number; label: string; answer: string }[] = [
  { days: 0, label: 'Immediately', answer: 'Immediately' },
  { days: 7, label: '1 week', answer: "1 week's notice" },
  { days: 14, label: '2 weeks', answer: "2 weeks' notice" },
  { days: 30, label: '1 month', answer: "1 month's notice" },
  { days: 60, label: '2 months', answer: "2 months' notice" },
  { days: 90, label: '3 months', answer: "3 months' notice" },
];

const MAX_DAYS = 730;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in YYYY-MM-DD form ("2026-02-30" is rejected). */
export function isIsoDate(text: string): boolean {
  const m = ISO_DATE.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Strict reader for the stored value. Throws on anything malformed; null/undefined mean "not set". */
export function parseNotice(value: unknown): Notice | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid notice');
  const r = value as Record<string, unknown>;
  if (r.kind === 'period') {
    if (typeof r.days !== 'number' || !Number.isInteger(r.days) || r.days < 0 || r.days > MAX_DAYS)
      throw new Error('Invalid notice period');
    return { kind: 'period', days: r.days };
  }
  if (r.kind === 'date') {
    if (typeof r.iso !== 'string' || !isIsoDate(r.iso)) throw new Error('Invalid notice date');
    return { kind: 'date', iso: r.iso };
  }
  throw new Error('Invalid notice');
}

const dateFormat = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** "Immediately", "2 weeks", "From 1 Dec 2026". For the card row and the select. */
export function noticeLabel(notice: Notice): string {
  if (notice.kind === 'date') return `From ${dateFormat(notice.iso)}`;
  return NOTICE_PERIODS.find((p) => p.days === notice.days)?.label ?? `${notice.days} days`;
}

/** The answer sent for "When can you start?": "Immediately", "2 weeks' notice", "From 1 Dec 2026". */
export function noticeAnswer(notice: Notice): string {
  if (notice.kind === 'date') return `From ${dateFormat(notice.iso)}`;
  return NOTICE_PERIODS.find((p) => p.days === notice.days)?.answer ?? `${notice.days} days' notice`;
}

/**
 * Old free text → a notice when it is unambiguous: an ISO date, "immediately", or "2 weeks" / "1 month" style
 * values that match an offered period. Anything else returns null so the caller can keep and flag it.
 */
export function parseNoticeText(text: string): Notice | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (isIsoDate(t)) return { kind: 'date', iso: t };
  if (/^(immediately|immediate|now|asap|right away|available now)$/.test(t)) return { kind: 'period', days: 0 };
  const m = /^(\d+)\s*(week|weeks|wk|wks|month|months|mo)(?:s'?)?(?:\s+notice)?$/.exec(t.replace(/[’']/g, ''));
  if (!m) return null;
  const days = Number(m[1]) * (m[2]!.startsWith('w') ? 7 : 30);
  return NOTICE_PERIODS.some((p) => p.days === days) ? { kind: 'period', days } : null;
}
