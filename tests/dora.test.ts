import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
import { computeDora, formatDuration, isPatchRelease, median, renderDoraTable } from '../scripts/dora.mjs';

const now = '2026-10-28T00:00:00Z';
const daysAgo = (days: number) => new Date(Date.parse(now) - days * 86_400_000).toISOString();
const release = (tag: string, days: number, draft = false) => ({ tag_name: tag, published_at: daysAgo(days), draft });
const pr = (title: string, createdDays: number, mergedDays: number | null) => ({
  title,
  created_at: daysAgo(createdDays),
  merged_at: mergedDays === null ? null : daysAgo(mergedDays),
});
const run = (conclusion: string, days: number) => ({ conclusion, created_at: daysAgo(days) });

describe('dora', () => {
  it('median and durations', () => {
    expect(median([])).toBeNull();
    expect(median([1, 5, 10])).toBe(5);
    expect(median([10, 20, 30, 40])).toBe(25);
    expect(formatDuration(null)).toBe('n/a');
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(7_200_000)).toBe('2.0h');
    expect(formatDuration(172_800_000)).toBe('2.0d');
  });

  it('treats only a patch bump as a fix release', () => {
    expect(isPatchRelease({ tag_name: 'v0.2.1' }, { tag_name: 'v0.2.0' })).toBe(true);
    expect(isPatchRelease({ tag_name: 'v0.3.0' }, { tag_name: 'v0.2.0' })).toBe(false);
    expect(isPatchRelease({ tag_name: 'v0.2.0' }, undefined)).toBe(false);
  });

  it('does not count release-please "Bug Fixes" notes as failures', () => {
    const notes = '### Bug Fixes\n* fix(runs): retry';
    const { lastWeek } = computeDora({
      releases: [
        { ...release('v0.2.0', 5), body: notes },
        { ...release('v0.3.0', 2), body: notes },
      ],
      pullRequests: [],
      workflowRuns: [],
      now,
    });
    expect(lastWeek).toMatchObject({ releases: 2, failures: 0, deploysPerWeek: 2 });
  });

  it('counts a release followed by a patch or a revert within a week as failed', () => {
    const { trend } = computeDora({
      releases: [
        release('v0.2.0', 20),
        release('v0.2.1', 18), // fixes v0.2.0
        release('v0.3.0', 10),
        release('v0.4.0', 1),
        release('v0.5.0', 0.5, true), // draft: ignored
      ],
      pullRequests: [pr('Revert "feat: x"', 9, 8)], // reverts v0.3.0
      workflowRuns: [],
      now,
    });
    expect(trend).toMatchObject({ releases: 4, failures: 2, deploysPerWeek: 1 });
  });

  it('measures lead time to merge and to the first release after merge', () => {
    const { lastWeek } = computeDora({
      releases: [release('v0.2.0', 1)],
      pullRequests: [pr('feat: a', 4, 3), pr('fix: b', 3, 2.5), pr('closed unmerged', 3, null)],
      workflowRuns: [],
      now,
    });
    expect(lastWeek.leadOpenToMerge).toBe(0.75 * 86_400_000);
    expect(lastWeek.leadMergeToRelease).toBe(1.75 * 86_400_000);
  });

  it('measures time to restore from red to the next green run, ignoring cancelled', () => {
    const { lastWeek } = computeDora({
      releases: [],
      pullRequests: [],
      workflowRuns: [
        run('success', 6),
        run('failure', 5),
        run('cancelled', 4.5),
        run('timed_out', 4.2),
        run('success', 4),
      ],
      now,
    });
    expect(lastWeek.timeToRestore).toBe(86_400_000);
  });

  it('renders n/a for an empty window', () => {
    const table = renderDoraTable(computeDora({ releases: [], pullRequests: [], workflowRuns: [], now }));
    expect(table).toContain('| Deployment frequency | 0.0/week | 0.0/week |');
    expect(table).toContain('n/a (no releases)');
  });
});
