import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, describe, expect, it } from 'vitest';
import { claudeVersion, detectClaude } from '../src/main/platform/agents/detect';
import { AgentSettingsService } from '../src/main/modules/settings/agent.service';
import * as schema from '../src/main/platform/db/schema';
import type { JobPilotDb } from '../src/main/platform/db/database';
import {
  matchesDocumentSignature,
  PersonalProfileSchema,
  ProfileSaveSchema,
  SaveAgentSchema,
  SaveDocumentInputSchema,
} from '../src/shared/dto';
import { EMPTY_PROFILE } from '../src/renderer/src/features/profile/personal';

const dir = mkdtempSync(join(tmpdir(), 'jobpilot-detect-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
function script(name: string, output: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\nprintf '%s\\n' '${output}'\n`);
  chmodSync(path, 0o700);
  return path;
}

describe.skipIf(process.platform === 'win32')('agent detection', () => {
  it('accepts only Claude Code version output', async () => {
    expect(claudeVersion('2.1.303 (Claude Code)\n')).toBe('2.1.303 (Claude Code)');
    for (const bad of ['', 'fixture version', 'rm -rf /', '2.1.303', '2.1.303 (Other Tool)', '1.0.0 (Claude Code)\nx'])
      expect(claudeVersion(bad)).toBeNull();
    expect(await detectClaude(script('evil', 'totally not claude'))).toBeNull();
    expect(await detectClaude(script('claude', '2.1.303 (Claude Code)'))).toMatchObject({
      version: '2.1.303 (Claude Code)',
    });
  });

  it('refuses to save without a main-held candidate and takes no path from the renderer', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);');
    const db = drizzle(sqlite, { schema }) as JobPilotDb;
    const service = new AgentSettingsService(db, dir, false);
    await expect(service.save({ model: 'haiku', auth: 'login' })).rejects.toThrow(/No Claude candidate/);
    await expect(service.chooseCandidate(script('imposter', 'hello'))).rejects.toThrow(/not Claude Code/);
    expect(SaveAgentSchema.parse({ model: 'haiku', auth: 'login', path: '/bin/sh' })).toEqual({
      model: 'haiku',
      auth: 'login',
    });
  });
});

describe('profile input validation', () => {
  const save = (over: object) =>
    ProfileSaveSchema.safeParse({ section: 'personal', value: { ...EMPTY_PROFILE, ...over } }).success;
  it('accepts empty or valid emails and rejects markup', () => {
    expect(save({ email: '' })).toBe(true);
    expect(save({ email: 'ada@example.com' })).toBe(true);
    expect(save({ email: '<img src=x onerror=alert(1)>@x.com' })).toBe(false);
    expect(save({ email: 'not-an-email' })).toBe(false);
  });
  it('rejects NUL, ANSI escape and DEL on save but keeps tab, newline and CR', () => {
    for (const bad of ['a\0b', 'a\u001b[31mred', 'a\u007f']) expect(save({ bio: bad })).toBe(false);
    expect(save({ bio: 'a\tb\r\nc' })).toBe(true);
  });
  it('still reads a profile that 0.2.1 stored with control characters', () => {
    expect(PersonalProfileSchema.safeParse({ ...EMPTY_PROFILE, bio: 'a\0b' }).success).toBe(true);
  });
});

describe('document signatures', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7 body');
  const zip = new Uint8Array([0x50, 0x4b, 3, 4, 0]);
  it('matches content to extension', () => {
    expect(matchesDocumentSignature('cv.PDF', pdf)).toBe(true);
    expect(matchesDocumentSignature('cv.docx', zip)).toBe(true);
    expect(matchesDocumentSignature('cv.pdf', new TextEncoder().encode('just text'))).toBe(false);
    expect(matchesDocumentSignature('cv.pdf', zip)).toBe(false);
    expect(matchesDocumentSignature('cv.docx', pdf)).toBe(false);
    expect(matchesDocumentSignature('cv.exe', pdf)).toBe(false);
  });
  it('is enforced on the IPC payload', () => {
    expect(SaveDocumentInputSchema.safeParse({ name: 'cv.pdf', bytes: pdf }).success).toBe(true);
    expect(SaveDocumentInputSchema.safeParse({ name: 'cv.pdf', bytes: new Uint8Array([1, 2, 3]) }).success).toBe(false);
  });
});
