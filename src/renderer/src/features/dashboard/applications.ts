import type { ApplicationListItem } from '../../../../shared/dto';
import type { Application } from './types';
import type { QueueItem } from './upnext/queue';

export const isApplied = (item: ApplicationListItem) => item.appliedAt !== null;

export function queueItem(item: ApplicationListItem): QueueItem {
  return {
    id: item.id,
    company: item.companyName,
    role: item.title,
    site: new URL(item.url).hostname,
    estimateMin: 0,
    source: 'Pasted',
    stage: item.status === 'running' ? 'running' : item.status === 'queued' ? 'queued' : 'waiting',
    agent: item.status === 'running' ? 'work' : 'idle',
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
    site: new URL(item.url).hostname,
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
