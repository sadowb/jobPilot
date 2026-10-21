import { describe, expect, it } from 'vitest';
import { clockTime, longDate, shortDate, todayIso } from '../../src/renderer/src/features/dashboard/format';

describe('dates', () => {
  it('formats calendar dates without a time-zone shift', () => {
    expect(shortDate('2026-10-17')).toBe('Oct 17');
    expect(longDate('2026-01-05')).toBe('Jan 5, 2026');
  });
  it('rejects malformed dates loudly', () => {
    expect(() => shortDate('Oct 17')).toThrow(RangeError);
    expect(() => shortDate('2026-13-01')).toThrow(RangeError);
  });
  it('builds local today and clock strings with zero padding', () => {
    const d = new Date(2026, 0, 5, 7, 4);
    expect(todayIso(d)).toBe('2026-01-05');
    expect(clockTime(d)).toBe('07:04');
  });
});
