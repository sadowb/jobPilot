import { app } from 'electron';
import pino, { type Logger } from 'pino';
import { chmodSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { redact } from './redact';

export const MAX_LOG_BYTES = 10 * 1024 * 1024;
export const ARCHIVE_COUNT = 5;
const ROTATION_CHECK_MS = 5 * 60 * 1000;
const LogLevelSchema = z.enum(['info', 'debug']).default('info');

const emailPattern = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const apiKeyPattern = /\bsk-[A-Za-z0-9_-]{16,}/g;

/** redact() handles keys and key=value text; this catches emails and sk- keys inside free text. */
export function scrub(object: object): Record<string, unknown> {
  const redacted = redact(object);
  try {
    const text = JSON.stringify(redacted).replace(emailPattern, '[EMAIL]').replace(apiKeyPattern, '[REDACTED]');
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return redacted as Record<string, unknown>;
  }
}

let root: Logger | undefined;
let destination: ReturnType<typeof pino.destination> | undefined;

export const logsDirectory = (): string => join(app.getPath('userData'), 'logs');

/** main.log -> main.1.log -> ... -> main.5.log; the oldest archive is deleted. Returns whether it rotated. */
export function rotateLog(path: string, maxBytes = MAX_LOG_BYTES): boolean {
  try {
    if (statSync(path).size <= maxBytes) return false;
  } catch {
    return false;
  }
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
  return true;
}

export function initLogService(): void {
  if (root) return;
  const parsed = LogLevelSchema.safeParse(process.env.JOBPILOT_LOG_LEVEL);
  const directory = logsDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = join(directory, 'main.log');
  rotateLog(file);
  // sync: a fatal line must be on disk before the process can exit.
  destination = pino.destination({ dest: file, mkdir: true, sync: true, mode: 0o600 });
  root = pino(
    {
      level: parsed.success ? parsed.data : 'info',
      formatters: { log: scrub },
      // Redaction already serializes errors; pino would reclassify the plain result as Object.
      serializers: { err: (error: unknown) => error },
      base: { app: 'jobpilot' },
    },
    destination,
  );
  if (!parsed.success) root.warn({ value: process.env.JOBPILOT_LOG_LEVEL }, 'Invalid JOBPILOT_LOG_LEVEL ignored');
  // In-app size rotation: no library; reopen() makes pino's writer follow the renamed file.
  setInterval(() => {
    if (rotateLog(file)) destination?.reopen();
  }, ROTATION_CHECK_MS).unref();
}

/** Force buffered lines to disk; used before a fatal exit. */
export function flushLogs(): void {
  try {
    destination?.flushSync();
  } catch {
    // Nothing more can be done while exiting.
  }
}

export function loggerFor(module: string): Logger {
  if (!root) throw new Error('LogService has not been initialized');
  return root.child({ module });
}
