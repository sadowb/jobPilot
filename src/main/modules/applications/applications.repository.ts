import { and, asc, eq, isNull, max } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import type { ApplicationListItem, OwnerStatus } from '../../../shared/dto';
import { application, applicationAnswer, vApplicationList } from './applications.entity';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

/** Run states that mean work or an owner decision is pending on the application. */
const LIVE_RUN: ReadonlySet<string> = new Set(['queued', 'running', 'awaiting_approval', 'needs_you']);

export class ApplicationsRepository {
  constructor(private readonly db: JobPilotDb) {}

  list(): ApplicationListItem[] {
    return this.db.select().from(vApplicationList).orderBy(asc(vApplicationList.queueRank)).all();
  }

  hasPosting(postingId: string): boolean {
    return !!this.db
      .select({ id: application.id })
      .from(application)
      .where(and(eq(application.postingId, postingId), isNull(application.deletedAt)))
      .get();
  }

  /** Only an application that was submitted can take an owner outcome; a queued or running one is the crew's. */
  setStatus(
    id: string,
    status: OwnerStatus,
    recordChange: (from: string) => void,
  ): { item: ApplicationListItem; changed: boolean } {
    return this.db.transaction(() => {
      const row = this.db
        .select()
        .from(application)
        .where(and(eq(application.id, id), isNull(application.deletedAt)))
        .get();
      if (!row) throw new UserFacingError('Application not found.');
      if (row.appliedAt === null) throw new UserFacingError('Only a submitted application can change status.');
      const changed = row.status !== status;
      if (changed) {
        this.db.update(application).set({ status, lastActivityAt: Date.now() }).where(eq(application.id, id)).run();
        recordChange(row.status);
      }
      const item = this.db.select().from(vApplicationList).where(eq(vApplicationList.id, id)).get();
      if (!item) throw new UserFacingError('Application is unavailable.');
      return { item, changed };
    });
  }

  /**
   * Soft delete (`deleted_at`): the application leaves the list and no longer counts as tracked, so the same posting
   * can be added again. Idempotent. A submitted application is history and a live run is the crew's: both are refused.
   */
  remove(id: string): boolean {
    return this.db.transaction(() => {
      const row = this.db.select().from(application).where(eq(application.id, id)).get();
      if (!row) throw new UserFacingError('Application not found.');
      if (row.deletedAt !== null) return false;
      if (row.appliedAt !== null) throw new UserFacingError('A submitted application stays in your history.');
      const item = this.db.select().from(vApplicationList).where(eq(vApplicationList.id, id)).get();
      if (item?.latestRunStatus && LIVE_RUN.has(item.latestRunStatus))
        throw new UserFacingError('Cancel the run first, then remove this job.');
      this.db.update(application).set({ deletedAt: Date.now() }).where(eq(application.id, id)).run();
      return true;
    });
  }

  /** Undo of `remove`. Idempotent. */
  restore(id: string): ApplicationListItem {
    return this.db.transaction(() => {
      const row = this.db.select().from(application).where(eq(application.id, id)).get();
      if (!row) throw new UserFacingError('Application not found.');
      if (row.deletedAt !== null)
        this.db.update(application).set({ deletedAt: null }).where(eq(application.id, id)).run();
      const item = this.db.select().from(vApplicationList).where(eq(vApplicationList.id, id)).get();
      if (!item) throw new UserFacingError('Application is unavailable.');
      return item;
    });
  }

  create(postingId: string, recordCreated: (id: string) => void): ApplicationListItem {
    return this.db.transaction(() => {
      const existing = this.db.select().from(application).where(eq(application.postingId, postingId)).get();
      // Re-adding a removed posting brings its application back instead of failing.
      if (existing?.deletedAt != null) {
        this.db.update(application).set({ deletedAt: null }).where(eq(application.id, existing.id)).run();
      }
      let id = existing?.id;
      if (!id) {
        const rank =
          this.db
            .select({ rank: max(application.queueRank) })
            .from(application)
            .get()?.rank ?? 0;
        const row = this.db
          .insert(application)
          .values({ postingId, status: 'queued', queueRank: rank + 1 })
          .returning()
          .get();
        id = row.id;
        recordCreated(id);
      }
      const item = this.db.select().from(vApplicationList).where(eq(vApplicationList.id, id)).get();
      if (!item) throw new UserFacingError('Application is unavailable.');
      return item;
    });
  }

  /** Idempotent: an already applied application keeps its first `appliedAt`. Returns whether it changed. */
  markApplied(id: string, recordChange: (from: string) => void): boolean {
    return this.db.transaction(() => {
      const row = this.db.select().from(application).where(eq(application.id, id)).get();
      if (!row) throw new UserFacingError('Application not found.');
      if (row.appliedAt !== null) return false;
      const now = Date.now();
      this.db
        .update(application)
        .set({ status: 'applied', appliedAt: now, lastActivityAt: now, updatedAt: now })
        .where(eq(application.id, id))
        .run();
      recordChange(row.status);
      return true;
    });
  }

  /** Owner-typed answers to questions a run could not answer. One row per field, the latest answer wins. */
  saveOwnerAnswers(id: string, answers: Array<{ fieldKey: string; questionText: string; answer: string }>): void {
    this.db.transaction(() => {
      for (const { fieldKey, questionText, answer } of answers) {
        this.db
          .insert(applicationAnswer)
          .values({ applicationId: id, fieldKey, questionText, answer, source: 'owner' })
          .onConflictDoUpdate({
            target: [applicationAnswer.applicationId, applicationAnswer.fieldKey],
            set: { answer, questionText, source: 'owner', updatedAt: Date.now() },
          })
          .run();
      }
    });
  }
}
