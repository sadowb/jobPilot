import { join } from 'node:path';
import { app, utilityProcess } from 'electron';
import { z } from 'zod';

/** The agent prompt carries at most this much CV text; a 1 to 3 page CV is ~10k characters. */
export const CV_TEXT_MAX = 60_000;
const READ_TIMEOUT_MS = 30_000;

const ReplySchema = z.union([
  z.object({ ok: z.literal(true), text: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const running = new Set<Electron.UtilityProcess>();
// Quit stops every reader (ADR 0016: owned children never outlive the app).
app.on('before-quit', () => running.forEach((child) => child.kill()));

/**
 * Text of a PDF or DOCX, read in a short-lived Electron utility process (Electron's recommended home for "untrusted
 * services" and "crash prone components"): the file is untrusted input and the parsers are third-party code, so a crash,
 * hang or runaway allocation costs one child, not the app. The child gets an empty environment and no stdio.
 * shortcut: a utility process is a fault boundary, not an OS sandbox (it still has Node APIs); upgrade if Electron exposes a sandboxed utility process.
 */
export function cvText(bytes: Uint8Array): Promise<string> {
  const reader = new Promise<string>((resolve, reject) => {
    const child = utilityProcess.fork(join(__dirname, 'cv-worker.js'), [], {
      serviceName: 'jobpilot-cv-reader',
      stdio: 'ignore',
      env: {},
    });
    running.add(child);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('That file took too long to read.'));
    }, READ_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      running.delete(child);
    };
    child.once('message', (raw: unknown) => {
      done();
      child.kill();
      const reply = ReplySchema.safeParse(raw);
      if (reply.success && reply.data.ok) resolve(reply.data.text);
      else reject(new Error(reply.success && !reply.data.ok ? reply.data.error : 'Could not read that file.'));
    });
    child.once('exit', () => {
      done();
      reject(new Error('Could not read that file.'));
    });
    child.postMessage({ bytes });
  });
  return reader.then((raw) => {
    const text = raw
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length < 40) throw new Error('No readable text in this file (a scanned CV needs OCR).');
    return text.slice(0, CV_TEXT_MAX);
  });
}
