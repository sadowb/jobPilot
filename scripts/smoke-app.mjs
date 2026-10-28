// Smoke test for packaged executables / AppImages across platforms.
// Boots the app with a throwaway user-data-dir, asserts it creates an encrypted database and logs,
// verifies error-free startup, and requests a clean shutdown.
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  closeSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export function resolveExecutablePath(inputPath) {
  if (inputPath && existsSync(inputPath) && !statSync(inputPath).isDirectory()) {
    return inputPath;
  }
  const dir =
    inputPath && existsSync(inputPath) && statSync(inputPath).isDirectory()
      ? inputPath
      : inputPath &&
          existsSync(join(process.cwd(), inputPath)) &&
          statSync(join(process.cwd(), inputPath)).isDirectory()
        ? join(process.cwd(), inputPath)
        : join(process.cwd(), 'release');
  if (existsSync(dir)) {
    const files = readdirSync(dir);
    const appImage = files.find((f) => f.endsWith('.AppImage'));
    if (appImage) return join(dir, appImage);
    const exe = files.find((f) => f.endsWith('.exe') && !f.toLowerCase().startsWith('uninstall'));
    if (exe) return join(dir, exe);
  }
  return inputPath;
}

export function hasFirstLogLine(userData) {
  const logsDir = join(userData, 'logs');
  if (!existsSync(logsDir)) return false;
  const files = readdirSync(logsDir).filter((f) => !f.startsWith('.'));
  for (const f of files) {
    const content = readFileSync(join(logsDir, f), 'utf8').trim();
    if (content.length > 0) return true;
  }
  return false;
}

export function checkDatabaseEncryption(userData) {
  const dbFile = join(userData, 'jobpilot.db');
  if (!existsSync(dbFile)) {
    throw new Error(`Database file not found: ${dbFile}`);
  }
  const header = Buffer.alloc(16);
  const fd = openSync(dbFile, 'r');
  readSync(fd, header, 0, 16, 0);
  closeSync(fd);
  if (header.toString('latin1') === 'SQLite format 3\0') {
    throw new Error('jobpilot.db is not encrypted (plain SQLite header found)');
  }
}

export function checkLogErrors(userData) {
  const logsDir = join(userData, 'logs');
  if (!existsSync(logsDir)) return;
  const files = readdirSync(logsDir).filter((f) => !f.startsWith('.'));
  const errorLines = [];
  for (const f of files) {
    const lines = readFileSync(join(logsDir, f), 'utf8').split('\n');
    for (const line of lines) {
      if (/"level":\s*(5\d|6\d)/.test(line)) {
        errorLines.push(line);
      }
    }
  }
  if (errorLines.length > 0) {
    throw new Error(`Error-level log entries detected:\n${errorLines.slice(0, 5).join('\n')}`);
  }
}

export async function bootApp({ executable, args = [], timeoutMs = 30000 }) {
  const resolved = resolveExecutablePath(executable);
  if (!resolved || !existsSync(resolved)) {
    throw new Error(`Executable not found: ${resolved ?? executable}`);
  }

  if (process.platform !== 'win32') {
    try {
      chmodSync(resolved, 0o755);
    } catch {
      /* ignore permission errors */
    }
  }

  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-smoke-'));
  const allArgs = [...args, `--user-data-dir=${userData}`];
  console.log(`Booting ${resolved} with args: ${allArgs.join(' ')}`);

  const child = spawn(resolved, allArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let stderr = '';
  let stdout = '';
  child.stderr?.on('data', (d) => {
    stderr += d;
  });
  child.stdout?.on('data', (d) => {
    stdout += d;
  });

  let booted = false;
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < timeoutMs) {
      if (child.exitCode !== null) break;

      const hasDb = existsSync(join(userData, 'jobpilot.db'));
      const hasKey = existsSync(join(userData, 'db-key.enc'));
      const hasLogs = hasFirstLogLine(userData);

      if (hasDb && hasKey && hasLogs) {
        booted = true;
        break;
      }
      await sleep(500);
    }

    if (!booted) {
      const exitInfo = child.exitCode !== null ? ` (exited with code ${child.exitCode})` : ' (timed out)';
      console.error(`App failed to boot cleanly${exitInfo}`);
      if (stdout) console.error(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
      const logsDir = join(userData, 'logs');
      if (existsSync(logsDir)) {
        for (const f of readdirSync(logsDir)) {
          console.error(`log file ${f}:\n${readFileSync(join(logsDir, f), 'utf8')}`);
        }
      }
      throw new Error(`App boot failed: database, key, or logs missing after ${Date.now() - startTime}ms`);
    }

    console.log('App started successfully. Verifying database encryption and log status...');
    checkDatabaseEncryption(userData);
    checkLogErrors(userData);
    console.log('Database is encrypted and logs have no errors.');

    // Shutdown gracefully
    console.log('Stopping app cleanly...');
    if (process.platform === 'win32') {
      if (child.pid) {
        spawnSync('taskkill', ['/pid', String(child.pid)], { stdio: 'ignore' });
      }
      for (let i = 0; i < 20; i++) {
        if (child.exitCode !== null) break;
        await sleep(500);
      }
      if (child.exitCode === null) {
        try {
          child.kill();
        } catch {
          /* ignore process termination race */
        }
        if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
      }
    } else {
      child.kill('SIGTERM');
      for (let i = 0; i < 20; i++) {
        if (child.exitCode !== null) break;
        await sleep(500);
      }
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }

    if (child.exitCode !== null && child.exitCode !== 0 && child.signalCode !== 'SIGTERM') {
      throw new Error(`App exited with non-zero code: ${child.exitCode}`);
    }
    console.log('App quit cleanly.');
  } finally {
    try {
      rmSync(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    } catch {
      /* ignore temp directory cleanup failure */
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const executable = process.argv[2];
  const args = process.argv.slice(3);
  bootApp({ executable, args })
    .then(() => {
      console.log('smoke-app: OK');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`smoke-app: FAILED - ${err.message}`);
      process.exit(1);
    });
}
