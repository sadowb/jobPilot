import { describe, expect, it } from 'vitest';
import type { ApplicationListItem } from '../src/shared/dto';
import { toJobRecords, toOwnerStatus } from '../src/renderer/src/features/cmdk/applications';
import { buildResults, flatten } from '../src/renderer/src/features/cmdk/search';

const item = (over: Partial<ApplicationListItem>): ApplicationListItem => ({
  id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
  status: 'applied',
  queueRank: 1,
  appliedAt: Date.UTC(2026, 9, 19, 12),
  lastActivityAt: 0,
  createdAt: 0,
  cvVersionId: null,
  postingId: 'p1',
  verified: true,
  title: 'Backend Engineer',
  location: 'Remote',
  url: 'https://boards.greenhouse.io/acme/jobs/1',
  companyId: 'c1',
  companyName: 'Acme',
  latestRunId: null,
  latestRunStatus: null,
  latestRunAgent: null,
  ...over,
});

describe('command box jobs from real applications', () => {
  it('lists submitted applications only and maps their fields and status', () => {
    const jobs = toJobRecords([
      item({}),
      item({ id: 'queued', appliedAt: null, status: 'queued', companyName: 'Queued Co' }),
      item({ id: 'iv', status: 'interviewing', companyName: 'Beta' }),
    ]);
    expect(jobs.map((j) => j.company)).toEqual(['Acme', 'Beta']);
    expect(jobs[0]).toMatchObject({
      role: 'Backend Engineer',
      ats: 'Greenhouse',
      location: 'Remote',
      applied: 'Oct 19',
      status: 'Submitted',
    });
    expect(jobs[1]!.status).toBe('Interview');
  });

  it('maps a typed status command to the DTO status the bridge accepts', () => {
    expect(toOwnerStatus('Submitted')).toBe('applied');
    expect(toOwnerStatus('Interview')).toBe('interviewing');
    const jobs = toJobRecords([item({})]);
    const [action] = flatten(buildResults('set acme to interview', jobs));
    expect(action!.intent).toEqual({ type: 'set-status', jobId: jobs[0]!.id, status: 'Interview' });
  });
});
