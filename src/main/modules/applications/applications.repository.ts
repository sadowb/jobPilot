import { and, asc, eq, isNull, max } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import type { ApplicationListItem, OwnerStatus } from '../../../shared/dto';
import { application, vApplicationList } from './applications.entity';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

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
}
