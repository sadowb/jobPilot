// Installs Mnemosyne for real (network: GitHub release, python-build-standalone, PyPI) into a throwaway
// userData and fails unless it ends `ready`. The installer itself runs `mnemosyne sleep --help` before marking ready.
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MnemosyneMemory } from '../src/main/platform/memory/mnemosyne';

const log = (level: string) => (obj: unknown, msg?: string) =>
  console.log(`[${level}]`, msg ?? '', JSON.stringify(obj));

async function main(): Promise<void> {
  const userData = await mkdtemp(join(tmpdir(), 'jobpilot-memory-smoke-'));
  const memory = new MnemosyneMemory(userData, {
    logger: { info: log('info'), warn: log('warn'), error: log('error') },
  });
  try {
    memory.install();
    const deadline = Date.now() + 12 * 60_000;
    let last = '';
    while (memory.status().state === 'installing' && Date.now() < deadline) {
      const step = memory.status().step ?? '';
      if (step !== last) console.log(`step: ${step}`);
      last = step;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const status = memory.status();
    if (status.state !== 'ready') throw new Error(`memory install ended ${status.state}: ${status.error ?? 'timeout'}`);
    const config = memory.mcpServerConfig();
    if (config?.type !== 'stdio' || !existsSync(config.command))
      throw new Error('ready but the entry point is missing');
    console.log(`OK: Mnemosyne installed on ${process.platform}-${process.arch}, sleep --help ran (${config.command})`);
  } finally {
    await memory.stop();
    await rm(userData, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
