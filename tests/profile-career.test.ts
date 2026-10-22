import { describe, expect, it } from 'vitest';
import { careerError, sortCareer, yearRange, type CareerEntry } from '../src/renderer/src/features/profile/career';

const e = (id: string, start: string, end: string): CareerEntry => ({ id, role: 'R', organisation: 'O', start, end });

describe('career helpers', () => {
  it('sorts newest first, ongoing roles on top', () => {
    const sorted = sortCareer([
      e('old', '2018-01', '2020-06'),
      e('now', '2025-01', 'present'),
      e('mid', '2020-07', '2024-12'),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['now', 'mid', 'old']);
  });

  it('validates each entry', () => {
    expect(careerError(e('a', '2025-01', 'present'))).toBeNull();
    expect(careerError({ ...e('a', '2025-01', 'present'), role: ' ' })).toMatch(/role/);
    expect(careerError(e('a', '', 'present'))).toMatch(/start/);
    expect(careerError(e('a', '2025-05', '2025-01'))).toMatch(/before/);
    expect(careerError(e('a', '2025-05', ''))).toMatch(/end/);
  });

  it('renders year ranges', () => {
    expect(yearRange('2025-01', 'present')).toBe('2025 – present');
    expect(yearRange('2022-09', '2026-06')).toBe('2022 – 2026');
    expect(yearRange('', '2026-06')).toBe('2026');
    expect(yearRange('', '')).toBe('');
  });
});
