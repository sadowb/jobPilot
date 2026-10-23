// Owner-only live check. Never imported by the app or run on the development Mac.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import ts from 'typescript';
import pino from 'pino';

const directory = await mkdtemp(join(process.cwd(), '.neo-probe-'));
try {
  // Keep dependency resolution in this checkout, without building or booting Electron.
  for (const name of ['neo-mcp', 'neo']) {
    const source = await readFile(new URL(`../src/main/platform/browsers/${name}.ts`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    });
    await writeFile(join(directory, `${name}.mjs`), outputText.replace("'./neo-mcp'", "'./neo-mcp.mjs'"));
  }
  const { NeoBrowserProvider } = await import(pathToFileURL(join(directory, 'neo.mjs')).href);
  const provider = new NeoBrowserProvider(
    pino({ level: 'debug' }).child({ module: 'browsers' }),
    process.env.NEO_MCP_URL,
  );
  assert.equal(await provider.status(), 'installed', provider.installHint);
  // Owner supplies a public HTTPS canonical_url read from a disposable posting in the DB.
  const url = process.argv[2];
  assert.ok(url, 'Pass a disposable posting canonical_url as the only argument');
  const firstRun = `neo-probe-${Date.now()}`;
  const secondRun = `${firstRun}-second`;
  try {
    for (const rejected of ['http://example.com', 'file:///tmp/test', 'javascript:alert(1)']) {
      await assert.rejects(provider.openTab(firstRun, rejected));
    }
    const [first, duplicate] = await Promise.all([provider.openTab(firstRun, url), provider.openTab(firstRun, url)]);
    assert.equal(first.tabId, duplicate.tabId);
    const second = await provider.openTab(secondRun, url);
    assert.notEqual(first.tabId, second.tabId);
    await Promise.all([provider.closeTab(firstRun), provider.closeTab(firstRun)]);
    await provider.closeTab(firstRun);
    process.stdout.write('PASS: HTTPS validation, one tab per run, independent runs, idempotent close\n');
  } finally {
    await Promise.all([provider.closeTab(firstRun), provider.closeTab(secondRun)]);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

// The SDK's background SSE connection can otherwise keep this one-shot probe alive.
process.exit(0);
