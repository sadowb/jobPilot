#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);

export function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return 'n/a';
  if (ms < 0) return '0s';
  const sec = ms / 1000;
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

export function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeDeploymentFrequency(releases = [], { now = new Date(), windowDays = 7, trendWeeks = 4 } = {}) {
  const nowMs = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const published = releases.filter((r) => r.published_at && !r.draft);

  const buckets = Array.from({ length: trendWeeks }, () => 0);
  for (const r of published) {
    const t = new Date(r.published_at).getTime();
    const diffDays = (nowMs - t) / dayMs;
    if (diffDays >= 0 && diffDays < trendWeeks * windowDays) {
      const bucketIdx = Math.floor(diffDays / windowDays);
      if (bucketIdx >= 0 && bucketIdx < trendWeeks) {
        buckets[bucketIdx]++;
      }
    }
  }

  const lastWeekCount = buckets[0];
  const chronoBuckets = [...buckets].reverse();
  const total = buckets.reduce((a, b) => a + b, 0);
  const avg = total / trendWeeks;

  return {
    lastWeekCount,
    chronoBuckets,
    total,
    avg,
    lastWeekFormatted: `${lastWeekCount}/week`,
    trendFormatted: `${avg.toFixed(1)}/week (${chronoBuckets.join(', ')})`,
  };
}

export function computeLeadTime(
  pullRequests = [],
  releases = [],
  { now = new Date(), windowDays = 7, trendWeeks = 4 } = {},
) {
  const nowMs = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = windowDays * dayMs;
  const totalMs = trendWeeks * weekMs;

  const publishedReleases = releases
    .filter((r) => r.published_at && !r.draft)
    .map((r) => ({ ...r, publishedMs: new Date(r.published_at).getTime() }))
    .sort((a, b) => a.publishedMs - b.publishedMs);

  const mergedPRs = pullRequests
    .filter((p) => p.merged_at)
    .map((p) => {
      const createdMs = new Date(p.created_at).getTime();
      const mergedMs = new Date(p.merged_at).getTime();
      const openToMergeMs = mergedMs - createdMs;

      const firstRelease = publishedReleases.find((r) => r.publishedMs >= mergedMs);
      const mergeToReleaseMs = firstRelease ? firstRelease.publishedMs - mergedMs : null;

      return {
        ...p,
        createdMs,
        mergedMs,
        openToMergeMs,
        mergeToReleaseMs,
      };
    });

  const lastWeekPRs = mergedPRs.filter((p) => p.mergedMs >= nowMs - weekMs && p.mergedMs <= nowMs);
  const medianOpenToMergeLastWeek = median(lastWeekPRs.map((p) => p.openToMergeMs));
  const medianMergeToReleaseLastWeek = median(lastWeekPRs.map((p) => p.mergeToReleaseMs).filter((v) => v !== null));

  const fourWeekPRs = mergedPRs.filter((p) => p.mergedMs >= nowMs - totalMs && p.mergedMs <= nowMs);
  const medianOpenToMerge4w = median(fourWeekPRs.map((p) => p.openToMergeMs));
  const medianMergeToRelease4w = median(fourWeekPRs.map((p) => p.mergeToReleaseMs).filter((v) => v !== null));

  const formatPair = (openMerge, mergeRel) => {
    return `PR: ${formatDuration(openMerge)}, release: ${formatDuration(mergeRel)}`;
  };

  return {
    lastWeek: {
      medianOpenToMergeMs: medianOpenToMergeLastWeek,
      medianMergeToReleaseMs: medianMergeToReleaseLastWeek,
      formatted: formatPair(medianOpenToMergeLastWeek, medianMergeToReleaseLastWeek),
    },
    trend: {
      medianOpenToMergeMs: medianOpenToMerge4w,
      medianMergeToReleaseMs: medianMergeToRelease4w,
      formatted: formatPair(medianOpenToMerge4w, medianMergeToRelease4w),
    },
  };
}

export function isFixRelease(rel, prevRel) {
  const text = `${rel.tag_name || ''} ${rel.name || ''} ${rel.body || ''}`;
  if (/\b(?:bug\s*fix|hotfix|fix|fixes)\b/i.test(text)) return true;
  if (prevRel?.tag_name && rel.tag_name) {
    const prevMatch = prevRel.tag_name.match(/v?(\d+)\.(\d+)\.(\d+)/);
    const currMatch = rel.tag_name.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (prevMatch && currMatch) {
      if (
        prevMatch[1] === currMatch[1] &&
        prevMatch[2] === currMatch[2] &&
        Number(currMatch[3]) > Number(prevMatch[3])
      ) {
        return true;
      }
    }
  }
  return false;
}

