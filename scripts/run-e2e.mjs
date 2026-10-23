import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
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
try {
  result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], { stdio: 'inherit' });
} finally {
  await setInspector(false);
}
process.exitCode = result.status ?? 1;
