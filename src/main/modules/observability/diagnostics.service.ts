import { app, BrowserWindow, crashReporter, dialog, shell, type WebContents } from 'electron';
import { zipSync, strToU8 } from 'fflate';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { release } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { flushLogs, logsDirectory, loggerFor, scrub } from './log.service';

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
  let droppedTraceLines = 0;
  for (const { name } of runs) {
    // Run traces hold agent prompts and form answers: scrub every line, drop what cannot be parsed.
    const kept: string[] = [];
    for (const line of readFileSync(join(logs, 'runs', name), 'utf8').split('\n')) {
      if (!line) continue;
      try {
        kept.push(JSON.stringify(scrub(JSON.parse(line) as object)));
      } catch {
        droppedTraceLines++;
      }
    }
    files[`logs/runs/${name}`] = strToU8(kept.map((line) => `${line}\n`).join(''));
  }
  const crashStats = (existsSync(crashDirectory()) ? readdirSync(crashDirectory(), { recursive: true }) : [])
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
        dropped_run_trace_lines: droppedTraceLines,
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
  const confirm = {
    type: 'question' as const,
    buttons: ['Export', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    message: 'Export diagnostics?',
    detail:
      'The diagnostics file contains app logs and agent activity for recent runs (emails and keys removed). It does not contain your database or passwords.',
  };
  const { response } = window ? await dialog.showMessageBox(window, confirm) : await dialog.showMessageBox(confirm);
  if (response !== 0) return;
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

/** Origin and path only; query strings can carry tokens. */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin === 'null' ? parsed.protocol : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'unparseable';
  }
}

/** Main-process fatal handling and app-level process events. Must run before app ready. */
export function installCrashHandlers(): void {
  const logger = loggerFor('electron');
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught main-process exception');
    flushLogs();
    app.quit();
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason instanceof Error ? reason : String(reason) }, 'Unhandled main-process rejection');
  });
  app.on('render-process-gone', (_event, contents, details) => {
    logger.error(
      { reason: details.reason, exit_code: details.exitCode, url: safeUrl(contents.getURL()) },
      'Renderer process gone',
    );
  });
  app.on('child-process-gone', (_event, details) => {
    logger.error(
      { type: details.type, reason: details.reason, exit_code: details.exitCode, name: details.name },
      'Child process gone',
    );
  });
  // Logging only: no preventDefault, so Electron keeps rejecting the certificate.
  app.on('certificate-error', (_event, _contents, url, error) => {
    logger.error({ error, url: safeUrl(url) }, 'Certificate error');
  });
}

/** Per-WebContents diagnostics; called from the existing web-contents-created hook. */
export function watchContents(contents: WebContents): void {
  const logger = loggerFor('electron');
  contents.on('unresponsive', () => logger.warn({ id: contents.id }, 'Renderer unresponsive'));
  contents.on('responsive', () => logger.info({ id: contents.id }, 'Renderer responsive again'));
  contents.on('preload-error', (_event, preloadPath, error) =>
    logger.error({ preload: preloadPath, err: error }, 'Preload script failed'),
  );
  contents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    logger.error({ code, description, url: safeUrl(url), main_frame: isMainFrame }, 'Page failed to load');
  });
}
