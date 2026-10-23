import { eq, max, sql } from 'drizzle-orm';
import { db } from '../../platform/db/database';
import { applicationEvent, runEvent } from '../../platform/db/schema';

export function insertAuditEvent(event: {
  applicationId: string;
  runId?: string | null;
  type: string;
  actor: 'owner' | 'agent' | 'system';
  fromStatus?: string | null;
  toStatus?: string | null;
  payload: Record<string, unknown>;
}): void {
  db.insert(applicationEvent)
    .values({
      applicationId: event.applicationId,
      runId: event.runId ?? null,
      type: event.type,
      actor: event.actor,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      data: event.payload,
    })
    .run();
}

export function appendRunEvent(
  runId: string,
  type: 'session' | 'message' | 'tool_call' | 'tool_result' | 'status' | 'cost' | 'error',
  payload: unknown,
) {
  const [last] = db
    .select({ seq: sql<number>`coalesce(${max(runEvent.seq)}, 0)` })
    .from(runEvent)
    .where(eq(runEvent.runId, runId))
    .all();
  const seq = (last?.seq ?? 0) + 1;
  const [row] = db
    .insert(runEvent)
    .values({ runId, seq, type, payload: payload as object })
    .returning({ id: runEvent.id, createdAt: runEvent.createdAt })
    .all();
  if (!row) throw new Error('Failed to persist run event');
  return { id: row.id, seq, createdAt: row.createdAt };
}
