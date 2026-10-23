import { z } from 'zod';
import { Actor, RunEventType } from '../../../shared/dto';

const RunIdSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i);

export const RecordAuditEventSchema = z.object({
  applicationId: z.string().min(1).max(64),
  runId: z.string().min(1).max(64).nullable().optional(),
  type: z.string().min(1).max(128),
  actor: Actor.schema,
  fromStatus: z.string().max(128).nullable().optional(),
  toStatus: z.string().max(128).nullable().optional(),
  payload: z.record(z.string(), z.json()).default({}),
});

export const RunTraceInputSchema = z.object({
  runId: RunIdSchema,
  type: RunEventType.schema,
  payload: z.json(),
});

export type RecordAuditEvent = z.input<typeof RecordAuditEventSchema>;
export type RunTraceInput = z.input<typeof RunTraceInputSchema>;
