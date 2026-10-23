import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const boards = JSON.parse(await readFile(new URL('../e2e/live-boards.json', import.meta.url), 'utf8'));
const drift = (message) => Object.assign(new Error(message), { kind: 'schema drift' });
const gone = (message) => Object.assign(new Error(message), { kind: 'board/listing gone' });
const get = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 404) throw gone(`public listing returned HTTP ${response.status}`);
  if (!response.ok) throw drift(`public listing endpoint returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw drift('public listing response was not JSON');
  }
};

async function listing(board) {
  switch (board.ats) {
    case 'greenhouse': {
      const data = await get(`https://boards-api.greenhouse.io/v1/boards/${board.tenant}/jobs`);
      if (!Array.isArray(data.jobs)) throw drift('Greenhouse listing did not contain jobs');
      const item = data.jobs?.[0];
      if (!data.jobs.length) throw gone('public board has no current jobs');
      if (!item?.absolute_url) throw drift('Greenhouse listing item did not contain absolute_url');
      return item.absolute_url;
    }
    case 'lever': {
      const data = await get(`https://api.lever.co/v0/postings/${board.tenant}?mode=json`);
      if (!Array.isArray(data)) throw drift('Lever listing was not an array');
      const item = data[0];
      if (!data.length) throw gone('public board has no current jobs');
      if (!item?.hostedUrl) throw drift('Lever listing item did not contain hostedUrl');
      return item.hostedUrl;
    }
    case 'ashby': {
      const data = await get(`https://api.ashbyhq.com/posting-api/job-board/${board.tenant}?includeCompensation=true`);
      if (!Array.isArray(data.jobs)) throw drift('Ashby listing did not contain jobs');
      const item = data.jobs?.find((job) => job.isListed && job.jobUrl);
      if (!data.jobs.length) throw gone('public board has no current jobs');
      if (!item) throw drift('Ashby listing had no current jobUrl');
      return item.jobUrl;
    }
    case 'workable': {
      const data = await get(`https://apply.workable.com/api/v1/widget/accounts/${board.tenant}?details=true`);
      if (!Array.isArray(data.jobs)) throw drift('Workable listing did not contain jobs');
      const item = data.jobs?.find((job) => job.shortcode);
      if (!data.jobs.length) throw gone('public board has no current jobs');
      if (!item) throw drift('Workable listing item did not contain shortcode');
      return `https://apply.workable.com/${board.tenant}/j/${item.shortcode}`;
    }
    case 'smartrecruiters': {
      const data = await get(`https://api.smartrecruiters.com/v1/companies/${board.tenant}/postings?limit=100`);
      if (!Array.isArray(data.content)) throw drift('SmartRecruiters listing did not contain content');
      const item = data.content?.[0];
      if (!data.content.length) throw gone('public board has no current jobs');
      if (!item?.id) throw drift('SmartRecruiters listing item did not contain id');
      const slug = encodeURIComponent(item.name ?? 'job');
      return `https://jobs.smartrecruiters.com/${board.tenant}/${item.id}-${slug}`;
    }
    case 'bamboohr': {
      const data = await get(`https://${board.tenant}.bamboohr.com/careers/list`);
      if (!Array.isArray(data.result)) throw drift('BambooHR listing did not contain result');
      const item = data.result?.[0];
      if (!data.result.length) throw gone('public board has no current jobs');
      if (!item?.id) throw drift('BambooHR listing item did not contain id');
      return `https://${board.tenant}.bamboohr.com/careers/${item.id}`;
    }
    default:
      throw new Error(`unsupported ATS ${board.ats}`);
  }
}

const results = [];
for (const board of boards) {
  let url = null;
  try {
    url = await listing(board);
    const result = spawnSync('npm', ['run', '--silent', 'postings:probe', '--', url], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`schema drift: postings:probe failed: ${result.stderr.trim()}`);
    const posting = JSON.parse(result.stdout);
    const failures = [];
    if (posting.ats !== board.ats) failures.push(`ATS mismatch: ${posting.ats}`);
    if (!posting.title?.trim()) failures.push('title is empty');
    if (!posting.company?.trim()) failures.push('company is empty');
    if (!posting.canonical_url || new URL(posting.canonical_url).hostname !== new URL(url).hostname)
      failures.push('canonical_url is missing or points to another host');
    if (board.questions && (!Array.isArray(posting.questions) || posting.questions.length < 1))
      failures.push('questions are missing for an ATS that exposes application questions');
    if (failures.length) throw new Error(`schema drift: ${failures.join('; ')}`);
    results.push({
      ats: board.ats,
      status: 'passed',
      url,
      title: posting.title,
      company: posting.company,
      questions: posting.questions?.length ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      ats: board.ats,
      status: 'failed',
      kind: error?.kind ?? 'schema drift',
      url,
      message,
    });
  }
}

await writeFile(new URL('../live-probe-results.json', import.meta.url), `${JSON.stringify({ results }, null, 2)}\n`);
for (const result of results)
  process.stdout.write(
    `${result.ats}: ${result.status}${result.status === 'failed' ? ` (${result.kind}: ${result.message})` : ` — ${result.title}`}\n`,
  );
if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
