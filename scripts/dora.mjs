#!/usr/bin/env node
// DORA metrics for the weekly digest, from published releases, merged PRs and CI runs on main.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const at = (iso) => Date.parse(iso);

export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatDuration(ms) {
  if (ms == null) return 'n/a';
  const units = [
    ['d', DAY],
    ['h', 3_600_000],
    ['m', 60_000],
  ];
  for (const [unit, size] of units) if (ms >= size) return `${(ms / size).toFixed(1)}${unit}`;
  return `${Math.round(ms / 1000)}s`;
}

const semver = (tag) =>
  tag
    ?.match(/(\d+)\.(\d+)\.(\d+)/)
    ?.slice(1)
    .map(Number);

// release-please bumps the patch only when a release holds fixes and no features, so a patch
// release means the previous release needed fixing. Release notes are not used: every
// release-please body has a "Bug Fixes" section.
export function isPatchRelease(release, previous) {
  const [a, b] = [semver(previous?.tag_name), semver(release.tag_name)];
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1] && b[2] > a[2]);
}

export const isRevert = (pr) => /^revert\b/i.test(pr.title);

export function computeDora({ releases, pullRequests, workflowRuns, now = Date.now() }) {
  const end = new Date(now).getTime();
  const published = releases
    .filter((r) => !r.draft && r.published_at)
    .map((r) => ({ ...r, at: at(r.published_at) }))
    .sort((a, b) => a.at - b.at);
  const merged = pullRequests
    .filter((pr) => pr.merged_at)
    .map((pr) => {
      const mergedAt = at(pr.merged_at);
      const shipped = published.find((r) => r.at >= mergedAt);
      return {
        ...pr,
        at: mergedAt,
        open: mergedAt - at(pr.created_at),
        toRelease: shipped ? shipped.at - mergedAt : null,
      };
    });
  // A release failed when a patch release or a revert PR follows it within a week.
  const failed = (release, index) => {
    const next = published[index + 1];
    const within = (t) => t > release.at && t - release.at <= WEEK;
    return (
      Boolean(next && within(next.at) && isPatchRelease(next, release)) ||
      merged.some((pr) => isRevert(pr) && within(pr.at))
    );
  };

  // A red streak on main (failure or timeout) ends at the next green run; cancelled runs are ignored.
  const incidents = [];
  let redSince = null;
  for (const run of [...workflowRuns].sort((a, b) => at(a.created_at) - at(b.created_at))) {
    const t = at(run.created_at);
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') redSince ??= t;
    else if (run.conclusion === 'success' && redSince !== null) {
      incidents.push({ at: redSince, duration: t - redSince });
      redSince = null;
    }
  }

  const span = (weeks) => {
    const inside = (item) => item.at > end - weeks * WEEK && item.at <= end;
    const releasesIn = published.map((r, i) => [r, i]).filter(([r]) => inside(r));
    const prsIn = merged.filter(inside);
    return {
      deploysPerWeek: releasesIn.length / weeks,
      leadOpenToMerge: median(prsIn.map((pr) => pr.open)),
      leadMergeToRelease: median(prsIn.map((pr) => pr.toRelease).filter((v) => v !== null)),
      failures: releasesIn.filter(([r, i]) => failed(r, i)).length,
      releases: releasesIn.length,
      timeToRestore: median(incidents.filter(inside).map((i) => i.duration)),
    };
  };
  return { lastWeek: span(1), trend: span(4) };
}

export function renderDoraTable({ lastWeek, trend }) {
  const row = (name, show) => `| ${name} | ${show(lastWeek)} | ${show(trend)} |`;
  return [
    '| Metric | Last week | 4-week average |',
    '| --- | --- | --- |',
    row('Deployment frequency', (s) => `${s.deploysPerWeek.toFixed(1)}/week`),
    row('Lead time (open → merge)', (s) => formatDuration(s.leadOpenToMerge)),
    row('Lead time (merge → release)', (s) => formatDuration(s.leadMergeToRelease)),
    row('Change failure rate', (s) =>
      s.releases
        ? `${((s.failures / s.releases) * 100).toFixed(0)}% (${s.failures}/${s.releases})`
        : 'n/a (no releases)',
    ),
    row('Time to restore', (s) => formatDuration(s.timeToRestore)),
  ].join('\n');
}

// shortcut: one page of 100 per endpoint covers a 4-week window at the current pace; paginate if it stops.
// Errors are not caught: a failed gh call must fail the digest job, not render as an empty week.
const api = (path, jq) => JSON.parse(execFileSync('gh', ['api', path, '--jq', jq], { encoding: 'utf8' }));

export function fetchGitHubData(repo) {
  return {
    releases: api(`repos/${repo}/releases?per_page=100`, '[.[] | {tag_name, published_at, draft}]'),
    pullRequests: api(
      `repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
      '[.[] | {title, created_at, merged_at}]',
    ),
    workflowRuns: api(
      `repos/${repo}/actions/workflows/ci.yml/runs?branch=main&per_page=100`,
      '[.workflow_runs[] | {conclusion, created_at}]',
    ),
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const flag = process.argv.indexOf('--repo');
  const repo = flag > -1 ? process.argv[flag + 1] : process.env.GH_REPO;
  if (!repo) throw new Error('usage: dora.mjs --repo owner/name (or set GH_REPO)');
  console.log(renderDoraTable(computeDora(fetchGitHubData(repo))));
}
