#!/usr/bin/env node
// Real-Electron screenshot capture for the Tailwind migration. See README "Visual regression".
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { _electron as electron } from 'playwright';
import { SCREENS } from './screens.mjs';

const WIDTH = 1440;
const HEIGHT = 900;
const FROZEN_TIME = new Date('2026-10-01T10:00:00Z');
const THEMES = /** @type {const} */ (['light', 'dark']);

const { values } = parseArgs({
  options: { app: { type: 'string' }, out: { type: 'string' }, only: { type: 'string' } },
});
if (!values.app || !values.out) {
  console.error('usage: capture.mjs --app <worktree> --out <dir> [--only <substring>]');
  process.exit(2);
}
const appDir = resolve(values.app);
const outDir = resolve(values.out);
mkdirSync(outDir, { recursive: true });

const fixture = /** @type {Record<string, unknown>} */ (
  JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'))
);
const screens = SCREENS.filter((s) => !values.only || s.name.includes(values.only));

// The app's own electron binary, so a worktree is captured with the version it was built for.
const electronPath = /** @type {string} */ (createRequire(join(appDir, 'package.json'))('electron'));
const electronVersion = JSON.parse(readFileSync(join(appDir, 'node_modules/electron/package.json'), 'utf8')).version;

/** @param {import('playwright').Page} page */
async function stabilise(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Hide the text caret without an inline <style> (the CSP forbids it): a constructed stylesheet is allowed.
    if (!document.adoptedStyleSheets.length) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('*{caret-color:transparent !important}');
      document.adoptedStyleSheets = [sheet];
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.waitForTimeout(150);
}

/**
 * @param {import('playwright').Page} page
 * @param {import('./screens.mjs').Action} action
 */
async function run(page, action) {
  if ('click' in action) await page.locator(action.click).first().click({ timeout: 5000 });
  else if ('fill' in action) await page.locator(action.fill[0]).first().fill(action.fill[1], { timeout: 5000 });
  else if ('press' in action) await page.keyboard.press(action.press);
  else if ('waitFor' in action) await page.locator(action.waitFor).first().waitFor({ state: 'visible', timeout: 5000 });
  else if ('event' in action) {
    await page.evaluate(([name, detail]) => window.dispatchEvent(new CustomEvent(name, { detail })), action.event);
  } else await page.waitForTimeout(action.wait);
}

/** @type {{ screen: string, theme: string, error: string }[]} */
const errors = [];
/** @type {string[]} */
const captured = [];
let clockMode = 'fixed';

