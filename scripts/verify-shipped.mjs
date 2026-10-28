// Checks the exact .app we ship (no Playwright, no fuse flips): hardening fuses, signature, and a real boot.
// Usage: node scripts/verify-shipped.mjs [path/to/JobPilot.app]
import { spawn, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  openSync,
  readSync,
  closeSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FuseV1Options, getCurrentFuseWire } from '@electron/fuses';

const app = process.argv[2] ?? join('release', 'mac-arm64', 'JobPilot.app');
const executable = join(app, 'Contents', 'MacOS', 'JobPilot');
const fail = (message) => {
  console.error(`verify-shipped: ${message}`);
  process.exit(1);
};

// 1. Hardening fuses (ON = 49, OFF = 48 in the fuse wire).
const expected = {
  RunAsNode: false,
  EnableNodeOptionsEnvironmentVariable: false,
  EnableNodeCliInspectArguments: false, // on = any local process can attach and inherit our Keychain access
  EnableCookieEncryption: true,
  EnableEmbeddedAsarIntegrityValidation: true,
  OnlyLoadAppFromAsar: true,
};
const wire = await getCurrentFuseWire(executable);
for (const [name, on] of Object.entries(expected)) {
  if ((wire[FuseV1Options[name]] === 49) !== on) fail(`fuse ${name} should be ${on ? 'enabled' : 'disabled'}`);
}

// 2. Signature covers every file (catches post-signing edits that macOS kills at load).
const sig = spawnSync('codesign', ['--verify', '--deep', '--strict', app], { encoding: 'utf8' });
if (sig.status !== 0) fail(`codesign --verify failed: ${sig.stderr.trim()}`);

// 3. Real boot of the unmodified binary with a throwaway profile.
const userData = mkdtempSync(join(tmpdir(), 'jobpilot-shipped-'));
const child = spawn(executable, [`--user-data-dir=${userData}`], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => (stderr += chunk));
let exited = null;
child.on('exit', (code, signal) => (exited = { code, signal }));
try {
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  if (exited) fail(`app exited during boot (${JSON.stringify(exited)}):\n${stderr.slice(-4000)}`);

  // Chromium keeps its own unencrypted SQLite files in userData; only ours must be encrypted.
  const backups = join(userData, 'backups');
  const dbs = [
    'jobpilot.db',
    ...(existsSync(backups) ? readdirSync(backups).map((name) => join('backups', name)) : []),
  ];
  if (!existsSync(join(userData, 'jobpilot.db'))) {
    const logs = join(userData, 'logs');
    const tail = existsSync(logs)
      ? readdirSync(logs)
          .map((name) => readFileSync(join(logs, name), 'utf8').split('\n').slice(-20).join('\n'))
          .join('\n')
      : '(no logs dir)';
    fail(
      `jobpilot.db was not created in userData.\nuserData: ${readdirSync(userData).join(', ')}\nlogs:\n${tail}\nstderr:\n${stderr.slice(-3000)}`,
    );
  }
  for (const name of dbs) {
    const file = join(userData, name);
    const header = Buffer.alloc(16);
    const fd = openSync(file, 'r');
    readSync(fd, header, 0, 16, 0);
    closeSync(fd);
    if (header.toString('latin1') === 'SQLite format 3\0') fail(`${name} is not encrypted`);
    if ((statSync(file).mode & 0o077) !== 0) fail(`${name} is readable by other users`);
  }

  const logs = join(userData, 'logs');
  const errors = existsSync(logs)
    ? readdirSync(logs)
        .flatMap((name) => readFileSync(join(logs, name), 'utf8').split('\n'))
        .filter((line) => /"level":\s*(5\d|6\d)/.test(line))
    : [];
  if (errors.length) fail(`error-level log entries:\n${errors.slice(0, 5).join('\n')}`);
  // 4. A shipped app must quit on SIGTERM (logout, shutdown, installers) within a bounded time.
  child.kill('SIGTERM');
  const deadline = Date.now() + 20_000;
  while (!exited && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 200));
  if (!exited) {
    const tail = existsSync(logs)
      ? readdirSync(logs)
          .map((name) => readFileSync(join(logs, name), 'utf8').split('\n').slice(-30).join('\n'))
          .join('\n')
      : '(no logs dir)';
    child.kill('SIGKILL');
    fail(`app did not quit within 20 s of SIGTERM.\nlogs:\n${tail}\nstderr:\n${stderr.slice(-3000)}`);
  }
  console.log(`verify-shipped: OK (${app}, quit ${JSON.stringify(exited)})`);
} finally {
  if (!exited) child.kill('SIGKILL');
  rmSync(userData, { recursive: true, force: true });
}
