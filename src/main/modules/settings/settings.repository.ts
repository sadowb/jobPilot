import { eq } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { settings } from './settings.entity';

const key = 'profile.localStorageMigration.v1';

export class SettingsRepository {
  constructor(private readonly db: JobPilotDb) {}

  anthropicKey(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, 'secrets.anthropic')).get()?.value;
  }

  storeAnthropicKey(encrypted: string): void {
    this.db
      .insert(settings)
      .values({ key: 'secrets.anthropic', value: encrypted })
      .onConflictDoUpdate({ target: settings.key, set: { value: encrypted, updatedAt: Date.now() } })
      .run();
  }

  removeAnthropicKey(): void {
    this.db.delete(settings).where(eq(settings.key, 'secrets.anthropic')).run();
  }

  agentPreferences(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, 'agents.claude')).get()?.value;
  }

  storeAgentPreferences(value: unknown): void {
    this.db
      .insert(settings)
      .values({ key: 'agents.claude', value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: Date.now() } })
      .run();
  }

  hasAnthropicKey(): boolean {
    return this.anthropicKey() !== undefined;
  }

  applyConcurrency(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, 'runs.concurrency')).get()?.value;
  }

  runTimeoutMs(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, 'runs.timeoutMs')).get()?.value;
  }

  profileMigrationValue(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, key)).get()?.value;
  }

  markProfileMigrated(): void {
    this.db.insert(settings).values({ key, value: true }).onConflictDoNothing().run();
  }

  lastConsolidation(): unknown {
    return this.db.select().from(settings).where(eq(settings.key, 'memory.lastConsolidatedAt')).get()?.value;
  }

  markConsolidated(at: number): void {
    this.db
      .insert(settings)
      .values({ key: 'memory.lastConsolidatedAt', value: at })
      .onConflictDoUpdate({ target: settings.key, set: { value: at, updatedAt: Date.now() } })
      .run();
  }
}
