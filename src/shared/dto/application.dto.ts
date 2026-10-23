/** Row shapes of `v_application_list` / `v_up_next`. Keep in sync with the view SQL in drizzle/. */
import type { AgentId, ApplicationStatus, RunStatus } from './enums';

export interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  queueRank: number;
  appliedAt: number | null;
  lastActivityAt: number;
  createdAt: number;
  cvVersionId: string | null;
  postingId: string;
  title: string;
  location: string | null;
  url: string;
  companyId: string;
  companyName: string;
  latestRunId: string | null;
  latestRunStatus: RunStatus | null;
  latestRunAgent: AgentId | null;
}
