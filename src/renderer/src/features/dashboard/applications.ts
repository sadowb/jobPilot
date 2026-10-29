import type { ApplicationListItem } from '../../../../shared/dto';
import type { Application } from './types';
import type { QueueItem } from './upnext/queue';

const ATS_HOSTS: [string, string][] = [
  ['greenhouse.io', 'Greenhouse'],
  ['lever.co', 'Lever'],
  ['ashbyhq.com', 'Ashby'],
  ['workable.com', 'Workable'],
  ['smartrecruiters.com', 'SmartRecruiters'],
  ['bamboohr.com', 'BambooHR'],
];
/** ATS display name for known hosts, the raw host otherwise. */
const siteName = (url: string) => {
  const host = new URL(url).hostname;
  return ATS_HOSTS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
};

export const isApplied = (item: ApplicationListItem) => item.appliedAt !== null;

/** The latest run drives the row: a running run is NOW, a stopped one waits for the owner. */
function queueStage(item: ApplicationListItem): QueueItem['stage'] {
  switch (item.latestRunStatus) {
    case 'running':
      return 'running';
    case 'awaiting_approval':
    case 'needs_you':
      return 'waiting';
    default:
      return item.status === 'running' ? 'running' : item.status === 'queued' ? 'queued' : 'waiting';
  }
}

export function queueItem(item: ApplicationListItem): QueueItem {
  return {
    id: item.id,
    company: item.companyName,
    role: item.title,
    site: siteName(item.url),
    hint: item.location ?? undefined,
    estimateMin: 0,
    source: 'Pasted',
    stage: queueStage(item),
    ...(item.verified ? {} : { unverifiedPostingId: item.postingId }),
    agent: item.latestRunStatus === 'running' ? 'work' : 'idle',
  };
}

export function appliedItem(item: ApplicationListItem): Application {
  const day = (stamp: number) => new Date(stamp).toISOString().slice(0, 10);
  return {
    id: item.id,
    company: item.companyName,
    role: item.title,
    location: item.location ?? '—',
    workMode: '—',
    status:
      item.status === 'interviewing'
        ? 'interview'
        : item.status === 'offer' || item.status === 'rejected' || item.status === 'withdrawn'
          ? item.status
          : 'submitted',
    statusSource: 'agent',
    statusSetOn: day(item.lastActivityAt),
    salary: '—',
    site: siteName(item.url),
    appliedOn: day(item.appliedAt ?? item.createdAt),
    agent: 'done',
    postingUrl: item.url,
    detail: {
      jobType: '—',
      level: '—',
      followUpOn: null,
      sponsorship: '—',
      cvName: '—',
      cvMeta: '',
      description: '',
      notes: '',
      timeline: [],
    },
  };
}
