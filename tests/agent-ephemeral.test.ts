import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/main/platform/db/schema';
import type { JobPilotDb } from '../src/main/platform/db/database';

// The provider is replaced: this test is about the workspace lifecycle, not the Claude process.
vi.mock('../src/main/platform/agents/claude', () => ({
  ClaudeProvider: class {
    run() {
      return { events: (async function* () {})(), result: Promise.resolve({ ok: true }) };
    }
    stop() {}
  },
}));

vi.mock('../src/main/modules/observability/log.service', async (actual) => ({
  ...(await actual<object>()),
  loggerFor: () => ({ info() {}, warn() {}, error() {}, debug() {}, child() {} }),
}));

const { AgentSettingsService } = await import('../src/main/modules/settings/agent.service');

const dir = mkdtempSync(join(tmpdir(), 'jobpilot-ephemeral-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function service() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);');
  const agent = new AgentSettingsService(drizzle(sqlite, { schema }) as JobPilotDb, dir, false);
  vi.spyOn(agent, 'prepare').mockResolvedValue();
  return agent;
}

async function finish(run: { events: AsyncIterable<unknown>; result: Promise<unknown> }) {
  for await (const event of run.events) void event;
  await run.result;
}

const spec = (runId: string, ephemeral?: boolean) => ({
  runId,
  sessionId: runId,
  prompt: 'read',
  mcpServers: {},
  outputSchema: undefined as never,
  signal: new AbortController().signal,
  timeoutMs: 1000,
  ...(ephemeral ? { ephemeral } : {}),
});

describe('agent workspace lifecycle', () => {
  it('removes a one-shot run workspace when it ends and keeps a resumable run workspace', async () => {
    const agent = service();
    await finish(agent.run(spec('read-1', true)));
    expect(existsSync(join(dir, 'agents/claude/read-1'))).toBe(false);
    await finish(agent.run(spec('run-1')));
    expect(existsSync(join(dir, 'agents/claude/run-1'))).toBe(true);
  });
});
