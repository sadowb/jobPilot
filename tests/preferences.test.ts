import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import { PreferencesService, preferenceFlags } from '../src/main/modules/cap/preferences';
import { notesPromptLines } from '../src/main/modules/inbox/notes-precedence';

let db: JobPilotDb;
let sqlite: Database.Database;
beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
});

describe('preferences store', () => {
  it('keeps one work mode and one locations value, lets rules accumulate, and dedupes', () => {
    const prefs = new PreferencesService(db);
    prefs.add('work_mode', 'remote');
    prefs.add('work_mode', 'hybrid');
    prefs.add('locations', 'Lisbon');
    prefs.add('rule', 'No cover letters');
    prefs.add('rule', 'Short answers');
    prefs.add('rule', 'short answers');
    expect(prefs.promptLines()).toEqual([
      'Work mode: hybrid',
      'Locations: Lisbon',
      'Rule: No cover letters',
      'Rule: Short answers',
    ]);
  });

  it('rejects an unknown work mode and ignores corrupt stored rows', () => {
    const prefs = new PreferencesService(db);
    expect(() => prefs.add('work_mode', 'whenever')).toThrow();
    prefs.add('rule', 'Keep it brief');
    sqlite.prepare('UPDATE settings SET value = json(\'[{"id":1},{"x":2}]\') WHERE key = \'chat.preferences\'').run();
    expect(prefs.list()).toEqual([]);
  });

  it('undo removes only that preference, and twice is harmless', () => {
    const prefs = new PreferencesService(db);
    const a = prefs.add('rule', 'A');
    prefs.add('rule', 'B');
    expect(prefs.remove(a.id)).toBe(true);
    expect(prefs.remove(a.id)).toBe(false);
    expect(prefs.promptLines()).toEqual(['Rule: B']);
  });

  it('flags a posting that is not remote for a remote-only owner, never an unknown location', () => {
    const remote = [new PreferencesService(db).add('work_mode', 'remote')];
    expect(preferenceFlags(remote, { location: 'Philadelphia, PA', title: 'Data Scientist' })).toHaveLength(1);
    expect(preferenceFlags(remote, { location: 'Remote - US', title: 'Data Scientist' })).toEqual([]);
    expect(preferenceFlags(remote, { location: null, title: 'Data Scientist' })).toEqual([]);
  });

  it('puts preferences in the run prompt as hints that rank with notes', () => {
    const lines = notesPromptLines([], [], ['Work mode: remote']).join('\n');
    expect(lines).toContain('standing preferences');
    expect(lines).toContain('Work mode: remote');
    expect(lines).toMatch(/Precedence, highest first/);
  });
});
