// Flips Electron fuses on the packaged binary (hardening that cannot be changed at runtime) and names the macOS
// helper bundles after the app, so Activity Monitor shows "JobPilot Helper (…)" instead of "Electron Helper (…)".
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses';

const PLIST_BUDDY = '/usr/libexec/PlistBuddy';

/** Sets each helper's CFBundleName to its CFBundleDisplayName. Runs before signing; macOS builds only. */
export function nameHelperBundles(appPath) {
  const frameworks = join(appPath, 'Contents', 'Frameworks');
  const helpers = readdirSync(frameworks).filter((entry) => entry.endsWith('.app') && entry.includes('Helper'));
  if (!helpers.length) throw new Error(`No helper bundles in ${frameworks}`);
  for (const helper of helpers) {
    const plist = join(frameworks, helper, 'Contents', 'Info.plist');
    // Throws if the plist or the key is missing: a build must not ship half-renamed helpers.
    const displayName = execFileSync(PLIST_BUDDY, ['-c', 'Print :CFBundleDisplayName', plist], {
      encoding: 'utf8',
    }).trim();
    if (!displayName) throw new Error(`Empty CFBundleDisplayName in ${plist}`);
    execFileSync(PLIST_BUDDY, ['-c', `Set :CFBundleName ${displayName}`, plist]);
  }
}

export default async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  const name = packager.appInfo.productFilename;
  const appPath = join(appOutDir, `${name}.app`);
  if (electronPlatformName === 'darwin') nameHelperBundles(appPath);
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
