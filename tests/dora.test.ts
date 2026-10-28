import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
import * as dora from '../scripts/dora.mjs';

const {
  computeChangeFailureRate,
  computeDeploymentFrequency,
  computeDoraMetrics,
  computeLeadTime,
  computeTimeToRestore,
  formatDuration,
  isFixRelease,
  isRevertPR,
  median,
  renderDoraTable,
} = dora;

describe('DORA metric helpers', () => {
  it('computes median correctly', () => {
    expect(median([])).toBeNull();
    expect(median([10])).toBe(10);
    expect(median([1, 5, 10])).toBe(5);
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it('formats duration into readable units', () => {
    expect(formatDuration(null)).toBe('n/a');
    expect(formatDuration(undefined)).toBe('n/a');
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(120000)).toBe('2.0m');
    expect(formatDuration(7200000)).toBe('2.0h');
    expect(formatDuration(172800000)).toBe('2.0d');
  });

  it('detects fix releases and revert PRs', () => {
    expect(isFixRelease({ tag_name: 'v1.0.1' }, { tag_name: 'v1.0.0' })).toBe(true);
    expect(isFixRelease({ tag_name: 'v1.1.0' }, { tag_name: 'v1.0.0' })).toBe(false);
    expect(isFixRelease({ name: 'fix: handle timeout' }, null)).toBe(true);
    expect(isFixRelease({ body: '### Bug Fixes\n- typo' }, null)).toBe(true);

    expect(isRevertPR({ title: 'Revert "feat: broken change"' })).toBe(true);
    expect(isRevertPR({ title: 'feat: add button' })).toBe(false);
  });
});

describe('Deployment frequency', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  it('handles edge case: no releases', () => {
    const res = computeDeploymentFrequency([], { now });
    expect(res.lastWeekCount).toBe(0);
    expect(res.lastWeekFormatted).toBe('0/week');
    expect(res.trendFormatted).toBe('0.0/week (0, 0, 0, 0)');
  });

  it('computes weekly release counts across 4 weeks and ignores drafts', () => {
    const releases = [
      {
        tag_name: 'v1.0.3',
        published_at: '2026-10-27T10:00:00Z', // last week
        draft: false,
      },
      {
        tag_name: 'v1.0.2',
        published_at: '2026-10-26T10:00:00Z', // last week
        draft: false,
      },
      {
        tag_name: 'v1.0.1-draft',
        published_at: '2026-10-25T10:00:00Z',
        draft: true, // ignored
      },
      {
        tag_name: 'v1.0.1',
        published_at: '2026-10-18T10:00:00Z', // 10 days ago (week -1)
        draft: false,
      },
      {
        tag_name: 'v1.0.0',
        published_at: '2026-10-05T10:00:00Z', // 23 days ago (week -3)
        draft: false,
      },
    ];

    const res = computeDeploymentFrequency(releases, { now });
    expect(res.lastWeekCount).toBe(2);
    expect(res.chronoBuckets).toEqual([1, 0, 1, 2]); // W3, W2, W1, W0
    expect(res.total).toBe(4);
    expect(res.avg).toBe(1.0);
    expect(res.lastWeekFormatted).toBe('2/week');
    expect(res.trendFormatted).toBe('1.0/week (1, 0, 1, 2)');
  });
});

describe('Lead time for changes', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  it('handles edge cases: no PRs and no releases', () => {
    const res = computeLeadTime([], [], { now });
    expect(res.lastWeek.formatted).toBe('PR: n/a, release: n/a');
    expect(res.trend.formatted).toBe('PR: n/a, release: n/a');
  });

  it('computes median open->merged and merged->release', () => {
    const pullRequests = [
      {
        number: 1,
        created_at: '2026-10-27T08:00:00Z',
        merged_at: '2026-10-27T10:00:00Z', // open->merge: 2h
      },
      {
        number: 2,
        created_at: '2026-10-27T06:00:00Z',
        merged_at: '2026-10-27T10:00:00Z', // open->merge: 4h
      },
    ];
    // Median open->merge = 3h

    const releases = [
      {
        tag_name: 'v1.0.0',
        published_at: '2026-10-27T12:00:00Z', // 2h after merge
        draft: false,
      },
    ];

    const res = computeLeadTime(pullRequests, releases, { now });
    expect(res.lastWeek.formatted).toBe('PR: 3.0h, release: 2.0h');
    expect(res.trend.formatted).toBe('PR: 3.0h, release: 2.0h');
  });

  it('handles PRs merged with no subsequent release', () => {
    const pullRequests = [
      {
        number: 1,
        created_at: '2026-10-27T08:00:00Z',
        merged_at: '2026-10-27T09:00:00Z', // 1h
      },
    ];
    const res = computeLeadTime(pullRequests, [], { now });
    expect(res.lastWeek.formatted).toBe('PR: 1.0h, release: n/a');
  });
});

