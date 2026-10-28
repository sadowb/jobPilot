import { eq } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { settings } from './settings.entity';

const key = 'profile.localStorageMigration.v1';

export class SettingsRepository {
  constructor(private readonly db: JobPilotDb) {}

  getSetting(key: string): unknown {
    return this.db.select().from(settings).where(eq(settings.key, key)).get()?.value;
  }

  setSetting(key: string, value: unknown): void {
    this.db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: Date.now() } })
      .run();
  }

  anthropicKey(): unknown {
    return this.getSetting('secrets.anthropic');
  }

  storeAnthropicKey(encrypted: string): void {
    this.setSetting('secrets.anthropic', encrypted);
  }

  removeAnthropicKey(): void {
    this.db.delete(settings).where(eq(settings.key, 'secrets.anthropic')).run();
  }

  agentPreferences(): unknown {
    return this.getSetting('agents.claude');
  }

  storeAgentPreferences(value: unknown): void {
    this.setSetting('agents.claude', value);
  }

  hasAnthropicKey(): boolean {
    return this.anthropicKey() !== undefined;
  }

  applyConcurrency(): unknown {
    return this.getSetting('runs.concurrency');
  }

  storeApplyConcurrency(value: number): void {
    this.setSetting('runs.concurrency', value);
  }

  autopilot(): unknown {
    return this.getSetting('runs.autopilot');
  }

  storeAutopilot(value: boolean): void {
    this.setSetting('runs.autopilot', value);
  }

  submitMode(): unknown {
    return this.getSetting('runs.submitMode');
  }

  storeSubmitMode(value: string): void {
    this.setSetting('runs.submitMode', value);
  }

  sites(): unknown {
    return this.getSetting('runs.sites');
  }

  storeSites(value: unknown): void {
    this.setSetting('runs.sites', value);
  }

  limits(): unknown {
    return this.getSetting('runs.limits');
  }

  storeLimits(value: unknown): void {
    this.setSetting('runs.limits', value);
  }

  runTimeoutMs(): unknown {
    return this.getSetting('runs.timeoutMs');
  }

  profileMigrationValue(): unknown {
    return this.getSetting(key);
  }

  markProfileMigrated(): void {
    this.db.insert(settings).values({ key, value: true }).onConflictDoNothing().run();
  }
}
