import { asc, eq, max } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import type { ApplicationListItem } from '../../../shared/dto';
import { application, vApplicationList } from './applications.entity';

export class ApplicationsRepository {
  constructor(private readonly db: JobPilotDb) {}

  list(): ApplicationListItem[] {
    return this.db.select().from(vApplicationList).orderBy(asc(vApplicationList.queueRank)).all();
  }

  create(postingId: string, recordCreated: (id: string) => void): ApplicationListItem {
    return this.db.transaction(() => {
      const existing = this.db.select().from(application).where(eq(application.postingId, postingId)).get();
      if (existing?.deletedAt != null) throw new Error('This application has been removed.');
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
      if (!item) throw new Error('Application is unavailable.');
      return item;
    });
  }
}
