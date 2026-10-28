import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { ClaudeProvider } from '../src/main/platform/agents/claude';
import { RunResultSchema, type RunEvent, type RunSpec } from '../src/main/platform/agents/types';
import { detectClaude } from '../src/main/platform/agents/detect';
import { redact } from '../src/main/modules/observability/redact';

const diagnostics: Record<string, unknown>[] = [];
let resolveCrash!: (diagnostic: Record<string, unknown>) => void;
const crashDiagnostic = new Promise<Record<string, unknown>>((resolve) => {
  resolveCrash = resolve;
});
const directory = await mkdtemp(resolve(tmpdir(), 'jobpilot-claude-'));
try {
  assert.deepEqual(await detectClaude(resolve('scripts/fixtures/claude/fake-claude')), {
    path: resolve('scripts/fixtures/claude/fake-claude'),
    version: '2.1.303 (Claude Code fixture)',
  });
  assert.equal(await detectClaude(resolve(directory, 'missing')), null);
  await mkdir(resolve(directory, '.claude'));
  const fakeSettings = JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'touch should-never-run' }] }] },
    mcpServers: { personal: { command: 'should-never-run' } },
    enabledPlugins: { 'personal@owner': true },
  });
  await writeFile(resolve(directory, '.claude/settings.json'), fakeSettings);
  await writeFile(resolve(directory, '.claude/CLAUDE.md'), 'Personal instructions must not load.');
  const provider = new ClaudeProvider({
    executablePath: resolve('scripts/fixtures/claude/fake-claude'),
    cwd: directory,
    configDirectory: directory,
    readApiKey: async () => 'fixture-key',
    logger: {
      debug: (entry: object | string) => {
        const diagnostic = (typeof entry === 'string' ? {} : entry) as Record<string, unknown>;
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
  const loginProvider = new ClaudeProvider({
    executablePath: resolve('scripts/fixtures/claude/fake-claude'),
    cwd: directory,
    configDirectory: directory,
    logger: { debug: () => undefined },
    redact,
  });
  for (const prompt of ['isolation', 'not-logged-in']) {
    const attempt = loginProvider.run({ ...spec, prompt });
    const observed: RunEvent[] = [];
    for await (const event of attempt.events) observed.push(event);
    if (prompt === 'isolation') assert.equal((await attempt.result).status, 'filled');
    else {
      await assert.rejects(attempt.result, /not_logged_in/);
      assert(observed.some((event) => event.type === 'error' && event.message === 'not_logged_in'));
    }
  }
  assert.equal(await readFile(resolve(directory, '.claude/settings.json'), 'utf8'), fakeSettings);
  for (const mode of ['invalid', 'quit', 'abort', 'timeout', 'pre-abort', 'crash']) {
    const controller = new AbortController();
    if (mode === 'pre-abort') controller.abort();
    const attempt = provider.run({
      ...spec,
      prompt: ['invalid', 'crash'].includes(mode) ? mode : 'wait',
      signal: controller.signal,
      timeoutMs: mode === 'timeout' ? 1000 : 10_000,
    });
    const observed: RunEvent[] = [];
    for await (const event of attempt.events) {
      observed.push(event);
      if (['abort', 'quit'].includes(mode) && event.type === 'message' && event.text.startsWith('model:')) {
        if (mode === 'quit') provider.stop();
        else controller.abort();
      }
    }
    await assert.rejects(attempt.result);
    assert(observed.some((event) => event.type === 'error'));
    if (['abort', 'timeout', 'quit'].includes(mode)) {
      for (const file of ['child.pid', 'descendant.pid']) {
        const pid = Number(await readFile(resolve(directory, file), 'utf8'));
        // Wait for the OS to reap the killed child before checking for orphans.
        for (let i = 0; i < 50; i++) {
          try {
            process.kill(pid, 0);
          } catch {
            break;
          }
          await setTimeout(20);
        }
        assert.throws(() => process.kill(pid, 0));
      }
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
