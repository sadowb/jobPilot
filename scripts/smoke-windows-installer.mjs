// Smoke test for the Windows NSIS installer.
// Silently installs into a temporary directory (/S /D=<absPath>), boots the installed executable
// with a throwaway user-data-dir to assert it starts and quits cleanly, then silently uninstalls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { bootApp } from './smoke-app.mjs';

export function findSetupExe(releaseDir = join(process.cwd(), 'release')) {
  if (!existsSync(releaseDir)) {
    throw new Error(`Release directory does not exist: ${releaseDir}`);
  }
  const files = readdirSync(releaseDir);
  const setup = files.find((f) => f.endsWith('-setup.exe') || (f.startsWith('JobPilot-') && f.endsWith('.exe')));
  if (!setup) {
    throw new Error(`No setup installer found in ${releaseDir}`);
  }
  return join(releaseDir, setup);
}

export function findUninstaller(installDir) {
  if (!existsSync(installDir)) {
    throw new Error(`Install directory does not exist: ${installDir}`);
  }
  const files = readdirSync(installDir);
  const uninstaller = files.find((f) => f.toLowerCase().startsWith('uninstall') && f.endsWith('.exe'));
  if (!uninstaller) {
    throw new Error(`No uninstaller executable found in ${installDir}`);
  }
  return join(installDir, uninstaller);
}

export async function testWindowsInstaller(customSetupExe) {
  const setupExe = customSetupExe ?? findSetupExe();
  if (!existsSync(setupExe)) {
    throw new Error(`Setup installer not found: ${setupExe}`);
  }

  const installDir = mkdtempSync(join(tmpdir(), 'jobpilot-inst-'));
  console.log(`Installing ${setupExe} silently to ${installDir}...`);

  // NSIS installer silent syntax: Setup.exe /S /D=<absPath>
  const installResult = spawnSync(`"${setupExe}" /S /D=${installDir}`, {
    shell: true,
    stdio: 'inherit',
  });
  if (installResult.status !== 0) {
    throw new Error(`Installer exited with status ${installResult.status}`);
  }

  const installedExe = join(installDir, 'JobPilot.exe');
  let installed = false;
  for (let i = 0; i < 30; i++) {
    if (existsSync(installedExe)) {
      installed = true;
      break;
    }
    await sleep(500);
  }
  if (!installed) {
    throw new Error(`JobPilot.exe was not created in ${installDir}`);
  }
  console.log(`Installed executable verified: ${installedExe}`);

  // Boot test the installed application
  console.log('Booting installed app to assert clean start and quit...');
  await bootApp({ executable: installedExe });
  console.log('Installed app boot test passed.');

  // Uninstall silently
  const uninstallerPath = findUninstaller(installDir);
  console.log(`Uninstalling silently via ${uninstallerPath}...`);
  // NSIS uninstaller silent syntax: uninstaller.exe /S _?=<absPath>
  const uninstallResult = spawnSync(`"${uninstallerPath}" /S _?=${installDir}`, {
    shell: true,
    stdio: 'inherit',
  });
  if (uninstallResult.status !== 0) {
    throw new Error(`Uninstaller exited with status ${uninstallResult.status}`);
  }

  let uninstalled = false;
  for (let i = 0; i < 30; i++) {
    if (!existsSync(installedExe)) {
      uninstalled = true;
      break;
    }
    await sleep(500);
  }
  assert.ok(uninstalled, `Installed executable still exists after uninstall in ${installDir}`);
  console.log('Silent uninstall verified.');

  try {
    rmSync(installDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    /* ignore temp directory cleanup failure */
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const setupExe = process.argv[2];
  testWindowsInstaller(setupExe)
    .then(() => {
      console.log('smoke-windows-installer: OK');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`smoke-windows-installer: FAILED - ${err.message}`);
      process.exit(1);
    });
}
