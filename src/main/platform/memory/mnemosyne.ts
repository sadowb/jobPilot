import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { setPriority } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execa } from 'execa';
import type { Logger } from '../logging/types';
import { z } from 'zod';
import type { MemoryStatus } from '../../../shared/dto';
import type { McpServerConfig } from '../agents/types';
import type { MemoryProvider } from './types';

/** Pinned by the release (ADR 0015); bump only with a JobPilot release. */
export const UV_VERSION = '0.13.6';
export const MNEMOSYNE_VERSION = '4.0.0';
const PYTHON_VERSION = '3.12';
// shortcut: transitive deps are frozen by date, not a lockfile; ship a uv.lock in resources/tools when Mnemosyne ships a stable cadence.
const RESOLVE_CUTOFF = '2026-10-28T00:00:00Z';
// shortcut: macOS only (tar.gz); add the Windows zip assets with the Windows memory lane.
const UV_ASSETS: Record<string, { file: string; sha256: string }> = {
  'darwin-arm64': {
    file: 'uv-aarch64-apple-darwin',
    sha256: '60fbd5c8a1ed681845eea28d9d622fcde03c51e91a43465b64a1e17db1ed3472',
  },
  'darwin-x64': {
    file: 'uv-x86_64-apple-darwin',
    sha256: '63ba17fdda55ad1a230d4b37fc6017ffa10c23688c83818bd3bfdf914c652a02',
  },
};
const MinimalPath = '/usr/bin:/bin';
const MarkerSchema = z.object({ uv: z.literal(UV_VERSION), mnemosyne: z.literal(MNEMOSYNE_VERSION) });

class InstallError extends Error {}

export interface MnemosyneOptions {
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
  /** Called once the tool becomes ready (install finished or found at startup). */
  onReady?: () => void;
  /** Test seam for the download; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Mnemosyne memory over MCP stdio, installed on the owner's request (ADR 0015) into userData:
 *   userData/tools/mnemosyne/  uv, managed Python, the uv tool venv, a private HOME/TMPDIR
 *   userData/mnemosyne/        the memory data (MNEMOSYNE_DATA_DIR)
 * Everything the install touches is confined by explicit UV_* variables and a private HOME.
 */
export class MnemosyneMemory implements MemoryProvider {
  private readonly root: string;
  private readonly dataDir: string;
  private readonly marker: string;
  private readonly uvBin: string;
  private readonly toolBin: string;
  private current: MemoryStatus;
  private running?: Promise<void>;
  private controller = new AbortController();

  constructor(
    userData: string,
    private readonly options: MnemosyneOptions,
  ) {
    this.root = join(userData, 'tools', 'mnemosyne');
    this.dataDir = join(userData, 'mnemosyne');
    this.marker = join(this.root, 'ready.json');
    this.uvBin = join(this.root, 'uv', 'uv');
    this.toolBin = join(this.root, 'bin', 'mnemosyne');
    this.current = this.installed() ? this.set('ready') : this.set('not_installed');
  }

  status(): MemoryStatus {
    return this.current;
  }

  install(): MemoryStatus {
    if (this.current.state === 'ready' || this.running) return this.current;
    this.controller = new AbortController();
    this.set('installing', { step: 'Starting' });
    this.running = this.doInstall(this.controller.signal)
      .then(() => {
        this.set('ready');
        this.options.logger.info({ uv: UV_VERSION, mnemosyne: MNEMOSYNE_VERSION }, 'Memory tool installed');
        this.options.onReady?.();
      })
      .catch(async (error: unknown) => {
        await rm(this.root, { recursive: true, force: true });
        if (this.controller.signal.aborted) return;
        const message = error instanceof InstallError ? error.message : 'Install failed. Try again.';
        this.options.logger.error(
          { error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
          message,
        );
        this.set('failed', { error: message });
      })
      .finally(() => {
        this.running = undefined;
      });
    return this.current;
  }

  async remove(): Promise<MemoryStatus> {
    await this.stop();
    await Promise.all([this.root, this.dataDir].map((path) => rm(path, { recursive: true, force: true })));
    this.options.logger.info({}, 'Memory tool and data removed');
    return this.set('not_installed');
  }

  mcpServerConfig(): McpServerConfig | undefined {
    if (this.current.state !== 'ready') return undefined;
    return { type: 'stdio', command: this.toolBin, args: ['mcp'], env: this.runtimeEnv() };
  }

  async consolidate(signal: AbortSignal): Promise<void> {
    if (this.current.state !== 'ready') return;
    await this.exec(this.toolBin, ['sleep', '--all-sessions'], this.runtimeEnv(), signal, 600_000);
  }

  async stop(): Promise<void> {
    this.controller.abort();
    await this.running;
    this.controller = new AbortController();
  }

  private set(state: MemoryStatus['state'], extra: Partial<MemoryStatus> = {}): MemoryStatus {
    this.current = { state, step: null, percent: null, error: null, ...extra };
    return this.current;
  }

  private installed(): boolean {
    try {
      MarkerSchema.parse(JSON.parse(readFileSync(this.marker, 'utf8')));
      return existsSync(this.toolBin);
    } catch {
      return false;
    }
  }

  /** No inherited environment: nothing from the app's env or the owner's shell reaches the memory process. */
  private runtimeEnv(): Record<string, string> {
    return {
      PATH: MinimalPath,
      HOME: join(this.root, 'home'),
      TMPDIR: join(this.root, 'tmp'),
      LANG: 'en_US.UTF-8',
      MNEMOSYNE_DATA_DIR: this.dataDir,
    };
  }

  private uvEnv(): Record<string, string> {
    return {
      ...this.runtimeEnv(),
      UV_CACHE_DIR: join(this.root, 'cache'),
      UV_TOOL_DIR: join(this.root, 'tools'),
      UV_TOOL_BIN_DIR: join(this.root, 'bin'),
      UV_PYTHON_INSTALL_DIR: join(this.root, 'python'),
      UV_PYTHON_BIN_DIR: join(this.root, 'python-bin'),
      UV_PYTHON_PREFERENCE: 'only-managed',
      UV_NO_CONFIG: '1',
      UV_NO_PROGRESS: '1',
    };
  }

  private async exec(file: string, args: string[], env: Record<string, string>, signal: AbortSignal, timeout: number) {
    const child = execa(file, args, {
      env,
      extendEnv: false,
      cwd: this.root,
      cancelSignal: signal,
      timeout,
      stdin: 'ignore',
      cleanup: true,
    });
    try {
      if (child.pid) setPriority(child.pid, 10);
    } catch {
      /* Already exited. */
    }
    return child;
  }

  private async doInstall(signal: AbortSignal): Promise<void> {
    const asset = UV_ASSETS[`${process.platform}-${process.arch}`];
    if (!asset) throw new InstallError('Memory install supports macOS only for now.');
    await rm(this.root, { recursive: true, force: true });
    for (const dir of ['home', 'tmp', 'uv']) await mkdir(join(this.root, dir), { recursive: true, mode: 0o700 });
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 });