describe('Change failure rate', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  it('handles edge case: no releases', () => {
    const res = computeChangeFailureRate([], [], { now });
    expect(res.lastWeek.formatted).toBe('n/a (no releases)');
    expect(res.trend.formatted).toBe('n/a (no releases)');
  });

  it('identifies failures followed within 7 days by a fix release or revert', () => {
    const releases = [
      {
        tag_name: 'v1.0.0',
        published_at: '2026-10-22T10:00:00Z', // followed by v1.0.1 within 2 days
        draft: false,
      },
      {
        tag_name: 'v1.0.1',
        name: 'fix: patch crash',
        published_at: '2026-10-24T10:00:00Z',
        draft: false,
      },
    ];
    const pullRequests = [
      {
        title: 'Revert "feat: bad feature"',
        merged_at: '2026-10-25T10:00:00Z',
      },
    ];

    const res = computeChangeFailureRate(releases, pullRequests, { now });
    // v1.0.0 was followed within 7d by v1.0.1 (fix release) -> failed
    // v1.0.1 was followed within 7d by Revert PR -> failed
    expect(res.lastWeek.failures).toBe(2);
    expect(res.lastWeek.total).toBe(2);
    expect(res.lastWeek.formatted).toBe('100.0%');
  });

  it('reports 0.0% when releases have no follow-up fix or revert', () => {
    const releases = [
      {
        tag_name: 'v1.0.0',
        published_at: '2026-10-25T10:00:00Z',
        draft: false,
      },
    ];
    const res = computeChangeFailureRate(releases, [], { now });
    expect(res.lastWeek.formatted).toBe('0.0%');
  });
});

describe('Time to restore', () => {
  const now = new Date('2026-10-28T12:00:00Z');

  it('handles edge case: no red runs (all green or cancelled)', () => {
    const runs = [
      { conclusion: 'success', created_at: '2026-10-27T10:00:00Z' },
      { conclusion: 'cancelled', created_at: '2026-10-27T11:00:00Z' },
      { conclusion: 'success', created_at: '2026-10-27T12:00:00Z' },
    ];
    const res = computeTimeToRestore(runs, { now });
    expect(res.lastWeek.formatted).toBe('n/a (no red runs)');
    expect(res.trend.formatted).toBe('n/a (no red runs)');
  });

  it('calculates median time from first failing run to next green', () => {
    const runs = [
      // Incident 1: 10:00 to 10:30 (30m)
      { conclusion: 'failure', created_at: '2026-10-27T10:00:00Z' },
      { conclusion: 'failure', created_at: '2026-10-27T10:15:00Z' }, // second failure in same incident
      { conclusion: 'success', created_at: '2026-10-27T10:30:00Z' }, // restored!

      // Incident 2: 12:00 to 12:10 (10m)
      { conclusion: 'timed_out', created_at: '2026-10-27T12:00:00Z' },
      { conclusion: 'success', created_at: '2026-10-27T12:10:00Z' }, // restored!
    ];

    // Median of [30m, 10m] = 20m
    const res = computeTimeToRestore(runs, { now });
    expect(res.lastWeek.count).toBe(2);
    expect(res.lastWeek.formatted).toBe('20.0m');
  });
});

describe('Table rendering and integration', () => {
  it('renders markdown table with all four metrics', () => {
    const metrics = computeDoraMetrics({
      releases: [],
      pullRequests: [],
      workflowRuns: [],
      now: new Date('2026-10-28T12:00:00Z'),
    });

    const table = renderDoraTable(metrics);
    expect(table).toContain('| Metric | Last week | 4-week trend |');
    expect(table).toContain('| Deployment frequency | 0/week | 0.0/week (0, 0, 0, 0) |');
    expect(table).toContain('| Lead time for changes | PR: n/a, release: n/a | PR: n/a, release: n/a |');
    expect(table).toContain('| Change failure rate | n/a (no releases) | n/a (no releases) |');
    expect(table).toContain('| Time to restore | n/a (no red runs) | n/a (no red runs) |');
  });
});
