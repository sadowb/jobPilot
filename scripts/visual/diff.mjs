#!/usr/bin/env node
// Compare two capture directories and write report.md / report.html. Exit 1 on any FAIL.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative as pathRelative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { comparePngs, DEFAULT_THRESHOLD } from './compare.mjs';

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    out: { type: 'string' },
    threshold: { type: 'string', default: String(DEFAULT_THRESHOLD) },
  },
});
if (!values.base || !values.head || !values.out) {
  console.error('usage: diff.mjs --base <dir> --head <dir> --out <dir> [--threshold 0.001]');
  process.exit(2);
}
const baseDir = resolve(values.base);
const headDir = resolve(values.head);
const outDir = resolve(values.out);
const threshold = Number(values.threshold);
mkdirSync(outDir, { recursive: true });

/** @param {string} dir */
const pngs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')) : []);
/** @param {string} dir */
const manifest = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  } catch {
    return { errors: [] };
  }
};
/** @param {string} dir @param {string} file */
const decode = (dir, file) => PNG.sync.read(readFileSync(join(dir, file)));

const baseErrors = manifest(baseDir).errors ?? [];
const headErrors = manifest(headDir).errors ?? [];
const names = [...new Set([...pngs(baseDir), ...pngs(headDir)])].sort();
for (const e of [...baseErrors, ...headErrors]) {
  const file = `${e.screen}.${e.theme}.png`;
  if (!names.includes(file)) names.push(file);
}

/** @typedef {{ screen: string, theme: string, file: string, status: 'PASS' | 'FAIL', reason: string, ratio: number, diffFile: string }} Row */
/** @type {Row[]} */
const rows = [];
for (const file of names.sort()) {
  const [screen, theme] = basename(file, '.png').split(/\.(?=light$|dark$)/);
  const row = {
    screen: screen ?? file,
    theme: theme ?? '',
    file,
    status: /** @type {const} */ ('FAIL'),
    reason: '',
    ratio: 1,
    diffFile: '',
  };
  const berr = baseErrors.find(
    (/** @type {{screen:string,theme:string}} */ e) => e.screen === row.screen && e.theme === row.theme,
  );
  const herr = headErrors.find(
    (/** @type {{screen:string,theme:string}} */ e) => e.screen === row.screen && e.theme === row.theme,
  );
  try {
    if (berr || herr)
      row.reason = `capture error: ${berr ? `base: ${berr.error}` : ''}${berr && herr ? '; ' : ''}${herr ? `head: ${herr.error}` : ''}`;
    else if (!existsSync(join(baseDir, file))) row.reason = 'missing in base';
    else if (!existsSync(join(headDir, file))) row.reason = 'missing in head';
    else {
      const result = comparePngs(decode(baseDir, file), decode(headDir, file), { threshold });
      row.status = result.status;
      row.reason = result.reason;
      row.ratio = result.ratio;
      if (result.diff) {
        row.diffFile = `${basename(file, '.png')}.diff.png`;
        writeFileSync(join(outDir, row.diffFile), PNG.sync.write(result.diff));
      }
    }
  } catch (e) {
    row.reason = `compare failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  rows.push(row);
}

rows.sort((a, b) =>
  a.status === b.status ? b.ratio - a.ratio || a.file.localeCompare(b.file) : a.status === 'FAIL' ? -1 : 1,
);
const fails = rows.filter((r) => r.status === 'FAIL').length;
const pct = (/** @type {Row} */ r) => (r.diffFile ? `${(r.ratio * 100).toFixed(3)}%` : 'n/a');

const md = [
  `# Visual diff`,
  ``,
  `- base: \`${baseDir}\``,
  `- head: \`${headDir}\``,
  `- threshold: ${(threshold * 100).toFixed(3)}% of pixels`,
  `- **${rows.length - fails} PASS, ${fails} FAIL** of ${rows.length}`,
  ``,
  `| Screen | Theme | Changed | Status | Reason |`,
  `| --- | --- | ---: | --- | --- |`,
  ...rows.map((r) => `| ${r.screen} | ${r.theme} | ${pct(r)} | ${r.status} | ${r.reason.replace(/[\\|]/g, '\\$&')} |`),
  ``,
].join('\n');
writeFileSync(join(outDir, 'report.md'), md);

/** @param {string} s */
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const rel = (/** @type {string} */ from, /** @type {string} */ file) =>
  from ? `${from}/${encodeURIComponent(file)}` : '';
const cell = (/** @type {string} */ src, /** @type {string} */ label) =>
  src
    ? `<figure><figcaption>${label}</figcaption><a href="${src}"><img loading="lazy" src="${src}" alt="${label}"></a></figure>`
    : `<figure><figcaption>${label}: none</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><title>Visual diff</title>
<style>body{font:14px system-ui;margin:24px;background:#fafafa;color:#111}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left}
.FAIL{color:#b00020;font-weight:600}.PASS{color:#0a7a3d}section{margin:28px 0}.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
figure{margin:0}img{width:100%;border:1px solid #ccc;background:#fff}figcaption{font-size:12px;color:#555}</style>
<h1>Visual diff</h1><p><b>${rows.length - fails} PASS, ${fails} FAIL</b> of ${rows.length} (threshold ${(threshold * 100).toFixed(3)}%)</p>
<table><tr><th>Screen</th><th>Theme</th><th>Changed</th><th>Status</th><th>Reason</th></tr>
${rows.map((r) => `<tr><td><a href="#${esc(r.file)}">${esc(r.screen)}</a></td><td>${r.theme}</td><td>${pct(r)}</td><td class="${r.status}">${r.status}</td><td>${esc(r.reason)}</td></tr>`).join('\n')}</table>
${rows
  .filter((r) => r.status === 'FAIL')
  .map(
    (
      r,
    ) => `<section id="${esc(r.file)}"><h2>${esc(r.screen)} (${r.theme}) <span class="FAIL">${pct(r)}</span></h2><p>${esc(r.reason)}</p><div class="row">
${cell(existsSync(join(baseDir, r.file)) ? rel(relative(baseDir), r.file) : '', 'base')}${cell(existsSync(join(headDir, r.file)) ? rel(relative(headDir), r.file) : '', 'head')}${cell(r.diffFile ? encodeURIComponent(r.diffFile) : '', 'diff')}</div></section>`,
  )
  .join('\n')}`;
/** Image paths relative to the report, so the report folder and the capture folders can be moved together. */
function relative(/** @type {string} */ dir) {
  return pathRelative(outDir, dir);
}
writeFileSync(join(outDir, 'report.html'), html);

console.log(`${rows.length - fails} PASS, ${fails} FAIL -> ${join(outDir, 'report.md')}`);
process.exit(fails ? 1 : 0);
