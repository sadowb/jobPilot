import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module
import { findSetupExe, findUninstaller } from '../scripts/smoke-windows-installer.mjs';

describe('smoke-windows-installer helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jobpilot-win-smoke-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findSetupExe', () => {
    it('throws if directory does not exist', () => {
      expect(() => findSetupExe(join(tempDir, 'nonexistent'))).toThrow(/Release directory does not exist/);
    });

    it('throws if no setup installer is in directory', () => {
      expect(() => findSetupExe(tempDir)).toThrow(/No setup installer found/);
    });

    it('finds setup exe matching *-setup.exe pattern', () => {
      const installer = join(tempDir, 'JobPilot-0.1.0-x64-setup.exe');
      writeFileSync(installer, '');
      expect(findSetupExe(tempDir)).toBe(installer);
    });
  });

  describe('findUninstaller', () => {
    it('throws if directory does not exist', () => {
      expect(() => findUninstaller(join(tempDir, 'nonexistent'))).toThrow(/Install directory does not exist/);
    });

    it('throws if uninstaller is missing', () => {
      expect(() => findUninstaller(tempDir)).toThrow(/No uninstaller executable found/);
    });

    it('finds Uninstall JobPilot.exe', () => {
      const uninstaller = join(tempDir, 'Uninstall JobPilot.exe');
      writeFileSync(uninstaller, '');
      expect(findUninstaller(tempDir)).toBe(uninstaller);
    });
  });
});
