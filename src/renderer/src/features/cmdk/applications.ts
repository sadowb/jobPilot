import type { ApplicationListItem, OwnerStatus } from '../../../../shared/dto';
import { isApplied, siteName } from '../dashboard/applications';
import type { JobRecord, JobStatus, SettableStatus } from './jobs';

const STATUS_OF: Partial<Record<ApplicationListItem['status'], JobStatus>> = {
  interviewing: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const OWNER_STATUS: Record<SettableStatus, OwnerStatus> = {
  Submitted: 'applied',
  Interview: 'interviewing',
  Offer: 'offer',
  Rejected: 'rejected',
  Withdrawn: 'withdrawn',
};

export const toOwnerStatus = (status: SettableStatus): OwnerStatus => OWNER_STATUS[status];

const appliedDay = (stamp: number) =>
  new Date(stamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Submitted applications as command-box jobs; queued ones are the crew's and take no owner status. */
export function toJobRecords(items: readonly ApplicationListItem[]): JobRecord[] {
  return items.filter(isApplied).map((item) => ({
    id: item.id,
    company: item.companyName,
    role: item.title,
    ats: siteName(item.url),
    location: item.location ?? '—',
    status: STATUS_OF[item.status] ?? 'Submitted',
    applied: appliedDay(item.appliedAt!),
    critter: 'idle',
  }));
}
