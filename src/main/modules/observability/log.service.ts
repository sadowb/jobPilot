import { app, ipcMain } from 'electron';
import log from 'electron-log/main';
import { chmodSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Logger } from '../../platform/logging/types';
import { redact } from './redact';

export type { Logger };

const LogLevelSchema = z.enum(['info', 'debug']).default('info');
export const ARCHIVE_COUNT = 5;
const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

type LevelFn = (...data: unknown[]) => void;
let initialized = false;

export const logsDirectory = (): string => join(app.getPath('userData'), 'logs');

/** main.log -> main.1.log -> ... -> main.5.log; the oldest archive is deleted. */
export function archiveLog(file: { toString(): string }): void {
  const path = file.toString();
  const archive = (index: number) => path.replace(/\.log$/, `.${index}.log`);
  rmSync(archive(ARCHIVE_COUNT), { force: true });
  for (let index = ARCHIVE_COUNT - 1; index >= 1; index--) {
    try {
      renameSync(archive(index), archive(index + 1));
    } catch {
      // Missing archives are expected until the log has rotated that many times.
    }
  }
  renameSync(path, archive(1));
}

const emailPattern = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const apiKeyPattern = /\bsk-[A-Za-z0-9_-]{16,}/g;

/** One JSON object per line. The message is already redacted; the pattern pass catches secrets inside free text. */
export function formatLine({
  data,
  date,
  level,
  scope,
}: {
  data: unknown[];
  date: Date;
  level: string;
  scope?: string;
}): string {
  const [first, ...rest] = data;
  const message = typeof first === 'string' ? first : '';
  const extra = typeof first === 'string' ? rest : data;
  const fields =
    extra.length === 1 && typeof extra[0] === 'object' && extra[0] !== null && !Array.isArray(extra[0])
      ? (extra[0] as Record<string, unknown>)
      : extra.length > 0
        ? { data: extra }
        : {};
  let line: string;
  try {
    line = JSON.stringify({ ...fields, time: date.toISOString(), level, module: scope ?? 'app', msg: message });
  } catch {
    line = JSON.stringify({ time: date.toISOString(), level, module: scope ?? 'app', msg: message });
  }
  return line.replace(emailPattern, '[EMAIL]').replace(apiKeyPattern, '[REDACTED]');
}

export function initLogService(): void {
  if (initialized) return;
  initialized = true;
  // The default logger registers renderer IPC on import; renderers report only through the zod-validated channel.
  ipcMain.removeAllListeners('__ELECTRON_LOG__');
  ipcMain.removeHandler('__ELECTRON_LOG__');

  const parsed = LogLevelSchema.safeParse(process.env.JOBPILOT_LOG_LEVEL);
  const level = parsed.success ? parsed.data : 'info';
  const directory = logsDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);

  log.addLevel('fatal', 0);
  log.hooks.push((message) => ({ ...message, data: redact(message.data) as unknown[] }));
  const file = log.transports.file;
  file.level = level;
  file.fileName = 'main.log';
  file.resolvePathFn = () => join(directory, 'main.log');
  file.maxSize = 10 * 1024 * 1024;
  file.archiveLogFn = archiveLog;
  file.writeOptions = { flag: 'a', mode: 0o600, encoding: 'utf8' };
  // Synchronous writes (the default) put a fatal line on disk before the process can exit.
  file.sync = true;
  file.transforms = [({ message }) => formatLine(message)];
  // Only the file (and dev console) transports run; nothing is sent to renderers or the network.
  for (const name of ['ipc', 'remote'] as const) {
    const transport = log.transports[name];
    if (transport) transport.level = false;
  }
  const devServer = !app.isPackaged && Boolean(process.env.ELECTRON_RENDERER_URL);
  log.transports.console.level = devServer ? level : false;

  if (!parsed.success)
    loggerFor('main').warn({ value: process.env.JOBPILOT_LOG_LEVEL }, 'Invalid JOBPILOT_LOG_LEVEL ignored');

  log.errorHandler.startCatching({
    showDialog: false,
    onError: ({ error, errorName }) => {
      const uncaught = errorName === 'Unhandled';
      loggerFor('main')[uncaught ? 'fatal' : 'error'](
        { err: error },
        uncaught ? 'Uncaught main-process exception' : 'Unhandled main-process rejection',
      );
      if (uncaught) app.quit();
      return false;
    },
  });

  log.eventLogger.startLogging({
    scope: 'electron',
    level: 'error',
    events: {
      app: { 'certificate-error': true, 'child-process-gone': true, 'render-process-gone': true },
      webContents: {
        'did-fail-load': true,
        'did-fail-provisional-load': true,
        'plugin-crashed': true,
        'preload-error': true,
        unresponsive: true,
        responsive: true,
      },
    },
  });
}

export function loggerFor(module: string): Logger {
  if (!initialized) throw new Error('LogService has not been initialized');
  const scoped = log.scope(module) as unknown as Record<(typeof LEVELS)[number], LevelFn>;
  const bind =
    (name: (typeof LEVELS)[number]): Logger['info'] =>
    (fields, message) =>
      typeof fields === 'string' ? scoped[name](fields) : scoped[name](message ?? '', fields);
  return Object.fromEntries(LEVELS.map((name) => [name, bind(name)])) as unknown as Logger;
}
