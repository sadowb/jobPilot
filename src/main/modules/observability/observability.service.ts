import { appendFileSync, chmodSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { redact } from './redact';
import {
  RecordAuditEventSchema,
  RunTraceInputSchema,
  type RecordAuditEvent,
  type RunTraceInput,
} from './observability.dto';
import { appendRunEvent, insertAuditEvent } from './observability.repository';

export const AuditService = {
  record(input: RecordAuditEvent): void {
    const event = RecordAuditEventSchema.parse(input);
    insertAuditEvent(event);
  },
};

export const RunTraceService = {
  append(input: RunTraceInput) {
    const parsed = RunTraceInputSchema.parse(input);
    const event = { ...parsed, payload: redact(parsed.payload) };
    const persisted = appendRunEvent(event.runId, event.type, event.payload);
    const directory = join(app.getPath('userData'), 'logs', 'runs');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const file = join(directory, `${event.runId}.jsonl`);
    appendFileSync(
      file,
      `${JSON.stringify({ ...persisted, runId: event.runId, type: event.type, payload: event.payload })}\n`,
      {
        encoding: 'utf8',
        mode: 0o600,
      },
    );
    if (existsSync(file)) chmodSync(file, 0o600);
    return persisted;
  },
};
