import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const rootDir = process.cwd();
const ipcFile = join(rootDir, 'src/shared/ipc.ts');
const preloadFile = join(rootDir, 'src/preload/index.ts');
const mainDir = join(rootDir, 'src/main');
const manifestFile = join(rootDir, 'ipc-manifest.json');
const isCheck = process.argv.includes('--check');

// 1. Parse Channels from src/shared/ipc.ts
const ipcSource = readFileSync(ipcFile, 'utf8');
const ipcSourceFile = ts.createSourceFile(ipcFile, ipcSource, ts.ScriptTarget.Latest, true);

const channelMap = new Map(); // propertyName -> channelString (e.g. getAgent -> 'agents:get')
const allChannels = new Set(); // set of channel strings

function walkIpc(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ipcSourceFile) === 'Channels' && node.initializer) {
    let expr = node.initializer;
    while (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr)) {
      expr = expr.expression;
    }
    if (ts.isObjectLiteralExpression(expr)) {
      for (const prop of expr.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const name = prop.name.getText(ipcSourceFile);
          const rawVal = prop.initializer.getText(ipcSourceFile);
          const channel = rawVal.replace(/^['"`]|['"`]$/g, '');
          channelMap.set(name, channel);
          allChannels.add(channel);
        }
      }
    }
  }
  ts.forEachChild(node, walkIpc);
}
walkIpc(ipcSourceFile);

// Broadcast / event channels sent from main to renderer that do not register a defineHandler
const BROADCAST_CHANNELS = new Set(['theme:changed', 'data:changed']);

// 2. Scan src/main for defineHandler calls and verify no raw ipcMain listeners bypass it
const handlers = new Map(); // channelString -> schemaName
const violations = [];

function scanMainDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanMainDir(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      const relPath = relative(rootDir, fullPath);
      const isRegistry = relPath === 'src/main/platform/ipc/registry.ts';
      const source = readFileSync(fullPath, 'utf8');
      const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

      function inspect(node) {
        // Flag direct ipcMain.handle, ipcMain.handleOnce, ipcMain.on outside platform/ipc/registry.ts
        if (ts.isCallExpression(node)) {
          const expr = node.expression;
          if (ts.isPropertyAccessExpression(expr)) {
            const objText = expr.expression.getText(sf);
            const methodText = expr.name.getText(sf);
            if (objText === 'ipcMain' && ['handle', 'handleOnce', 'on'].includes(methodText) && !isRegistry) {
              const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
              violations.push(`${relPath}:${line + 1} calls ipcMain.${methodText} directly without defineHandler`);
            }
          }

          // Extract defineHandler(channel, schema, ...)
          const fnName = expr.getText(sf);
          if (fnName === 'defineHandler' && node.arguments.length >= 2) {
            let channelRaw = node.arguments[0].getText(sf);
            let channelName;
            if (channelRaw.startsWith('Channels.')) {
              const prop = channelRaw.slice('Channels.'.length);
              channelName = channelMap.get(prop) ?? prop;
            } else {
              channelName = channelRaw.replace(/^['"`]|['"`]$/g, '');
            }

            const schemaText = node.arguments[1].getText(sf).trim();
            if (handlers.has(channelName)) {
              const existing = handlers.get(channelName);
              if (existing !== schemaText) {
                violations.push(`Conflicting schemas for channel "${channelName}": "${existing}" vs "${schemaText}"`);
              }
            } else {
              handlers.set(channelName, schemaText);
            }
          }
        }
        ts.forEachChild(node, inspect);
      }
      inspect(sf);
    }
  }
}

scanMainDir(mainDir);

// 3. Scan src/preload/index.ts for invoke calls
const preloadSource = readFileSync(preloadFile, 'utf8');
const preloadSf = ts.createSourceFile(preloadFile, preloadSource, ts.ScriptTarget.Latest, true);
const preloadInvokedChannels = new Set();

function walkPreload(node) {
  if (ts.isCallExpression(node)) {
    const fnText = node.expression.getText(preloadSf);
    if (fnText === 'invoke' && node.arguments.length >= 1) {
      const arg = node.arguments[0];
      const raw = arg.getText(preloadSf);
      if (raw.startsWith('Channels.')) {
        const prop = raw.slice('Channels.'.length);
        const ch = channelMap.get(prop) ?? prop;
        preloadInvokedChannels.add(ch);
      } else if (ts.isStringLiteral(arg)) {
        preloadInvokedChannels.add(arg.text);
      }
    }
  }
  ts.forEachChild(node, walkPreload);
}
walkPreload(preloadSf);

// 4. Verify all channels are covered
for (const [prop, channel] of channelMap) {
  if (BROADCAST_CHANNELS.has(channel)) continue;
  if (!handlers.has(channel)) {
    violations.push(`Channel "${channel}" (Channels.${prop}) has no defineHandler registration`);
  }
}

for (const channel of preloadInvokedChannels) {
  if (!handlers.has(channel)) {
    violations.push(`Preload invokes channel "${channel}" but no defineHandler registration exists`);
  }
}

if (violations.length > 0) {
  process.stderr.write('IPC check failed with violations:\n');
  for (const v of violations) {
    process.stderr.write(`  - ${v}\n`);
  }
  process.exit(1);
}

// 5. Generate manifest entries sorted by channel
const manifest = [...handlers.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([channel, schema]) => ({ channel, schema }));

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (isCheck) {
  if (!existsSync(manifestFile)) {
    process.stderr.write(`Error: ${relative(rootDir, manifestFile)} does not exist. Run "npm run ipc:manifest".\n`);
    process.exit(1);
  }
  const current = readFileSync(manifestFile, 'utf8');
  if (current !== serialized) {
    process.stderr.write(
      `Error: ${relative(rootDir, manifestFile)} is outdated or modified. Run "npm run ipc:manifest" and commit changes.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`IPC manifest check passed (${manifest.length} channels verified).\n`);
} else {
  writeFileSync(manifestFile, serialized, 'utf8');
  process.stdout.write(`Wrote ${manifest.length} channels to ${relative(rootDir, manifestFile)}.\n`);
}