for (const theme of THEMES) {
  const userData = mkdtempSync(join(tmpdir(), 'jp-visual-'));
  // Electron's native theme is authoritative (src/main/modules/settings/settings.service.ts reads this file); localStorage covers browser mode.
  writeFileSync(join(userData, 'theme-preference'), theme, 'utf8');
  const app = await electron.launch({
    executablePath: electronPath,
    args: [appDir, `--user-data-dir=${userData}`],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  await app.evaluate(({ app }, fixture) => {
    const path = process.getBuiltinModule('node:path');
    const { createRequire } = process.getBuiltinModule('node:module');
    const req = createRequire(path.join(app.getAppPath(), 'package.json'));
    const main = req(path.join(app.getAppPath(), 'out/main/index.js'));
    const db = main.db.$client;

    const personal = fixture['jobpilot.profile.v1'];
    const markets = fixture['jobpilot.markets.v1'] ?? [];
    const answers = fixture['jobpilot.answers.v2'] ?? [];
    const profileData = { personal, markets, answers };
    const pid = '01JPROFILE00000000000000000';
    db.prepare(
      `
      INSERT OR REPLACE INTO profile (
        id, first_name, last_name, email, phone, city, country, address,
        linkedin_url, github_url, portfolio_url, summary,
        salary_min, salary_currency, notice_period_days, preferences,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      pid,
      personal?.firstName ?? '',
      personal?.lastName ?? '',
      personal?.email ?? '',
      personal?.phone ?? null,
      personal?.city ?? null,
      personal?.countryCode ?? personal?.country ?? null,
      personal?.address ?? null,
      personal?.linkedin ?? null,
      personal?.github ?? null,
      personal?.website ?? null,
      personal?.bio ?? null,
      personal?.salaryAmount ?? null,
      personal?.salaryCurrency ?? null,
      personal?.notice?.days ?? null,
      JSON.stringify(profileData),
      1760000000000,
      1760000000000,
    );
    db.prepare(
      `
      INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('profile.localStorageMigration.v1', 'true', ?)
    `,
    ).run(1760000000000);

    const cid = '01JCOMPANY00000000000000000';
    const jid = '01JPOSTING00000000000000000';
    const aid = '01JAPPLIC000000000000000000';
    db.prepare(
      `
      INSERT OR REPLACE INTO company (id, name, name_key, created_at, updated_at)
      VALUES (?, 'Ramp', 'ramp', 1760000000000, 1760000000000)
    `,
    ).run(cid);
    db.prepare(
      `
      INSERT OR REPLACE INTO job_posting (
        id, company_id, url, canonical_url, ats, title, location, created_at, updated_at
      ) VALUES (?, ?, 'https://jobs.ashbyhq.com/ramp/product-engineer', 'https://jobs.ashbyhq.com/ramp/product-engineer', 'ashby', 'Product Engineer', 'New York, NY', 1760000000000, 1760000000000)
    `,
    ).run(jid, cid);
    db.prepare(
      `
      INSERT OR REPLACE INTO application (
        id, posting_id, status, queue_rank, applied_at, last_activity_at, created_at, updated_at
      ) VALUES (?, ?, 'applied', 1, 1760000000000, 1760000000000, 1760000000000, 1760000000000)
    `,
    ).run(aid, jid);
  }, fixture);
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    try {
      await page.clock.install({ time: FROZEN_TIME });
      await page.clock.setFixedTime(FROZEN_TIME);
    } catch (e) {
      clockMode = `unavailable: ${e instanceof Error ? e.message : String(e)}`;
    }
    // Every load starts from the same storage: reseed before app code runs.
    await page.addInitScript(
      ({ data, mode }) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
        localStorage.setItem('jobpilot.appearance', mode);
      },
      { data: fixture, mode: theme },
    );
    for (const screen of screens) {
      const label = `${screen.name}.${theme}`;
      try {
        const width = screen.width ?? WIDTH;
        await app.evaluate(
          ({ BrowserWindow }, [w, h]) => {
            const win = BrowserWindow.getAllWindows()[0];
            win?.setMinimumSize(1, 1);
            win?.setContentSize(w, h);
          },
          [width, HEIGHT],
        );
        await page.evaluate((hash) => {
          location.hash = hash;
        }, `#${screen.route}`);
        await page.evaluate(async () => {
          for (const db of (await indexedDB.databases?.()) ?? []) if (db.name) indexedDB.deleteDatabase(db.name);
        });
        await page.reload();
        await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 10000 });
        await stabilise(page);
        for (const action of screen.actions ?? []) await run(page, action);
        await stabilise(page);
        await page.screenshot({ path: join(outDir, `${label}.png`), fullPage: true });
        captured.push(label);
        console.log(`ok    ${label}`);
      } catch (e) {
        const message = e instanceof Error ? (e.message.split('\n')[0] ?? String(e)) : String(e);
        errors.push({ screen: screen.name, theme, error: message });
        console.log(`ERROR ${label}: ${message}`);
      }
    }
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
}

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', appDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  /* not a git checkout */
}
writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify({ app: appDir, commit, electron: electronVersion, clock: clockMode, captured, errors }, null, 2),
);
console.log(`${captured.length} captured, ${errors.length} errors -> ${outDir}`);
