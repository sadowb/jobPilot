import { desc, eq, and, inArray } from 'drizzle-orm';
import { ACTIVE_RUN_STATUSES } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { run } from './runs.entity';

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
}
