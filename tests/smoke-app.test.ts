import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
// prettier-ignore
import { checkDatabaseEncryption, checkLogErrors, hasFirstLogLine, hasLogsDir, resolveExecutablePath } from '../scripts/smoke-app.mjs';

describe('smoke-app helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jobpilot-smoke-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('hasLogsDir', () => {
    it('returns false when logs directory does not exist', () => {
      expect(hasLogsDir(tempDir)).toBe(false);
    });

    it('returns false when logs directory is empty', () => {
      mkdirSync(join(tempDir, 'logs'), { recursive: true });
      expect(hasLogsDir(tempDir)).toBe(false);
    });

    it('returns true when a log file exists', () => {
      const logs = join(tempDir, 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'jobpilot.log'), '');
      expect(hasLogsDir(tempDir)).toBe(true);
    });
  });

  describe('hasFirstLogLine', () => {
    it('returns false when logs directory does not exist', () => {
      expect(hasFirstLogLine(tempDir)).toBe(false);
    });

    it('returns false when logs directory is empty', () => {
      mkdirSync(join(tempDir, 'logs'), { recursive: true });
      expect(hasFirstLogLine(tempDir)).toBe(false);
    });

    it('returns false when log file is blank', () => {
      const logs = join(tempDir, 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'jobpilot.log'), '   \n  ');
      expect(hasFirstLogLine(tempDir)).toBe(false);
    });

    it('returns true when log file has content', () => {
      const logs = join(tempDir, 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'jobpilot.log'), '{"level":30,"msg":"ready"}\n');
      expect(hasFirstLogLine(tempDir)).toBe(true);
    });
  });

  describe('checkDatabaseEncryption', () => {
    it('throws if database file does not exist', () => {
      expect(() => checkDatabaseEncryption(tempDir)).toThrow(/Database file not found/);
    });

    it('throws if database header is unencrypted SQLite', () => {
      const dbFile = join(tempDir, 'jobpilot.db');
      const plainHeader = Buffer.from('SQLite format 3\0');
      writeFileSync(dbFile, plainHeader);
      expect(() => checkDatabaseEncryption(tempDir)).toThrow(/not encrypted/);
    });

    it('passes if database header is encrypted', () => {
      const dbFile = join(tempDir, 'jobpilot.db');
      const encryptedHeader = Buffer.alloc(16, 0x42);
      writeFileSync(dbFile, encryptedHeader);
      expect(() => checkDatabaseEncryption(tempDir)).not.toThrow();
    });
  });

  describe('checkLogErrors', () => {
    it('does nothing if logs directory is missing', () => {
      expect(() => checkLogErrors(tempDir)).not.toThrow();
    });

    it('passes for info and warn level logs', () => {
      const logs = join(tempDir, 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'jobpilot.log'), '{"level":30,"msg":"info"}\n{"level":40,"msg":"warn"}\n');
      expect(() => checkLogErrors(tempDir)).not.toThrow();
    });

    it('throws when level 50 or 60 errors are present', () => {
      const logs = join(tempDir, 'logs');
      mkdirSync(logs, { recursive: true });
      writeFileSync(join(logs, 'jobpilot.log'), '{"level":50,"msg":"error"}\n');
      expect(() => checkLogErrors(tempDir)).toThrow(/Error-level log entries detected/);
    });
  });

  describe('resolveExecutablePath', () => {
    it('returns existing path directly', () => {
      const dummy = join(tempDir, 'app.bin');
      writeFileSync(dummy, '');
      expect(resolveExecutablePath(dummy)).toBe(dummy);
    });

    it('finds AppImage in specified directory', () => {
      const appImage = join(tempDir, 'JobPilot-0.1.0-x64.AppImage');
      writeFileSync(appImage, '');
      expect(resolveExecutablePath(tempDir)).toBe(appImage);
    });

    it('finds installed Linux binary in specified directory', () => {
      const bin = join(tempDir, 'jobpilot');
      writeFileSync(bin, '');
      expect(resolveExecutablePath(tempDir)).toBe(bin);
    });
  });
});
