import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { executablePath } from './detect';

export interface ExecutableFingerprint {
  /** Symlinks resolved: what would actually run. */
  path: string;
  sha256: string;
}

const cache = new Map<string, { key: string; sha256: string }>();

/** SHA-256 of the file at `path`, re-read only when its size or mtime changed (a run re-checks it every time). */
export async function fingerprint(path: string): Promise<ExecutableFingerprint> {
  const resolved = await executablePath(path);
  const info = await stat(resolved);
  const key = `${info.size}:${info.mtimeMs}`;
  const hit = cache.get(resolved);
  if (hit?.key === key) return { path: resolved, sha256: hit.sha256 };
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(resolved)) hash.update(chunk as Buffer);
  const sha256 = hash.digest('hex');
  cache.set(resolved, { key, sha256 });
  return { path: resolved, sha256 };
}
