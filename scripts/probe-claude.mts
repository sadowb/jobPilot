import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { ClaudeProvider } from '../src/main/platform/agents/claude';
import { RunResultSchema, type RunEvent, type RunSpec } from '../src/main/platform/agents/types';
import { redact } from '../src/main/modules/observability/redact';

const diagnostics: Record<string, unknown>[] = [];
let resolveCrash!: (diagnostic: Record<string, unknown>) => void;
const crashDiagnostic = new Promise<Record<string, unknown>>((resolve) => {
  resolveCrash = resolve;
});
const directory = await mkdtemp(resolve(tmpdir(), 'jobpilot-claude-'));
try {
  const provider = new ClaudeProvider({
    executablePath: resolve('scripts/fixtures/claude/fake-claude'),
    cwd: directory,
    configDirectory: directory,
    readApiKey: async () => 'fixture-key',
    logger: {
      debug: (entry: object) => {
        const diagnostic = entry as Record<string, unknown>;
        diagnostics.push(diagnostic);
        if (diagnostic.exit_code === 23) resolveCrash(diagnostic);
      },
    },
    redact,
  });
  const spec: RunSpec = {
    runId: 'fixture',
    prompt: 'Fill the local form',
    model: 'fixture-model',
    mcpServers: {
      form: {
        type: 'stdio',
        command: process.execPath,
        args: [resolve('scripts/fixtures/claude/stub-mcp.mjs')],
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
  assert(!events.some((event) => event.type === 'error'), JSON.stringify(events));
  assert.equal((await run.result).status, 'filled');
  for (const type of ['session', 'message', 'tool_call', 'tool_result', 'cost'])
    assert(events.some((event) => event.type === type));
  assert(!JSON.stringify(events).includes('fixture-key'));
  for (const mode of ['invalid', 'abort', 'timeout', 'pre-abort', 'resume', 'crash']) {
    const controller = new AbortController();
    if (mode === 'pre-abort') controller.abort();
    const attempt = provider.run({
      ...spec,
      prompt: ['invalid', 'crash'].includes(mode) ? mode : mode === 'resume' ? 'Fill again' : 'wait',
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
  const crash = await Promise.race([
    crashDiagnostic,
    setTimeout(5000, undefined, { ref: false }).then(() => assert.fail('Missing crash diagnostic')),
  ]);
  assert.equal(crash.error_class, 'ClaudeProcessExit');
  assert.equal(crash.run_id, 'fixture');
  assert.equal(crash.agent, 'claude');
  assert.equal(typeof crash.stderr, 'string');
  assert(Buffer.byteLength(crash.stderr as string) <= 200);
  assert.match(crash.stderr as string, /token=\[REDACTED\]/);
  assert(!JSON.stringify(diagnostics).includes('fixture-key'));
  assert(!JSON.stringify(diagnostics).includes('fixture-token'));
  assert(!JSON.stringify(diagnostics).includes('beyond-limit'));
  process.stdout.write(
    'Claude transport/MCP form probe passed. Model tokens: 0; cost: $0 (protocol fixture, no API call).\n',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
