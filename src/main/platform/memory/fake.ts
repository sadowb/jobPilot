import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MemoryStatus } from '../../../shared/dto';
import type { McpServerConfig } from '../agents/types';
import type { MemoryProvider } from './types';

/** E2E stand-in for Mnemosyne: no network, no Python, no process. Notes persist under userData/mnemosyne. */
export class FakeMemoryProvider implements MemoryProvider {
  private current: MemoryStatus = { state: 'not_installed', step: null, percent: null, error: null };
  installs = 0;
  consolidations = 0;
  private readonly dataDir: string;

  constructor(
    userData: string,
    private readonly onReady: () => void,
  ) {
    this.dataDir = join(userData, 'mnemosyne');
  }

  status() {
    return this.current;
  }

  install() {
    if (this.current.state !== 'not_installed') return this.current;
    this.installs++;
    this.current = { state: 'installing', step: 'Fake install', percent: 50, error: null };
    setTimeout(() => {
      mkdirSync(this.dataDir, { recursive: true });
      this.current = { state: 'ready', step: null, percent: null, error: null };
      this.onReady();
    }, 300);
    return this.current;
  }

  async remove() {
    rmSync(this.dataDir, { recursive: true, force: true });
    this.current = { state: 'not_installed', step: null, percent: null, error: null };
    return this.current;
  }

  mcpServerConfig(): McpServerConfig | undefined {
    return this.current.state === 'ready'
      ? { type: 'stdio', command: 'jobpilot-fake-memory', args: ['mcp'], env: { MNEMOSYNE_DATA_DIR: this.dataDir } }
      : undefined;
  }

  async consolidate() {
    if (this.current.state === 'ready') this.consolidations++;
  }

  async stop() {}

  /** What the fake agent's remember/recall tool calls do. */
  remember(note: string) {
    writeFileSync(join(this.dataDir, 'notes.json'), JSON.stringify([...this.recall(''), note]));
  }

  recall(query: string): string[] {
    try {
      const notes = JSON.parse(readFileSync(join(this.dataDir, 'notes.json'), 'utf8')) as string[];
      return notes.filter((note) => note.includes(query));
    } catch {
      return [];
    }
  }
}
