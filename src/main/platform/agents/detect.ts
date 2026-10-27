import { constants } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execute = promisify(execFile);

export async function executablePath(path: string): Promise<string> {
  if (!isAbsolute(path)) throw new Error('Choose an absolute executable path.');
  const resolved = z.string().parse(await realpath(path));
  await access(resolved, constants.X_OK);
  if (!(await stat(resolved)).isFile()) throw new Error('Choose an executable file.');
  return resolved;
}

/** Discovery is advisory: only the owner-confirmed absolute path is used by runs. */
export async function detectClaude(override?: string | null): Promise<{ path: string; version: string } | null> {
  let pathValue = process.env.PATH ?? '';
  if (!override && process.platform === 'darwin') {
    try {
      const shell = process.env.SHELL === '/bin/bash' ? '/bin/bash' : '/bin/zsh';
      const result = await execute(shell, ['-lc', 'printf "%s" "$PATH"'], {
        timeout: 5000,
        killSignal: 'SIGKILL',
        maxBuffer: 16384,
        encoding: 'utf8',
      });
      pathValue = z.string().max(16384).parse(result.stdout);
    } catch {
      /* Fall back to the GUI environment and standard install locations. */
    }
  }
  const candidates: string[] = [];
  if (override) {
    candidates.push(override);
  } else if (process.platform === 'win32') {
    try {
      const whereBinary = process.env.SystemRoot ? join(process.env.SystemRoot, 'System32', 'where.exe') : 'where';
      const whereResult = await execute(whereBinary, ['claude'], {
        timeout: 5000,
        killSignal: 'SIGKILL',
        maxBuffer: 16384,
        encoding: 'utf8',
        env: { PATH: pathValue, SystemRoot: process.env.SystemRoot },
      });
      const found = z
        .string()
        .max(16384)
        .parse(whereResult.stdout)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && isAbsolute(line));
      candidates.push(...found);
    } catch {
      /* where failed or claude was not found on PATH */
    }
    const home = homedir();
    candidates.push(join(home, '.local', 'bin', 'claude.exe'));
    const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
    candidates.push(join(appData, 'npm', 'claude.cmd'));
    for (const directory of pathValue.split(delimiter).filter(isAbsolute)) {
      candidates.push(join(directory, 'claude.exe'), join(directory, 'claude.cmd'));
    }
  } else {
    for (const directory of pathValue.split(delimiter).filter(isAbsolute)) {
      candidates.push(join(directory, 'claude'));
    }
    candidates.push(join(homedir(), '.local/bin/claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude');
  }
  for (const candidate of new Set(candidates)) {
    try {
      const path = await executablePath(candidate);
      const isCmd = process.platform === 'win32' && /\.(cmd|bat)$/i.test(path);
      const file = isCmd ? (process.env.ComSpec ?? 'cmd.exe') : path;
      const args = isCmd ? ['/d', '/s', '/c', path, '--version'] : ['--version'];
      const { stdout } = await execute(file, args, {
        timeout: 5000,
        killSignal: 'SIGKILL',
        maxBuffer: 4096,
        encoding: 'utf8',
        env: {
          PATH: pathValue,
          HOME: homedir(),
          USER: process.env.USER,
          LOGNAME: process.env.LOGNAME,
          USERPROFILE: process.env.USERPROFILE ?? homedir(),
          APPDATA: process.env.APPDATA,
          LOCALAPPDATA: process.env.LOCALAPPDATA,
          ComSpec: process.env.ComSpec,
          SystemRoot: process.env.SystemRoot,
        },
      });
      return { path, version: z.string().trim().min(1).max(256).parse(stdout) };
    } catch {
      /* An unavailable or invalid candidate is not an installed tool. */
    }
  }
  return null;
}