    const archive = join(this.root, 'uv.tar.gz');
    await this.retry(signal, 3, () => this.download(asset, archive, signal));
    this.set('installing', { step: 'Unpacking uv' });
    await this.exec(
      '/usr/bin/tar',
      ['-xzf', archive, '-C', join(this.root, 'uv'), '--strip-components=1'],
      { PATH: MinimalPath },
      signal,
      60_000,
    );
    await rm(archive, { force: true });
    if (!(await stat(this.uvBin).catch(() => undefined)))
      throw new InstallError('The uv download was unusable. Try again.');

    this.set('installing', { step: 'Installing Python and Mnemosyne' });
    await this.retry(signal, 2, () =>
      this.exec(
        this.uvBin,
        [
          'tool',
          'install',
          '--python',
          PYTHON_VERSION,
          '--no-build',
          '--exclude-newer',
          RESOLVE_CUTOFF,
          `mnemosyne-memory[mcp]==${MNEMOSYNE_VERSION}`,
        ],
        this.uvEnv(),
        signal,
        900_000,
      ),
    );
    // The uv cache duplicates the installed wheels (~60 MB); the install is pinned so it is never reused.
    await rm(join(this.root, 'cache'), { recursive: true, force: true });
    // A no-side-effect smoke check that the entry point and its interpreter work.
    await this.exec(this.toolBin, ['sleep', '--help'], this.runtimeEnv(), signal, 30_000).catch(() => {
      throw new InstallError('Mnemosyne installed but did not start. Try again.');
    });
    await writeFile(this.marker, JSON.stringify({ uv: UV_VERSION, mnemosyne: MNEMOSYNE_VERSION }), { mode: 0o600 });
  }

  private async retry(signal: AbortSignal, attempts: number, task: () => Promise<unknown>): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await task();
        return;
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof InstallError || attempt >= attempts) {
          if (error instanceof InstallError) throw error;
          const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).slice(-300) : undefined;
          this.options.logger.error({ stderr }, 'Memory install step failed');
          throw new InstallError('Download failed. Check your connection and try again.');
        }
        const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).slice(-300) : undefined;
        this.options.logger.warn({ attempt, stderr }, 'Memory install step failed; retrying');
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  private async download(asset: { file: string; sha256: string }, to: string, signal: AbortSignal): Promise<void> {
    const url = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${asset.file}.tar.gz`;
    const response = await (this.options.fetchImpl ?? fetch)(url, { signal });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get('content-length')) || 0;
    const hash = createHash('sha256');
    let received = 0;
    const body = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream<Uint8Array>);
    body.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      received += chunk.length;
      this.set('installing', {
        step: 'Downloading uv',
        percent: total ? Math.min(100, Math.floor((received / total) * 100)) : null,
      });
    });
    const partial = `${to}.partial`;
    await pipeline(body, createWriteStream(partial, { mode: 0o600 }), { signal });
    if (hash.digest('hex') !== asset.sha256) {
      await rm(partial, { force: true });
      throw new InstallError('The uv download failed its checksum and was discarded.');
    }
    await rename(partial, to);
    await chmod(to, 0o600);
  }
}
