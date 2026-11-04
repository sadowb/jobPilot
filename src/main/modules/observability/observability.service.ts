import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { app } from 'electron';
import { redact } from './redact';
import {
  RecordAuditEventSchema,
  RunTraceInputSchema,
  type RecordAuditEvent,
  type RunTraceInput,
} from './observability.dto';
import { appendRunEvent, insertAuditEvent, pruneRunEvents } from './observability.repository';
import { loggerFor } from './log.service';

export const AuditService = {
  record(input: RecordAuditEvent): void {
    const event = RecordAuditEventSchema.parse(input);
    insertAuditEvent(event);
  },
};

const PREFIX = 'v1.';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export const DEFAULT_RETENTION_DAYS = 30;
export const DEFAULT_RETENTION_MS = DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

let transcriptKey: Buffer | null = null;
let warnedKeyUnavailable = false;

/** HKDF-SHA256 subkey: a transcript leak or oracle never exposes the database key itself. */
export function deriveTranscriptKey(databaseKey: Buffer): Buffer {
  return Buffer.from(hkdfSync('sha256', databaseKey, Buffer.alloc(0), 'jobpilot-transcript-v1', 32));
}

/** Takes the database key and derives the subkey; null clears it. Tests inject their key here. */
export function setTranscriptKey(databaseKey: Buffer | null): void {
  transcriptKey = databaseKey ? deriveTranscriptKey(databaseKey) : null;
  warnedKeyUnavailable = false;
}

function seal(plaintext: string, runId: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(runId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

/** Returns null for a record that is malformed, tampered with or sealed for another run. */
function open(record: string, runId: string, key: Buffer): string | null {
  try {
    const bytes = Buffer.from(record.slice(PREFIX.length), 'base64');
    if (bytes.length < IV_LENGTH + TAG_LENGTH) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, IV_LENGTH));
    decipher.setAAD(Buffer.from(runId, 'utf8'));
    decipher.setAuthTag(bytes.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
    return Buffer.concat([decipher.update(bytes.subarray(IV_LENGTH + TAG_LENGTH)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function runsDirectory(): string {
  return join(app.getPath('userData'), 'logs', 'runs');
}

const traceFile = (runId: string): string => join(runsDirectory(), `${runId}.jsonl`);

/** Legacy plaintext lines (no `v1.` prefix) are returned as they are; sealed lines that fail to open are counted. */
function readTrace(runId: string): { lines: string[]; skipped: number } {
  const file = traceFile(runId);
  const result = { lines: [] as string[], skipped: 0 };
  if (!existsSync(file)) return result;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    if (!line.startsWith(PREFIX)) {
      result.lines.push(line);
      continue;
    }
    const plaintext = transcriptKey ? open(line, runId, transcriptKey) : null;
    if (plaintext === null) result.skipped++;
    else result.lines.push(plaintext);
  }
  return result;
}

/** Rewrites a file that still holds plaintext lines as sealed records: temp file + atomic rename, so a crash keeps the old file. */
function migrateFile(runId: string, key: Buffer): void {
  const file = traceFile(runId);
  if (
    !readFileSync(file, 'utf8')
      .split('\n')
      .some((line) => line && !line.startsWith(PREFIX))
  )
    return;
  const { lines } = readTrace(runId);
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, lines.map((line) => `${seal(line, runId, key)}\n`).join(''), { mode: 0o600 });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export const RunTraceService = {
  /**
   * Startup, before any run: derives the transcript key from the database key and seals transcripts that older
   * builds wrote as plaintext. Without the key, appends keep only metadata (see append).
   */
  async init(getDatabaseKey: () => Promise<Buffer>): Promise<void> {
    const databaseKey = await getDatabaseKey();
    try {
      setTranscriptKey(databaseKey);
    } finally {
      databaseKey.fill(0);
    }
    const key = transcriptKey;
    if (!key || !existsSync(runsDirectory())) return;
    for (const name of readdirSync(runsDirectory())) {
      if (!name.endsWith('.jsonl')) continue;
      try {
        migrateFile(name.slice(0, -'.jsonl'.length), key);
      } catch (error) {
        loggerFor('observability').error(
          {
            run_id: name.slice(0, -'.jsonl'.length),
            error_class: error instanceof Error ? error.constructor.name : 'Unknown',
          },
          'Run transcript migration failed',
        );
      }
    }
  },

  append(input: RunTraceInput) {
    const parsed = RunTraceInputSchema.parse(input);
    const event = { ...parsed, payload: redact(parsed.payload) };
    const persisted = appendRunEvent(event.runId, event.type, event.payload);
    const directory = runsDirectory();
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const file = traceFile(event.runId);
    const meta = { ...persisted, runId: event.runId, type: event.type };
    // Never plaintext and never a throw into the run: without the key only type/seq metadata is kept.
    let record: string;
    if (transcriptKey) {
      record = seal(JSON.stringify({ ...meta, payload: event.payload }), event.runId, transcriptKey);
    } else {
      record = JSON.stringify({
        id: meta.id,
        seq: meta.seq,
        createdAt: meta.createdAt,
        runId: meta.runId,
        type: meta.type,
      });
      if (!warnedKeyUnavailable) {
        warnedKeyUnavailable = true;
        loggerFor('observability').error(
          { run_id: event.runId },
          'Transcript key unavailable; run transcripts keep type and seq only',
        );
      }
    }
    try {
      // The leading newline isolates this record from a torn final line left by a crash.
      appendFileSync(file, `\n${record}`, { encoding: 'utf8', mode: 0o600 });
      chmodSync(file, 0o600);
    } catch (error) {
      loggerFor('observability').error(
        { run_id: event.runId, error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
        'Run transcript write failed',
      );
    }
    return persisted;
  },

  /** Decrypted JSON lines; corrupt or tampered records are skipped and counted, never fatal for the rest. */
  readTrace,

  readLines(runId: string): string[] {
    return readTrace(runId).lines;
  },

  read(runId: string): Array<Record<string, unknown>> {
    const events: Array<Record<string, unknown>> = [];
    for (const line of readTrace(runId).lines) {
      try {
        events.push(JSON.parse(line) as Record<string, unknown>);
      } catch {
        // Drop malformed lines from legacy transcripts
      }
    }
    return events;
  },

  /** Deletes transcripts not written to for maxAgeMs; returns file names. */
  prune(maxAgeMs: number = DEFAULT_RETENTION_MS): { deleted: string[]; kept: string[] } {
    const directory = runsDirectory();
    const result = { deleted: [] as string[], kept: [] as string[] };
    if (!existsSync(directory)) return result;
    const now = Date.now();
    for (const name of readdirSync(directory)) {
      if (!name.endsWith('.jsonl')) continue;
      const file = join(directory, name);
      try {
        if (now - statSync(file).mtimeMs > maxAgeMs) {
          rmSync(file, { force: true });
          result.deleted.push(name);
        } else {
          result.kept.push(name);
        }
      } catch {
        // File may have been concurrently removed
      }
    }
    return result;
  },

  /** Remove-all-data hook; it runs before the database closes, so the rows can go too. */
  clear(): void {
    const directory = runsDirectory();
    if (existsSync(directory)) {
      for (const name of readdirSync(directory)) {
        if (name.endsWith('.jsonl')) rmSync(join(directory, name), { force: true });
      }
    }
    try {
      pruneRunEvents(Number.MAX_SAFE_INTEGER);
    } catch {
      // Database already closed.
    }
  },
};
