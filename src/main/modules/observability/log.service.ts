import { app } from 'electron';
import pino, { type Logger } from 'pino';
import { chmodSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { redact } from './redact';

export const MAX_LOG_BYTES = 10 * 1024 * 1024;
export const ARCHIVE_COUNT = 5;
const ROTATION_CHECK_MS = 5 * 60 * 1000;
const LogLevelSchema = z.enum(['info', 'debug']).default('info');

const personalPatterns: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[EMAIL]'],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]'],
  [/\+\d[\d\s().-]{6,}\d|\(\d{2,4}\)[\s.-]?\d[\d\s.-]{5,}\d|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g, '[PHONE]'],
];

function accountName(): string {
  try {
    return userInfo().username;
  } catch {
    return ''; // no passwd entry (some containers): the home path is still scrubbed
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces the account's home directory (also its JSON-escaped form, for raw log lines) with `~` and the
 * username with `<user>`, so shared text does not name the owner. Usernames under three characters are skipped:
 * they would mangle unrelated words.
 */
export function scrubIdentity(text: string, home = homedir(), username = accountName()): string {
  let result = text;
  for (const path of new Set([home, JSON.stringify(home).slice(1, -1)]))
    if (path.length > 1) result = result.replace(new RegExp(escapeRegExp(path), 'g'), '~');
  return username.length < 3
    ? result
    : result.replace(new RegExp(`(?<![\\w.-])${escapeRegExp(username)}(?![\\w-])`, 'gi'), '<user>');
}

function scrubStrings(value: unknown): unknown {
  if (typeof value === 'string')
    return personalPatterns.reduce((text, [pattern, mask]) => text.replace(pattern, mask), scrubIdentity(value));
  if (Array.isArray(value)) return value.map(scrubStrings);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubStrings(item)]));
  return value;
}

/** redact() handles keys and key=value text; this also masks emails, sk- keys and phone numbers inside strings. */
export function scrub(object: object): Record<string, unknown> {
  return scrubStrings(redact(object)) as Record<string, unknown>;
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
  // pino-roll wrote jobpilot*.log; nothing rotates those any more.
  for (const name of readdirSync(directory))
    if (/^jobpilot.*\.log$/.test(name)) rmSync(join(directory, name), { force: true });
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
