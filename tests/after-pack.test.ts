import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
import { nameHelperBundles } from '../scripts/after-pack.mjs';

const plistXml = (keys: Record<string, string>) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>${Object.entries(keys)
    .map(([key, value]) => `<key>${key}</key><string>${value}</string>`)
    .join('')}</dict></plist>\n`;

const read = (plist: string, key: string) =>
  execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim();

// PlistBuddy exists only on macOS, which is the only platform this step runs on.
describe.skipIf(process.platform !== 'darwin')('afterPack helper bundle names (#121)', () => {
  let app: string;
  const helper = (name: string, keys: Record<string, string>) => {
    const contents = join(app, 'Contents', 'Frameworks', `${name}.app`, 'Contents');
    mkdirSync(contents, { recursive: true });
    writeFileSync(join(contents, 'Info.plist'), plistXml(keys));
    return join(contents, 'Info.plist');
  };

  beforeEach(() => {
    app = join(mkdtempSync(join(tmpdir(), 'jobpilot-after-pack-')), 'JobPilot.app');
  });
  afterEach(() => rmSync(join(app, '..'), { recursive: true, force: true }));

  it('sets CFBundleName to the display name, spaces and parentheses included', () => {
    const main = helper('JobPilot Helper', {
      CFBundleName: 'Electron Helper',
      CFBundleDisplayName: 'JobPilot Helper',
    });
    const gpu = helper('JobPilot Helper (GPU)', {
      CFBundleName: 'Electron Helper (GPU)',
      CFBundleDisplayName: 'JobPilot Helper (GPU)',
    });
    nameHelperBundles(app);
    expect(read(main, 'CFBundleName')).toBe('JobPilot Helper');
    expect(read(gpu, 'CFBundleName')).toBe('JobPilot Helper (GPU)');
  });

  it('fails the build when a helper has no display name', () => {
    helper('JobPilot Helper (GPU)', { CFBundleName: 'Electron Helper (GPU)' });
    expect(() => nameHelperBundles(app)).toThrow();
  });

  it('fails the build when there are no helpers', () => {
    mkdirSync(join(app, 'Contents', 'Frameworks'), { recursive: true });
    expect(() => nameHelperBundles(app)).toThrow(/No helper bundles/);
  });
});
