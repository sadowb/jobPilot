import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error plain module without type declarations
import plist from 'plist';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
import { fixHelperBundleNames } from '../scripts/after-pack.mjs';

function makePlist(displayName?: string, bundleName = 'Electron Helper'): string {
  const dict: Record<string, string> = {};
  if (displayName !== undefined) dict.CFBundleDisplayName = displayName;
  if (bundleName !== undefined) dict.CFBundleName = bundleName;
  return plist.build(dict);
}

describe('afterPack helper bundle name rewriting', () => {
  let tempDir: string;
  let appDir: string;
  let frameworksDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'jobpilot-test-app-'));
    appDir = join(tempDir, 'JobPilot.app');
    frameworksDir = join(appDir, 'Contents', 'Frameworks');
    mkdirSync(frameworksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createHelper(name: string, displayName?: string, bundleName = 'Electron Helper'): string {
    const helperDir = join(frameworksDir, `${name}.app`, 'Contents');
    mkdirSync(helperDir, { recursive: true });
    const plistPath = join(helperDir, 'Info.plist');
    writeFileSync(plistPath, makePlist(displayName, bundleName));
    return plistPath;
  }

  it('rewrites CFBundleName to match CFBundleDisplayName on macOS', async () => {
    const mainHelperPlist = createHelper('JobPilot Helper', 'JobPilot Helper', 'Electron Helper');
    const gpuHelperPlist = createHelper('JobPilot Helper (GPU)', 'JobPilot Helper (GPU)', 'Electron Helper (GPU)');
    const rendererHelperPlist = createHelper(
      'JobPilot Helper (Renderer)',
      'JobPilot Helper (Renderer)',
      'Electron Helper (Renderer)',
    );

    await fixHelperBundleNames(appDir, 'darwin');

    const mainData = plist.parse(readFileSync(mainHelperPlist, 'utf8')) as Record<string, string>;
    const gpuData = plist.parse(readFileSync(gpuHelperPlist, 'utf8')) as Record<string, string>;
    const rendererData = plist.parse(readFileSync(rendererHelperPlist, 'utf8')) as Record<string, string>;

    expect(mainData.CFBundleName).toBe('JobPilot Helper');
    expect(gpuData.CFBundleName).toBe('JobPilot Helper (GPU)');
    expect(rendererData.CFBundleName).toBe('JobPilot Helper (Renderer)');
  });

  it('is a no-op on non-mac platforms', async () => {
    const helperPlist = createHelper('JobPilot Helper (GPU)', 'JobPilot Helper (GPU)', 'Electron Helper (GPU)');

    await fixHelperBundleNames(appDir, 'win32');
    let data = plist.parse(readFileSync(helperPlist, 'utf8')) as Record<string, string>;
    expect(data.CFBundleName).toBe('Electron Helper (GPU)');

    await fixHelperBundleNames(appDir, 'linux');
    data = plist.parse(readFileSync(helperPlist, 'utf8')) as Record<string, string>;
    expect(data.CFBundleName).toBe('Electron Helper (GPU)');
  });

  it('fails loudly if a helper plist is missing CFBundleDisplayName', async () => {
    createHelper('JobPilot Helper (GPU)', undefined, 'Electron Helper (GPU)');

    await expect(fixHelperBundleNames(appDir, 'darwin')).rejects.toThrow(/missing CFBundleDisplayName/i);
  });

  it('fails loudly if a helper Info.plist does not exist', async () => {
    const helperContents = join(frameworksDir, 'JobPilot Helper.app', 'Contents');
    mkdirSync(helperContents, { recursive: true });

    await expect(fixHelperBundleNames(appDir, 'darwin')).rejects.toThrow(/not found/i);
  });

  it.skipIf(process.platform !== 'darwin')('rewrites CFBundleName using PlistBuddy fallback', async () => {
    const helperPlist = createHelper('JobPilot Helper (GPU)', 'JobPilot Helper (GPU)', 'Electron Helper (GPU)');

    await fixHelperBundleNames(appDir, 'darwin', { forcePlistBuddy: true });

    const data = plist.parse(readFileSync(helperPlist, 'utf8')) as Record<string, string>;
    expect(data.CFBundleName).toBe('JobPilot Helper (GPU)');
  });
});
