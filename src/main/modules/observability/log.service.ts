import { app } from 'electron';
import pino, { type Logger } from 'pino';
import { chmodSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { redact } from './redact';

let root: Logger | undefined;

export function initLogService(): void {
  const directory = join(app.getPath('userData'), 'logs');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const transport = pino.transport({
    target: 'pino-roll',
    options: {
      file: join(directory, 'jobpilot.log'),
      frequency: 'daily',
      size: '10m',
      mkdir: true,
      limit: { count: 14 },
    },
  });
  root = pino(
    {
      level: 'info',
      formatters: { log: (object) => redact(object) as Record<string, unknown> },
      // Redaction already serializes errors; pino would reclassify the plain result as Object.
      serializers: { err: (error: unknown) => error },
      base: { app: 'jobpilot' },
    },
    transport,
  );
}

export function loggerFor(module: string): Logger {
  if (!root) throw new Error('LogService has not been initialized');
  return root.child({ module });
}