export function isRevertPR(pr) {
  return /\brevert\b/i.test(pr.title || '');
}

export function computeChangeFailureRate(
  releases = [],
  pullRequests = [],
  { now = new Date(), windowDays = 7, trendWeeks = 4 } = {},
) {
  const nowMs = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = windowDays * dayMs;
  const totalMs = trendWeeks * weekMs;
  const sevenDaysMs = 7 * dayMs;

  const publishedReleases = releases
    .filter((r) => r.published_at && !r.draft)
    .map((r) => ({ ...r, publishedMs: new Date(r.published_at).getTime() }))
    .sort((a, b) => a.publishedMs - b.publishedMs);

  const mergedPRs = pullRequests
    .filter((p) => p.merged_at)
    .map((p) => ({ ...p, mergedMs: new Date(p.merged_at).getTime() }));

  function checkReleaseFailed(rel, idx) {
    const t = rel.publishedMs;
    const windowEnd = t + sevenDaysMs;

    for (let j = idx + 1; j < publishedReleases.length; j++) {
      const nextRel = publishedReleases[j];
      if (nextRel.publishedMs > windowEnd) break;
      if (nextRel.publishedMs > t && isFixRelease(nextRel, rel)) {
        return true;
      }
    }

    for (const pr of mergedPRs) {
      if (pr.mergedMs > t && pr.mergedMs <= windowEnd && isRevertPR(pr)) {
        return true;
      }
    }

    return false;
  }

  const lastWeekReleases = publishedReleases.filter((r) => r.publishedMs >= nowMs - weekMs && r.publishedMs <= nowMs);
  let lastWeekFailures = 0;
  for (const r of lastWeekReleases) {
    const idx = publishedReleases.indexOf(r);
    if (checkReleaseFailed(r, idx)) lastWeekFailures++;
  }

  const fourWeekReleases = publishedReleases.filter((r) => r.publishedMs >= nowMs - totalMs && r.publishedMs <= nowMs);
  let fourWeekFailures = 0;
  for (const r of fourWeekReleases) {
    const idx = publishedReleases.indexOf(r);
    if (checkReleaseFailed(r, idx)) fourWeekFailures++;
  }

  const formatRate = (failures, total) => {
    if (total === 0) return 'n/a (no releases)';
    return `${((failures / total) * 100).toFixed(1)}%`;
  };

  return {
    lastWeek: {
      failures: lastWeekFailures,
      total: lastWeekReleases.length,
      formatted: formatRate(lastWeekFailures, lastWeekReleases.length),
    },
    trend: {
      failures: fourWeekFailures,
      total: fourWeekReleases.length,
      formatted: formatRate(fourWeekFailures, fourWeekReleases.length),
    },
  };
}

export function computeTimeToRestore(workflowRuns = [], { now = new Date(), windowDays = 7, trendWeeks = 4 } = {}) {
  const nowMs = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = windowDays * dayMs;
  const totalMs = trendWeeks * weekMs;

  const sortedRuns = [...workflowRuns]
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const incidents = [];
  let incidentStart = null;

  for (const run of sortedRuns) {
    const t = new Date(run.created_at).getTime();
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
      if (incidentStart === null) {
        incidentStart = t;
      }
    } else if (run.conclusion === 'success') {
      if (incidentStart !== null) {
        incidents.push({
          start: incidentStart,
          end: t,
          durationMs: t - incidentStart,
        });
        incidentStart = null;
      }
    }
  }

  const lastWeekIncidents = incidents.filter((i) => i.start >= nowMs - weekMs && i.start <= nowMs);
  const lastWeekDurations = lastWeekIncidents.map((i) => i.durationMs);
  const medianLastWeek = median(lastWeekDurations);

  const fourWeekIncidents = incidents.filter((i) => i.start >= nowMs - totalMs && i.start <= nowMs);
  const fourWeekDurations = fourWeekIncidents.map((i) => i.durationMs);
  const median4w = median(fourWeekDurations);

  const formatTTR = (med) => {
    if (med === null || med === undefined) return 'n/a (no red runs)';
    return formatDuration(med);
  };

  return {
    lastWeek: {
      count: lastWeekIncidents.length,
      medianMs: medianLastWeek,
      formatted: formatTTR(medianLastWeek),
    },
    trend: {
      count: fourWeekIncidents.length,
      medianMs: median4w,
      formatted: formatTTR(median4w),
    },
  };
}

