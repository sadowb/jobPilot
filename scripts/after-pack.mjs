// Flips Electron fuses on the packaged binary (hardening that cannot be changed at runtime)
// and ensures macOS helper app bundles are named to match their display name.
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses';

const execFileAsync = promisify(execFile);

let plistModule = null;
try {
  plistModule = (await import('plist')).default;
} catch {
  plistModule = null;
}

export async function fixHelperBundleNames(appPath, platform = process.platform, { forcePlistBuddy = false } = {}) {
  if (platform !== 'darwin') return;
  const frameworksDir = join(appPath, 'Contents', 'Frameworks');
  if (!existsSync(frameworksDir)) return;
  const entries = readdirSync(frameworksDir);
  const helpers = entries.filter((entry) => entry.endsWith('.app') && entry.includes('Helper'));
  for (const helper of helpers) {
    const plistPath = join(frameworksDir, helper, 'Contents', 'Info.plist');
    if (!existsSync(plistPath)) {
      throw new Error(`Helper Info.plist not found: ${plistPath}`);
    }

    if (plistModule && !forcePlistBuddy) {
      const parsed = plistModule.parse(readFileSync(plistPath, 'utf8'));
      const displayName = parsed?.CFBundleDisplayName;
      if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
        throw new Error(`Helper plist missing CFBundleDisplayName: ${plistPath}`);
      }
      parsed.CFBundleName = displayName;
      writeFileSync(plistPath, plistModule.build(parsed) + '\n');
    } else {
      let displayName;
      try {
        const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', [
          '-c',
          'Print :CFBundleDisplayName',
          plistPath,
        ]);
        displayName = stdout.trim();
      } catch (err) {
        throw new Error(`Helper plist missing CFBundleDisplayName: ${plistPath} (${err.message})`, { cause: err });
      }
      if (!displayName) {
        throw new Error(`Helper plist missing CFBundleDisplayName: ${plistPath}`);
      }
      try {
        await execFileAsync('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleName ${displayName}`, plistPath]);
      } catch {
        await execFileAsync('/usr/libexec/PlistBuddy', ['-c', `Add :CFBundleName string ${displayName}`, plistPath]);
      }
    }
  }
}

export default async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  const name = packager.appInfo.productFilename;
  const appPath = join(appOutDir, `${name}.app`);

  await fixHelperBundleNames(appPath, electronPlatformName);

  const executable =
    electronPlatformName === 'darwin'
      ? join(appPath, 'Contents', 'MacOS', name)
      : electronPlatformName === 'win32'
        ? join(appOutDir, `${name}.exe`)
        : join(appOutDir, packager.executableName);
  await flipFuses(executable, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });
}
