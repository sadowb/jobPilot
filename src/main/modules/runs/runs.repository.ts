import { desc, eq, and, inArray, sql } from 'drizzle-orm';
import { ACTIVE_RUN_STATUSES } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { approval, run, runEvent } from './runs.entity';

export class RunsRepository {
  constructor(private readonly db: JobPilotDb) {}

  list() {
    return this.db.select().from(run).orderBy(desc(run.createdAt), desc(run.id)).all();
  }

  get(id: string) {
    const row = this.db.select().from(run).where(eq(run.id, id)).get();
    if (!row) throw new Error('Run is unavailable.');
    return row;
  }

  active(applicationId: string) {
    return this.db
      .select()
      .from(run)
      .where(and(eq(run.applicationId, applicationId), inArray(run.status, ACTIVE_RUN_STATUSES)))
      .get();
  }

  latest(applicationId: string) {
    return this.db
      .select()
      .from(run)
      .where(eq(run.applicationId, applicationId))
      .orderBy(desc(run.createdAt), desc(run.id))
      .get();
  }

  /**
   * Claim the oldest queued run for a slot. One synchronous UPDATE, so two slots can never claim the same run.
   * The session id is minted here and kept across re-claims so a restart can resume it.
   */
  claim(sessionId: string) {
    const now = Date.now();
    return this.db
      .update(run)
      .set({
        status: 'running',
        sessionId: sql`coalesce(${run.sessionId}, ${sessionId})`,
        attempts: sql`${run.attempts} + 1`,
        claimedAt: now,
        progressAt: now,
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(run.id, sql`(select id from run where status = 'queued' order by created_at, id limit 1)`))
      .returning()
      .get();
  }

  /** Heartbeat: any agent event counts as progress. */
  touch(id: string) {
    this.db.update(run).set({ progressAt: Date.now() }).where(eq(run.id, id)).run();
  }

  progressAt(id: string) {
    return this.db.select({ at: run.progressAt }).from(run).where(eq(run.id, id)).get()?.at ?? undefined;
  }

  hasSessionEvent(runId: string) {
    return (
      this.db
        .select({ id: runEvent.id })
        .from(runEvent)
        .where(and(eq(runEvent.runId, runId), eq(runEvent.type, 'session')))
        .limit(1)
        .get() !== undefined
    );
  }

  create(values: typeof run.$inferInsert) {
    // Let the partial unique index arbitrate duplicate starts, including competing writers.
    return this.db.insert(run).values(values).onConflictDoNothing().returning().get();
  }

  update(id: string, values: Partial<typeof run.$inferInsert>) {
    return this.db
      .update(run)
      .set({ ...values, updatedAt: Date.now() })
      .where(eq(run.id, id))
      .returning()
      .get()!;
  }

  /** A replaced or cancelled run's pending approval can never be acted on. */
  closeApprovals(runId: string, status: 'expired' | 'rejected') {
    this.db
      .update(approval)
      .set({ status, ...(status === 'rejected' ? { decidedBy: 'owner' as const } : {}), decidedAt: Date.now() })
      .where(and(eq(approval.runId, runId), eq(approval.status, 'pending')))
      .run();
  }

  requestApproval(runId: string, cvVersionId: string | null) {
    const row = this.get(runId);
    if (!row.formHash || row.status !== 'awaiting_approval') throw new Error('Run is not ready for approval.');
    return this.db
      .insert(approval)
      .values({
        runId,
        applicationId: row.applicationId,
        cvVersionId,
        formHash: row.formHash,
        summary: row.result,
      })
      .returning()
      .get();
  }
}
