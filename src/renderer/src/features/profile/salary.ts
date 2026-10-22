export type SalaryPeriod = 'year' | 'month';

export const MAX_SALARY = 1_000_000_000;

export interface SalaryValue {
  amount: number;
  period: SalaryPeriod;
  /** ISO 4217 code found in legacy text, if any. */
  currency?: string;
}

/** Display grouping while typing: "120000" → "120,000". Non-digits are ignored. */
export function groupDigits(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Digits typed or pasted → a whole number, or null when empty. Over-long input is cut at 9 digits. */
export function amountFromInput(input: string): number | null {
  const digits = input.replace(/\D/g, '').slice(0, 9);
  return digits ? Number(digits) : null;
}

/**
 * Old free-text salary → a value, or null when it is ambiguous (ranges, several numbers, no number at all).
 * Understands "120,000", "60k", "USD 60k per year", "5 000 / month".
 */
export function parseSalaryText(text: string): SalaryValue | null {
  const tokens = [...text.matchAll(/(\d[\d.,\s]*\d|\d)\s*(k|m)?\b/gi)];
  const cleaned = tokens.filter((t) => /\d/.test(t[1] ?? ''));
  if (cleaned.length !== 1) return null;
  const token = cleaned[0]!;
  const body = (token[1] ?? '').replace(/[\s,]/g, '');
  if (/\.\d{1,2}$/.test(body) === false && body.includes('.')) return null; // "1.000.000" style is ambiguous
  const base = Number(body);
  if (!Number.isFinite(base)) return null;
  const suffix = (token[2] ?? '').toLowerCase();
  const amount = Math.round(base * (suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1));
  if (amount <= 0 || amount > MAX_SALARY) return null;
  const currency = /\b([A-Z]{3})\b/.exec(text)?.[1];
  const period: SalaryPeriod = /month|\/\s*mo\b|monthly|\bpm\b/i.test(text) ? 'month' : 'year';
  return currency ? { amount, period, currency } : { amount, period };
}

/** "$120,000 per year". The currency is part of the formatted amount, so it can never be repeated. */
export function formatSalary(amount: number, period: SalaryPeriod, currency?: string): string {
  let formatted: string;
  try {
    formatted = currency
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
      : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
  } catch {
    formatted = `${new Intl.NumberFormat('en-US').format(amount)} ${currency ?? ''}`.trim();
  }
  return `${formatted} per ${period}`;
}
