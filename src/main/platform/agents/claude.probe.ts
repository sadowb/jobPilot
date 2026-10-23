import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { ClaudeProvider } from './claude';
import { RunResultSchema, type RunEvent, type RunSpec } from './types';

const directory = await mkdtemp(resolve(tmpdir(), 'jobpilot-claude-'));
try {
  const provider = new ClaudeProvider({
    executablePath: resolve('docs/verification/claude/fake-claude'),
    cwd: directory,
    configDirectory: directory,
    readApiKey: async () => 'fixture-key',
  });
  const spec: RunSpec = {
    runId: 'fixture',
    prompt: 'Fill the local form',
    model: 'fixture-model',
    mcpServers: {
      form: {
        type: 'stdio',
        command: process.execPath,
        args: [resolve('docs/verification/claude/stub-mcp.mjs')],
        env: { PATH: dirname(process.execPath) },
      },
    },
    outputSchema: RunResultSchema,
    signal: new AbortController().signal,
    timeoutMs: 10_000,
    env: {
      PATH: dirname(process.execPath),
      HOME: directory,
      POISON: 'must-not-reach-child',
      CLAUDE_CODE_OAUTH_TOKEN: 'must-not-reach-child',
    },
  };
  const run = provider.run(spec);
  const events: RunEvent[] = [];
  for await (const event of run.events) events.push(event);
  assert.equal((await run.result).status, 'filled');
  for (const type of ['session', 'message', 'tool_call', 'tool_result', 'cost'])
    assert(events.some((event) => event.type === type));
  assert(!JSON.stringify(events).includes('fixture-key'));
  for (const mode of ['invalid', 'abort', 'timeout', 'pre-abort', 'resume']) {
    const controller = new AbortController();
    if (mode === 'pre-abort') controller.abort();
    const attempt = provider.run({
      ...spec,
      prompt: mode === 'invalid' ? 'invalid' : mode === 'resume' ? 'Fill again' : 'wait',
      signal: controller.signal,
      timeoutMs: mode === 'timeout' ? 100 : 10_000,
      resumeId: mode === 'resume' ? 'fixture-session' : undefined,
    });
    const observed: RunEvent[] = [];
    for await (const event of attempt.events) {
      observed.push(event);
      if (mode === 'abort' && event.type === 'session') controller.abort();
    }
    if (mode === 'resume') assert.equal((await attempt.result).status, 'filled');
    else {
      await assert.rejects(attempt.result);
      assert(observed.some((event) => event.type === 'error'));
    }
  }
  process.stdout.write(
    'Claude transport/MCP form probe passed. Model tokens: 0; cost: $0 (protocol fixture, no API call).\n',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