export function computeDoraMetrics({ releases = [], pullRequests = [], workflowRuns = [], now = new Date() } = {}) {
  const depFreq = computeDeploymentFrequency(releases, { now });
  const leadTime = computeLeadTime(pullRequests, releases, { now });
  const cfr = computeChangeFailureRate(releases, pullRequests, { now });
  const ttr = computeTimeToRestore(workflowRuns, { now });

  return {
    deploymentFrequency: {
      lastWeek: depFreq.lastWeekFormatted,
      trend: depFreq.trendFormatted,
      raw: depFreq,
    },
    leadTime: {
      lastWeek: leadTime.lastWeek.formatted,
      trend: leadTime.trend.formatted,
      raw: leadTime,
    },
    changeFailureRate: {
      lastWeek: cfr.lastWeek.formatted,
      trend: cfr.trend.formatted,
      raw: cfr,
    },
    timeToRestore: {
      lastWeek: ttr.lastWeek.formatted,
      trend: ttr.trend.formatted,
      raw: ttr,
    },
  };
}

export function renderDoraTable(metrics) {
  return [
    '| Metric | Last week | 4-week trend |',
    '| --- | --- | --- |',
    `| Deployment frequency | ${metrics.deploymentFrequency.lastWeek} | ${metrics.deploymentFrequency.trend} |`,
    `| Lead time for changes | ${metrics.leadTime.lastWeek} | ${metrics.leadTime.trend} |`,
    `| Change failure rate | ${metrics.changeFailureRate.lastWeek} | ${metrics.changeFailureRate.trend} |`,
    `| Time to restore | ${metrics.timeToRestore.lastWeek} | ${metrics.timeToRestore.trend} |`,
  ].join('\n');
}

export async function fetchGitHubData(repo, { gh = execFileAsync } = {}) {
  let releases;
  try {
    const { stdout } = await gh('gh', [
      'api',
      `repos/${repo}/releases?per_page=100`,
      '--jq',
      '[.[] | {id, tag_name, name, body, published_at, draft}]',
    ]);
    releases = JSON.parse(stdout);
  } catch {
    releases = [];
  }

  let pullRequests;
  try {
    const { stdout } = await gh('gh', [
      'api',
      `repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
      '--jq',
      '[.[] | {number, created_at, merged_at, title, merge_commit_sha}]',
    ]);
    pullRequests = JSON.parse(stdout);
  } catch {
    pullRequests = [];
  }

  let workflowRuns;
  try {
    const { stdout } = await gh('gh', [
      'api',
      `repos/${repo}/actions/workflows/ci.yml/runs?branch=main&per_page=100`,
      '--jq',
      '[.workflow_runs[] | {id, status, conclusion, created_at, run_started_at}]',
    ]);
    workflowRuns = JSON.parse(stdout);
  } catch {
    try {
      const { stdout } = await gh('gh', [
        'api',
        `repos/${repo}/actions/runs?branch=main&per_page=100`,
        '--jq',
        '[.workflow_runs[] | {id, status, conclusion, created_at, run_started_at}]',
      ]);
      workflowRuns = JSON.parse(stdout);
    } catch {
      workflowRuns = [];
    }
  }

  return { releases, pullRequests, workflowRuns };
}

async function main() {
  const args = process.argv.slice(2);
  let repo = process.env.GH_REPO || 'sadowb/jobPilot';
  let until = new Date();
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' || args[i] === '-r') {
      repo = args[++i];
    } else if (args[i] === '--until') {
      until = new Date(args[++i]);
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  const data = await fetchGitHubData(repo);
  const metrics = computeDoraMetrics({
    releases: data.releases,
    pullRequests: data.pullRequests,
    workflowRuns: data.workflowRuns,
    now: until,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(renderDoraTable(metrics));
  }
}

const isEntrypoint = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isEntrypoint) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
