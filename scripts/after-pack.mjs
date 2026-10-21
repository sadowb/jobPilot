// Flips Electron fuses on the packaged binary (hardening that cannot be changed at runtime).
import { join } from 'node:path';
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses';

export default async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  const name = packager.appInfo.productFilename;
  const executable =
    electronPlatformName === 'darwin'
      ? join(appOutDir, `${name}.app`, 'Contents', 'MacOS', name)
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
