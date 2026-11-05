import { ulid } from 'ulid';
import { PreferenceSchema, type Preference } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { SettingsRepository } from '../settings/settings.repository';
import { asData } from '../inbox/chat-context';

const KEY = 'chat.preferences';
const MAX_PREFERENCES = 20;

/**
 * The owner's standing preferences ("remote roles only", "never relocate"), saved by Cap after the owner states them
 * and shown with an Undo. They are hints for every job's fill, ranked like notes: below the owner's answers and profile.
 * One `work_mode` and one `locations` at a time (a new one replaces the old); `rule`s accumulate.
 */
export class PreferencesService {
  private readonly settings: SettingsRepository;

  constructor(db: JobPilotDb) {
    this.settings = new SettingsRepository(db);
  }

  list(): Preference[] {
    const raw = this.settings.getSetting(KEY);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const parsed = PreferenceSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  }

  /** Saves a preference and returns it; returns the existing one when the same value is already saved. */
  add(kind: Preference['kind'], value: string): Preference {
    const next = PreferenceSchema.parse({ id: ulid(), kind, value: value.trim(), createdAt: Date.now() });
    const current = this.list();
    const same = current.find((p) => p.kind === kind && p.value.toLowerCase() === next.value.toLowerCase());
    if (same) return same;
    const kept = current.filter((p) => kind === 'rule' || p.kind !== kind);
    this.settings.setSetting(KEY, [...kept, next].slice(-MAX_PREFERENCES));
    return next;
  }

  /** Takes a saved preference back; false when it is already gone (undo is idempotent). */
  remove(id: string): boolean {
    const current = this.list();
    const next = current.filter((p) => p.id !== id);
    if (next.length === current.length) return false;
    this.settings.setSetting(KEY, next);
    return true;
  }

  /** The preferences as lines for a prompt, oldest first. */
  promptLines(): string[] {
    return this.list().map(
      (p) =>
        `${p.kind === 'work_mode' ? 'Work mode' : p.kind === 'locations' ? 'Locations' : 'Rule'}: ${asData(p.value, 300)}`,
    );
  }
}

/** Why a posting conflicts with the preferences (shown to Cap as a fact, never used to skip a job silently). */
export function preferenceFlags(
  preferences: readonly Preference[],
  posting: { location: string | null; title: string },
): string[] {
  const flags: string[] = [];
  const where = `${posting.location ?? ''} ${posting.title}`.toLowerCase();
  const mode = preferences.find((p) => p.kind === 'work_mode')?.value;
  if (mode === 'remote' && posting.location !== null && !/remote|anywhere|distributed/.test(where))
    flags.push('not marked remote, but the owner wants remote roles only');
  if (mode === 'onsite' && /\bremote\b/.test(where)) flags.push('remote role, but the owner wants on-site roles');
  return flags;
}
