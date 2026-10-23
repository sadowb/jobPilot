import { eq } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { settings } from './settings.entity';

const key = 'profile.localStorageMigration.v1';

export class SettingsRepository {
  constructor(private readonly db: JobPilotDb) {}

  profileMigrationValue(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, key)).get()?.value;
  }

  markProfileMigrated(): void {
    this.db.insert(settings).values({ key, value: true }).onConflictDoNothing().run();
  }
}
