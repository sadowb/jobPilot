/** DTO for the application list SQL view. */
import { z } from 'zod';
import { AgentId, ApplicationStatus, RunStatus } from './enums';

export const ApplicationListItemSchema = z.object({
  id: z.string(),
  status: ApplicationStatus.schema,
  queueRank: z.number().int(),
  appliedAt: z.number().nullable(),
  lastActivityAt: z.number(),
  createdAt: z.number(),
  cvVersionId: z.string().nullable(),
  postingId: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  url: z.string(),
  verified: z.boolean(),
  companyId: z.string(),
  companyName: z.string(),
  latestRunId: z.string().nullable(),
  latestRunStatus: RunStatus.schema.nullable(),
  latestRunAgent: AgentId.schema.nullable(),
});
export type ApplicationListItem = z.infer<typeof ApplicationListItemSchema>;
/** Outcomes the owner can record on an application that was already submitted. */
export const OwnerStatusSchema = z.enum(['applied', 'interviewing', 'offer', 'rejected', 'withdrawn']);
export type OwnerStatus = z.infer<typeof OwnerStatusSchema>;
export const SetApplicationStatusSchema = z.object({ id: z.ulid(), status: OwnerStatusSchema });
export type SetApplicationStatusInput = z.infer<typeof SetApplicationStatusSchema>;
export const CreateApplicationSchema = z.object({ postingId: z.ulid() });
