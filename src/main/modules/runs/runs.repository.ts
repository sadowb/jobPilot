import { desc, eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { ACTIVE_RUN_STATUSES } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import * as schema from '../../platform/db/schema';
import { approval, run, runEvent } from './runs.entity';
import type { ApprovalSummary } from '../../../shared/dto';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

export class RunsRepository {
  constructor(private readonly db: JobPilotDb) {}

  list() {
    return this.db.select().from(run).orderBy(desc(run.createdAt), desc(run.id)).all();
  }

  get(id: string) {
    const row = this.db.select().from(run).where(eq(run.id, id)).get();
    if (!row) throw new UserFacingError('Run is unavailable.');
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

  requestApproval(runId: string, cvVersionId: string | null, summary: ApprovalSummary) {
    const row = this.get(runId);
    if (!row.formHash || row.status !== 'awaiting_approval')
      throw new UserFacingError('Run is not ready for approval.');
    return this.db
      .insert(approval)
      .values({ runId, applicationId: row.applicationId, cvVersionId, formHash: row.formHash, summary })
      .returning()
      .get();
  }

  approval(id: string) {
    const row = this.db.select().from(approval).where(eq(approval.id, id)).get();
    if (!row) throw new UserFacingError('Approval is unavailable.');
    return row;
  }

  /** The newest approval of a run (a run holds at most one live one). */
  latestApproval(runId: string) {
    return this.db
      .select()
      .from(approval)
      .where(eq(approval.runId, runId))
      .orderBy(desc(approval.createdAt), desc(approval.id))
      .get();
  }

  /**
   * The owner's decision, once: only a `pending` approval can be decided, so a double click or a stale card changes
   * nothing. Returns the row when this call decided it.
   */
  decide(id: string, status: 'approved' | 'rejected' | 'expired', decidedBy: 'owner' | null) {
    return this.db
      .update(approval)
      .set({ status, decidedBy, decidedAt: Date.now(), updatedAt: Date.now() })
      .where(and(eq(approval.id, id), eq(approval.status, 'pending')))
      .returning()
      .get();
  }

  /** An approved approval that never reached a click can no longer be used. */
  expire(id: string) {
    this.db
      .update(approval)
      .set({ status: 'expired', decidedAt: Date.now(), updatedAt: Date.now() })
      .where(and(eq(approval.id, id), inArray(approval.status, ['pending', 'approved'])))
      .run();
  }

  /**
   * Durable, at-most-once claim of the submit click for an approved approval. One synchronous conditional UPDATE: the
   * second caller, a retry or a restarted run, gets false and must not click.
   */
  claimSubmit(id: string): boolean {
    const now = Date.now();
    return (
      this.db
        .update(approval)
        .set({ submitClaimedAt: now, updatedAt: now })
        .where(and(eq(approval.id, id), eq(approval.status, 'approved'), isNull(approval.submitClaimedAt)))
        .returning({ id: approval.id })
        .get() !== undefined
    );
  }

  /** Approvals the owner can still act on (pending) or that are being submitted right now (approved, run not finished). */
  openApprovals() {
    return this.db
      .select({
        approval,
        cvName: schema.document.name,
        cvFileName: schema.documentVersion.fileName,
        cvMime: schema.documentVersion.mime,
        cvSizeBytes: schema.documentVersion.sizeBytes,
      })
      .from(approval)
      .innerJoin(run, eq(run.id, approval.runId))
      .leftJoin(schema.documentVersion, eq(schema.documentVersion.id, approval.cvVersionId))
      .leftJoin(schema.document, eq(schema.document.id, schema.documentVersion.documentId))
      .where(and(eq(run.status, 'awaiting_approval'), inArray(approval.status, ['pending', 'approved'])))
      .orderBy(desc(approval.createdAt), desc(approval.id))
      .all();
  }

  needsYou() {
    return this.db
      .select()
      .from(run)
      .where(eq(run.status, 'needs_you'))
      .orderBy(desc(run.updatedAt), desc(run.id))
      .all();
  }
}
