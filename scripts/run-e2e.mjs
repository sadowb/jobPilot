import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses';

const signingIdentity = process.env.JOBPILOT_SIGN_IDENTITY;

const executables = [
  process.env.JOBPILOT_PACKAGED_EXECUTABLE ??
    join('release', 'mac-arm64', 'JobPilot.app', 'Contents', 'MacOS', 'JobPilot'),
  process.env.JOBPILOT_BASE_EXECUTABLE,
].filter(Boolean);

async function setInspector(enabled) {
  for (const executable of executables) {
    await flipFuses(executable, {
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: process.platform === 'darwin' && !signingIdentity,
      [FuseV1Options.EnableNodeCliInspectArguments]: enabled,
    });
    if (signingIdentity) {
      const app = executable.replace(/\/Contents\/MacOS\/[^/]+$/, '');
      const result = spawnSync('node', ['scripts/sign-app.mjs', app, signingIdentity], {
        stdio: 'inherit',
      });
      if (result.status !== 0) throw new Error(`Could not sign ${app} after changing Electron fuses`);
    }
  }
}

await setInspector(true);
let result;
try {
  result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], { stdio: 'inherit' });
} finally {
  await setInspector(false);
}
process.exitCode = result.status ?? 1;
