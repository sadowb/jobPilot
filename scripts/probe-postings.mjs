import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile, rm } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { build } from 'esbuild';

const url = process.argv[2];
if (!url) {
  process.stderr.write('Usage: npm run postings:probe -- <url>\n');
  process.exitCode = 2;
} else {
  const output = join(process.cwd(), `.jobpilot-postings-probe-${process.pid}.mjs`);
  try {
    const result = await build({
      entryPoints: [new URL('./probe-postings-entry.ts', import.meta.url).pathname],
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
      write: false,
    });
    await writeFile(output, result.outputFiles[0].contents);
    const { fetchPosting } = await import(pathToFileURL(output).href);
    process.stdout.write(`${JSON.stringify(await fetchPosting(url), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  } finally {
    await rm(output, { force: true });
  }
}
