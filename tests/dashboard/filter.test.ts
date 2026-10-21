import { describe, expect, it } from 'vitest';
import {
  countByFilter,
  filterApplications,
  highlight,
  matchesQuery,
  tokenize,
} from '../../src/renderer/src/features/dashboard/filter';
import { SAMPLE_APPLICATIONS } from '../../src/renderer/src/features/dashboard/sample';

const byId = (id: string) => SAMPLE_APPLICATIONS.find((a) => a.id === id)!;

describe('tokenize', () => {
  it('lowercases and splits on any whitespace, dropping empties', () => {
    expect(tokenize('  Remote   FIGMA\tinterview ')).toEqual(['remote', 'figma', 'interview']);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery(byId('ramp'), [])).toBe(true);
  });
  it('searches company, role, location and work mode, case-insensitively', () => {
    const ramp = byId('ramp');
    expect(matchesQuery(ramp, ['ramp'])).toBe(true);
    expect(matchesQuery(ramp, ['new', 'grad'])).toBe(true);
    expect(matchesQuery(ramp, ['york'])).toBe(true);
    expect(matchesQuery(ramp, [ramp.workMode.toLowerCase()])).toBe(true);
  });
  it('requires every token to match (AND), each in any field', () => {
    expect(matchesQuery(byId('ramp'), ['ramp', 'york'])).toBe(true);
    expect(matchesQuery(byId('ramp'), ['ramp', 'zzz'])).toBe(false);
  });
  it('does not search other fields such as salary or site', () => {
    expect(matchesQuery(byId('ramp'), ['ashby'])).toBe(false);
  });
});

describe('filtering and counts', () => {
  it('counts every row under "all" and each row under exactly one chip', () => {
    const c = countByFilter(SAMPLE_APPLICATIONS, '');
    expect(c.all).toBe(SAMPLE_APPLICATIONS.length);
    const chips = c.submitted + c.screening + c.interview + c.offer + c.rejected + c.withdrawn;
    expect(chips).toBe(c.all);
  });
  it('counts "closed" rows under the Withdrawn chip', () => {
    const closed = SAMPLE_APPLICATIONS.map((a, i) => (i === 0 ? { ...a, status: 'closed' as const } : a));
    const before = countByFilter(SAMPLE_APPLICATIONS, '');
    const after = countByFilter(closed, '');
    expect(after.withdrawn).toBe(before.withdrawn + 1);
    expect(filterApplications(closed, '', 'withdrawn').map((a) => a.id)).toContain(closed[0]!.id);
  });
  it('narrows chip counts by the search text but ignores the active chip', () => {
    const c = countByFilter(SAMPLE_APPLICATIONS, 'ramp');
    expect(c.all).toBe(1);
    expect(c.screening).toBe(1);
  });
  it('combines search and chip', () => {
    const rows = filterApplications(SAMPLE_APPLICATIONS, 'new york', 'rejected');
    expect(rows.every((a) => a.status === 'rejected' && /new york/i.test(a.location + a.role + a.company))).toBe(true);
  });
});

describe('highlight', () => {
  it('returns one plain segment without tokens', () => {
    expect(highlight('Ramp', [])).toEqual([{ text: 'Ramp', hit: false }]);
  });
  it('marks every occurrence of every token', () => {
    expect(highlight('Software Engineer, New Grad', ['e'])).toEqual(expect.arrayContaining([{ text: 'e', hit: true }]));
  });
  it('merges overlapping and adjacent hits and preserves the full text', () => {
    const segs = highlight('Engineering', ['eng', 'gin', 'ing']);
    expect(segs).toEqual([
      { text: 'Engin', hit: true },
      { text: 'eer', hit: false },
      { text: 'ing', hit: true },
    ]);
    expect(highlight('abcd', ['ab', 'bc', 'cd'])).toEqual([{ text: 'abcd', hit: true }]);
    const mixed = highlight('Backend Engineer', ['end', 'eer']);
    expect(mixed.map((s) => s.text).join('')).toBe('Backend Engineer');
    expect(mixed.filter((s) => s.hit).map((s) => s.text)).toEqual(['end', 'eer']);
  });
});
