import { execFile as nodeExecFile } from 'node:child_process';

type ExecFile = typeof nodeExecFile;
export type KeychainResult = 'removed' | 'absent' | 'skipped';

/**
 * Electron safeStorage has no delete API, so the OS item is removed directly. Names follow Chromium os_crypt:
 * macOS keeps one generic password, service "<app name> Safe Storage" and account "<app name>"
 * (components/os_crypt/sync/keychain_password_mac.mm). Linux libsecret items carry attribute application=<app name>
 * (key_storage_libsecret.cc); verify the attribute on a packaged Linux build. Windows (DPAPI) keeps its key in
 * userData/Local State, which is deleted with the directory.
 */
export function keychainCommand(
  platform: NodeJS.Platform,
  appName: string,
): { file: string; args: string[] } | undefined {
  if (platform === 'darwin')
    return {
      file: '/usr/bin/security',
      args: ['delete-generic-password', '-s', `${appName} Safe Storage`, '-a', appName],
    };
  if (platform === 'linux') return { file: 'secret-tool', args: ['clear', 'application', appName] };
  return undefined;
}

/** No shell. macOS exit 44 (errSecItemNotFound) means already gone; a missing secret-tool is skipped, not fatal. */
export function removeKeychainItem(
  appName: string,
  platform: NodeJS.Platform = process.platform,
  execFile: ExecFile = nodeExecFile,
): Promise<KeychainResult> {
  const command = keychainCommand(platform, appName);
  if (!command) return Promise.resolve('skipped');
  return new Promise((resolve, reject) => {
    execFile(command.file, command.args, { timeout: 10_000 }, (error) => {
      if (!error) return resolve('removed');
      const { code } = error as { code?: unknown };
      if (platform === 'darwin' && code === 44) return resolve('absent');
      if (platform === 'linux' && code === 'ENOENT') return resolve('skipped');
      reject(error);
    });
  });
}
