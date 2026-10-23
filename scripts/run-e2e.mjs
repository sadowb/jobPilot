import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses';

const executables = [
  process.env.JOBPILOT_PACKAGED_EXECUTABLE ??
    join('release', 'mac-arm64', 'JobPilot.app', 'Contents', 'MacOS', 'JobPilot'),
  process.env.JOBPILOT_BASE_EXECUTABLE,
].filter(Boolean);

async function setInspector(enabled) {
  for (const executable of executables) {
    await flipFuses(executable, {
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: process.platform === 'darwin',
      [FuseV1Options.EnableNodeCliInspectArguments]: enabled,
    });
  }
}

await setInspector(true);
let result;
let keychainDirectory;
try {
  if (process.env.CI && process.platform === 'darwin') {
    keychainDirectory = mkdtempSync(join(tmpdir(), 'jobpilot-journey-keychain-'));
    const keychain = join(keychainDirectory, 'journeys.keychain');
    const password = randomBytes(32).toString('hex');
    const security = (...args) => {
      const check = spawnSync('security', args, { stdio: 'pipe' });
      if (check.status !== 0) throw new Error(`CI Keychain fixture ${args[0]} failed`);
    };
    security('create-keychain', '-p', password, keychain);
    security('set-keychain-settings', keychain);
    security('unlock-keychain', '-p', password, keychain);
    security('list-keychains', '-d', 'user', '-s', keychain);
    security('default-keychain', '-s', keychain);
    const trusted = [
      resolve('node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
      ...executables.map((file) => resolve(file)),
    ];
    // shortcut: trust both ad-hoc CI binaries explicitly; remove when ADR 0014 stable signing lands.
    for (const name of ['Electron', 'JobPilot', 'jobpilot']) {
      security(
        'add-generic-password',
        '-a',
        `${name} Key`,
        '-s',
        `${name} Safe Storage`,
        '-w',
        randomBytes(32).toString('base64'),
        ...trusted.flatMap((file) => ['-T', file]),
        keychain,
      );
    }
  }
  result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], { stdio: 'inherit' });
} finally {
  await setInspector(false);
  if (keychainDirectory) {
    execFileSync('security', ['delete-keychain', join(keychainDirectory, 'journeys.keychain')], { stdio: 'pipe' });
    rmSync(keychainDirectory, { recursive: true, force: true });
  }
}
process.exitCode = result.status ?? 1;
