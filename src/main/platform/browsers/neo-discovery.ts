import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { posix, win32 } from 'node:path';
import { z } from 'zod';

/** Validates loopback HTTP endpoint without credentials or fragment. */
export function validateLoopbackEndpoint(endpoint: string): string {
  const url = new URL(z.url().parse(endpoint));
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error('Neo MCP must use a loopback HTTP endpoint without credentials or a fragment');
  }
  return url.href;
}

/** Standard config paths across platforms; derived from platform app-data dir. */
export function candidateConfigPaths(
  platform = process.platform,
  home = homedir(),
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const p = platform === 'win32' ? win32 : posix;
  if (platform === 'darwin') {
    return [p.join(home, 'Library', 'Application Support', 'BrowserClaw', '.browseros', 'config.json')];
  }
  if (platform === 'win32') {
    const paths: string[] = [];
    if (env.APPDATA) paths.push(p.join(env.APPDATA, 'BrowserClaw', '.browseros', 'config.json'));
    paths.push(p.join(home, 'AppData', 'Roaming', 'BrowserClaw', '.browseros', 'config.json'));
    if (env.LOCALAPPDATA) paths.push(p.join(env.LOCALAPPDATA, 'BrowserClaw', '.browseros', 'config.json'));
    paths.push(p.join(home, 'AppData', 'Local', 'BrowserClaw', '.browseros', 'config.json'));
    return [...new Set(paths)];
  }
  const configDir = env.XDG_CONFIG_HOME || p.join(home, '.config');
  return [p.join(configDir, 'BrowserClaw', '.browseros', 'config.json')];
}

/** Parses Neo config content and returns validated loopback endpoint and port, or undefined. */
export function parseNeoConfig(content: unknown): { port: number; endpoint: string } | undefined {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    if (!data || typeof data !== 'object') return undefined;
    const rawPort = (data as { ports?: { server?: unknown } }).ports?.server;
    if (typeof rawPort !== 'number' || !Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
      return undefined;
    }
    const host =
      typeof (data as { host?: unknown }).host === 'string' && (data as { host: string }).host
        ? (data as { host: string }).host
        : '127.0.0.1';
    const endpoint = `http://${host}:${rawPort}/mcp`;
    validateLoopbackEndpoint(endpoint);
    return { port: rawPort, endpoint };
  } catch {
    return undefined;
  }
}

/** Discovers Neo endpoint from config files on disk. */
export function discoverNeoEndpoint(paths = candidateConfigPaths()): { port: number; endpoint: string } | undefined {
  for (const configPath of paths) {
    try {
      if (!existsSync(configPath)) continue;
      const content = readFileSync(configPath, 'utf8');
      const parsed = parseNeoConfig(content);
      if (parsed) return parsed;
    } catch {
      // Ignore unreadable config and try next
    }
  }
  return undefined;
}
