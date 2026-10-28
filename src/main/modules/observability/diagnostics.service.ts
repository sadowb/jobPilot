import { app, BrowserWindow, crashReporter, dialog, shell } from 'electron';
import { zipSync, strToU8 } from 'fflate';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { release } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { logsDirectory, loggerFor } from './log.service';

const crashDirectory = (): string => join(app.getPath('userData'), 'crashes');
const markerPath = (): string => join(logsDirectory(), 'session.lock');
const MAX_RUN_TRACES = 100;

/** Crash dumps stay under userData (ADR 0016) and are never uploaded. Must run before app ready. */
export function initCrashReporting(): void {
  mkdirSync(crashDirectory(), { recursive: true, mode: 0o700 });
  app.setPath('crashDumps', crashDirectory());
  crashReporter.start({ uploadToServer: false, compress: true });
}

const MarkerSchema = z.object({ startedAt: z.string(), pid: z.number() });

/** session.lock exists only while a session runs; finding it at launch means the last one never quit cleanly. */
export function startSession(): void {
  const logger = loggerFor('main');
  const marker = markerPath();
  if (existsSync(marker)) {
    let previous: z.infer<typeof MarkerSchema> | undefined;
    try {
      previous = MarkerSchema.parse(JSON.parse(readFileSync(marker, 'utf8')));
    } catch {
      // A torn marker still proves the previous session did not clean up.
    }
    logger.warn(
      { previous_started_at: previous?.startedAt, previous_pid: previous?.pid },
      'Previous session ended unexpectedly',
    );
  }
  writeFileSync(marker, JSON.stringify({ startedAt: new Date().toISOString(), pid: process.pid }), { mode: 0o600 });
  app.once('quit', () => rmSync(marker, { force: true }));
  logger.info(
    { version: app.getVersion(), electron: process.versions.electron, crash_dumps: app.getPath('crashDumps') },
    'Session started',
  );
}

export async function showLogs(): Promise<void> {
  const directory = logsDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const failure = await shell.openPath(directory);
  if (failure) loggerFor('main').error({ failure }, 'Could not open the logs folder');
}

function filesIn(directory: string, pattern: RegExp): string[] {
  try {
    return readdirSync(directory).filter((name) => pattern.test(name));
  } catch {
    return [];
  }
}

/** Zip of the redacted logs, newest run traces, crash dump names and versions. No database, no secrets, no dump contents. */
export function buildDiagnostics(): Uint8Array {
  const logs = logsDirectory();
  const files: Record<string, Uint8Array> = {};
  for (const name of filesIn(logs, /^main(\.\d+)?\.log$/)) files[`logs/${name}`] = readFileSync(join(logs, name));
  const runs = filesIn(join(logs, 'runs'), /\.jsonl$/)
    .map((name) => ({ name, mtime: statSync(join(logs, 'runs', name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_RUN_TRACES);
  for (const { name } of runs) files[`logs/runs/${name}`] = readFileSync(join(logs, 'runs', name));
  const crashStats = readdirSync(crashDirectory(), { recursive: true })
    .map(String)
    .filter((name) => name.endsWith('.dmp'))
    .map((name) => ({ name, bytes: statSync(join(crashDirectory(), name)).size }));
  files['info.json'] = strToU8(
    JSON.stringify(
      {
        app: app.getVersion(),
        packaged: app.isPackaged,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        platform: process.platform,
        arch: process.arch,
        os_release: release(),
        generated_at: new Date().toISOString(),
        crash_dumps: crashStats,
      },
      null,
      2,
    ),
  );
  // shortcut: synchronous zip on the main thread; fine for <=60 MB of logs, move to a worker if exports feel slow.
  return zipSync(files, { level: 6 });
}

export async function exportDiagnostics(): Promise<void> {
  const logger = loggerFor('main');
  const window = BrowserWindow.getFocusedWindow() ?? undefined;
  const options = {
    title: 'Export diagnostics',
    defaultPath: `jobpilot-diagnostics-${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: 'Zip archive', extensions: ['zip'] }],
  };
  const { canceled, filePath } = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (canceled || !filePath) return;
  try {
    writeFileSync(filePath, buildDiagnostics());
    chmodSync(filePath, 0o600);
    logger.info('Diagnostics exported');
  } catch (error) {
    logger.error({ err: error }, 'Diagnostics export failed');
    await dialog.showMessageBox({ type: 'error', message: 'JobPilot could not export diagnostics.' });
  }
}
