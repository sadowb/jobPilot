#!/usr/bin/env node
// Renders the README banner and framed screenshot crops from a `visual:capture` output dir.
// usage: node scripts/readme/render.mjs --shots <capture dir> [--out docs/screenshots]
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values } = parseArgs({
  options: { shots: { type: 'string' }, out: { type: 'string', default: 'docs/screenshots' } },
});
if (!values.shots) {
  console.error('usage: render.mjs --shots <visual:capture dir> [--out docs/screenshots]');
  process.exit(2);
}
const shots = resolve(values.shots);
const out = resolve(values.out);
const url = (p) => pathToFileURL(p).href;
const font = (pkg, file) => url(resolve('node_modules/@fontsource-variable', pkg, 'files', file));

const THEME = {
  light: {
    canvas: '#F4F3EF',
    glow: 'rgba(47,125,99,.10)',
    ink: '#111111',
    muted: '#5C5C5C',
    line: 'rgba(0,0,0,.08)',
    shadow: 'rgba(17,17,17,.16)',
  },
  dark: {
    canvas: '#121212',
    glow: 'rgba(80,190,140,.16)',
    ink: '#F5F5F5',
    muted: '#A3A3A3',
    line: 'rgba(255,255,255,.10)',
    shadow: 'rgba(0,0,0,.55)',
  },
};

// Crops in CSS px of the 1440x900 capture (screenshots are 2x).
const CROPS = {
  inbox: { screen: 'inbox', x: 336, y: 56, w: 1104, h: 672 },
  analytics: { screen: 'analytics', x: 28, y: 70, w: 1384, h: 600 },
  palette: { screen: 'cmdk', x: 360, y: 70, w: 720, h: 372 },
  art: { screen: 'welcome-1', x: 661, y: 88, w: 721, h: 718 },
};

const head = (t) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Newsreader;src:url(${font('newsreader', 'newsreader-latin-wght-normal.woff2')})}
@font-face{font-family:Newsreader;font-style:italic;src:url(${font('newsreader', 'newsreader-latin-wght-italic.woff2')})}
@font-face{font-family:Geist;src:url(${font('geist', 'geist-latin-wght-normal.woff2')})}
@font-face{font-family:'Geist Mono';src:url(${font('geist-mono', 'geist-mono-latin-wght-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:max-content;background:${t.canvas};color:${t.ink};font-family:Geist,sans-serif;-webkit-font-smoothing:antialiased}
.stage{position:relative;background:radial-gradient(900px 500px at 85% 20%,${t.glow},transparent 70%),${t.canvas}}
.crop{position:relative;overflow:hidden;border-radius:16px;border:1px solid ${t.line};box-shadow:0 1px 2px ${t.shadow},0 28px 70px -20px ${t.shadow}}
.crop img{position:absolute;width:1440px;display:block}
</style>`;

const crop = (c, theme, scale = 1) =>
  `<div class="crop" style="width:${c.w * scale}px;height:${c.h * scale}px"><img src="${url(join(shots, `${c.screen}.${theme}.png`))}" style="left:${-c.x * scale}px;top:${-c.y * scale}px;width:${1440 * scale}px"></div>`;

const framed = (c, theme) =>
  `${head(THEME[theme])}<div class="stage" style="padding:56px 64px">${crop(c, theme)}</div>`;

const banner = (theme) => {
  const t = THEME[theme];
  return `${head(t)}<div class="stage" style="width:1280px;height:560px;display:flex;align-items:center;gap:56px;padding:0 64px 0 80px">
  <div style="flex:1;min-width:0">
    <div style="font:500 13px/1 'Geist Mono',monospace;letter-spacing:.14em;color:${t.muted};text-transform:uppercase">JobPilot · for macOS</div>
    <h1 style="font:400 58px/1.04 Newsreader,serif;letter-spacing:-.02em;margin:22px 0 0">Apply to every job.<br><i>Send only what you approve.</i></h1>
    <p style="font-size:19px;line-height:1.55;color:${t.muted};margin-top:24px;max-width:520px">Paste a stack of links. A crew of agents fills each application from your profile, asks what it can't know, and waits for your OK.</p>
    <div style="display:flex;gap:10px;margin-top:30px;font:500 13px/1 'Geist Mono',monospace;color:${t.muted}">
      ${['Local-first', 'Parallel', 'Open source'].map((s) => `<span style="border:1px solid ${t.line};border-radius:99px;padding:9px 14px">${s}</span>`).join('')}
    </div>
  </div>
  ${crop(CROPS.art, theme, 0.64)}
</div>`;
};

// Playwright's own Chromium if downloaded, else the installed Chrome (headless, temp profile).
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const tmp = mkdtempSync(join(tmpdir(), 'jp-readme-'));
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const jobs = ['light', 'dark'].flatMap((theme) => [
    [`banner-${theme}`, banner(theme)],
    ...['inbox', 'analytics', 'palette'].map((k) => [`${k}-${theme}`, framed(CROPS[k], theme)]),
  ]);
  for (const [name, html] of jobs) {
    const file = join(tmp, `${name}.html`);
    writeFileSync(file, html);
    await page.goto(url(file));
    await page.evaluate('document.fonts.ready');
    await page.locator('.stage').screenshot({ path: join(out, `${name}.png`) });
    console.log('wrote', name);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
