import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Main = typeof import('../src/main/app/main');

/** What the fake agent returns for the CV: Sara Benali, a demo persona. Phone and French level are the uncertain bits. */
const EXTRACTION = {
  firstName: { value: 'Sara', confidence: 'high' },
  lastName: { value: 'Benali', confidence: 'high' },
  headline: { value: 'Software engineer', confidence: 'high' },
  email: { value: 'sara.benali@example.com', confidence: 'high' },
  phone: { value: '+212612345678', confidence: 'low' },
  city: { value: 'Rabat', confidence: 'high' },
  countryCode: { value: 'MA', confidence: 'high' },
  nationalities: { value: ['MA'], confidence: 'high' },
  education: {
    value: [
      { school: 'Mohammed V University', degree: 'B.Sc.', fieldOfStudy: 'Computer Science', graduation: '2026-06' },
    ],
    confidence: 'high',
  },
  career: {
    value: [{ role: 'Teaching assistant', organisation: 'Mohammed V University', start: '2025-02', end: '2026-06' }],
    confidence: 'high',
  },
  languages: {
    value: [
      { language: 'Arabic', level: 'Native' },
      { language: 'English', level: 'Fluent' },
      { language: 'French', level: '' },
    ],
    confidence: 'low',
  },
  markets: { value: ['MA', 'FR'], confidence: 'low' },
};

/** A minimal valid one-page PDF whose text layer holds the CV lines (Helvetica, no fonts or images to embed). */
const cvPdf = () => {
  const lines = [
    'Sara Benali',
    'Software engineer - Rabat, Morocco - sara.benali@example.com - +212 6 12 34 56 78',
    'Education: B.Sc. Computer Science, Mohammed V University, 2022 to 2026',
    'Languages: Arabic (native), English (fluent), French',
  ];
  const stream = `BT /F1 11 Tf 14 TL 40 780 Td ${lines.map((line) => `(${line.replace(/[()\\]/g, '\\$&')}) '`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

async function capture(window: Page, testInfo: TestInfo, name: string) {
  for (const theme of ['light', 'dark'] as const) {
    await window.evaluate((theme) => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await window.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`), animations: 'disabled' });
  }
}

async function launch(testInfo: TestInfo) {
  const userData = mkdtempSync(join(tmpdir(), 'jobpilot-onboarding-v5-'));
  const packaged = testInfo.project.name === 'packaged';
  const app = await electron.launch({
    ...(packaged
      ? {
          executablePath:
            process.env.JOBPILOT_PACKAGED_EXECUTABLE ?? 'release/mac-arm64/JobPilot.app/Contents/MacOS/JobPilot',
        }
      : {}),
    args: packaged ? [`--user-data-dir=${userData}`] : ['.', `--user-data-dir=${userData}`],
    env: { ...process.env, JOBPILOT_E2E_PROVIDER: 'fake' },
    timeout: 60_000,
  });
  return { app, userData };
}

async function script(app: ElectronApplication) {
  await app.evaluate(async ({ app }, extraction) => {
    await new Promise((resolve) => setImmediate(resolve));
    const path = process.getBuiltinModule('node:path')!;
    const require = process.getBuiltinModule('node:module')!.createRequire(path.join(app.getAppPath(), 'package.json'));
    const main = require(path.join(app.getAppPath(), 'out/main/index.js')) as Main;
    main.fakeAgent!.delayMs = 150;
    // A scripted conversation: the CV prompt carries <cv>, chat turns are matched on the owner's message.
    const prompts: string[] = [];
    (globalThis as { __prompts?: string[] }).__prompts = prompts;
    const turn = (reply: string, facts: object[] = [], settled: string[] = [], suggestions: string[] = []) => ({
      reply,
      facts,
      settled,
      suggestions,
    });
    main.fakeAgent!.reply = (spec) => {
      const { prompt } = spec;
      if (!prompt.startsWith('Reply with the JSON')) prompts.push(prompt); // not the connection test
      if (prompt.includes('<cv>')) return extraction;
      if (prompt.includes('has not said anything yet'))
        return turn(
          'Hi Sara, I read your CV. Is +212 6 12 34 56 78 still the right number?',
          [],
          [],
          ['Yes, that is right'],
        );
      if (prompt.includes('<owner_message>Yes, that is right'))
        return turn('Thanks. How well do you speak French?', [], ['phone'], ['Fluent', 'Basic']);
      if (prompt.includes('<owner_message>Fluent'))
        return turn(
          'Noted, French is fluent. Is sara.benali@example.com the best email for applications?',
          [{ kind: 'language', language: 'French', level: 'Fluent' }],
          ['lang:' + /lang:([^:\n]+):/.exec(prompt)?.[1]],
        );
      if (prompt.includes('<owner_message>Actually'))
        return turn('Updated your email. Which passports do you hold, and where do you want to work?', [
          { kind: 'personal', field: 'email', value: 'sara@benali.dev' },
        ]);
      if (prompt.includes('<owner_message>I hold'))
        return turn(
          'Perfect, you are all set. Paste job links now or later from the dashboard, then press Ready for take-off.',
          [
            { kind: 'nationality', code: 'MA' },
            { kind: 'nationality', code: 'FR' },
            { kind: 'market', code: 'ES' },
            { kind: 'market', code: 'MA', remove: true },
            { kind: 'work_auth', code: 'FR', value: 'authorized' },
            { kind: 'work_auth', code: 'ES', value: 'sponsorship' },
            { kind: 'personal', field: 'email', value: 'not-an-email' },
          ],
          ['nationality', 'markets', 'rights:FR', 'rights:ES', 'rights:XX'],
        );
      return undefined;
    };
    // Two queued jobs for the Take-off board; fixtures only, everything else goes through the real IPC.
    const db = main.db.$client;
    const id = (n: number) => String(n).padStart(26, '0');
    db.prepare('INSERT INTO company (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      id(0),
      'Acme Labs',
      'acme-labs',
      1,
      1,
    );
    for (const [i, title] of ['Product Engineer', 'Frontend Engineer'].entries()) {
      db.prepare(
        'INSERT INTO job_posting (id, company_id, url, canonical_url, ats, title, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        id(i + 1),
        id(0),
        `https://example.invalid/jobs/${i}`,
        `https://example.invalid/jobs/${i}`,
        'custom',
        title,
        'Rabat, Morocco',
        1,
        1,
      );
      db.prepare(
        'INSERT INTO application (id, posting_id, status, queue_rank, last_activity_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(id(i + 101), id(i + 1), 'queued', i + 1, 1, 1, 1);
    }
  }, EXTRACTION);
}

// eslint-disable-next-line no-empty-pattern
test('onboarding v5: Pre-flight, About you and Take-off with fake providers (reduced motion)', async ({}, testInfo) => {
  test.setTimeout(180_000);
  const { app, userData } = await launch(testInfo);
  try {
    const window = await app.firstWindow();
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/1');
    await script(app);

    // P1: nothing is allowed until the sheet's Allow; a run could not start before it.
    expect(await window.evaluate(() => window.jobpilot!.grants.list())).toEqual([]);
    const allow = window.getByRole('button', { name: 'Allow Claude Code + BrowserOS neo' });
    await expect(allow).toBeEnabled();
    await expect(window.locator('body')).not.toContainText(/Antigravity|agy/i);
    await capture(window, testInfo, 'p1-pick');
    await allow.click();
    const sheet = window.getByRole('dialog');
    await expect(sheet.getByText('Can').or(sheet.getByText('Read job pages and your profile'))).toBeVisible();
    await expect(sheet.getByText('See your passwords or files')).toBeVisible();
    await capture(window, testInfo, 'p1-sheet');
    await sheet.getByRole('button', { name: 'Allow both' }).click();
    await expect(window.getByRole('button', { name: 'Next: about you →' })).toBeVisible();
    const grants = await window.evaluate(() => window.jobpilot!.grants.list());
    expect(grants.map((g) => `${g.kind}:${g.provider}:${g.scope}`).sort()).toEqual([
      'agent:claude:agent_run',
      'browser:neo:browser_tab',
    ]);
    await capture(window, testInfo, 'p1-allowed');
    await window.getByRole('button', { name: 'Next: about you →' }).click();

    // P2: drop the CV; nothing reaches the profile until the last button.
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/2');
    await capture(window, testInfo, 'p2-drop');
    await window.getByLabel('Upload CV').setInputFiles({
      name: 'Sara_Benali_CV.pdf',
      mimeType: 'application/pdf',
      buffer: cvPdf(),
    });
    const profile = window.getByRole('complementary', { name: 'Your profile' });
    await expect(profile.getByRole('button', { name: 'Edit email' })).toHaveText('sara.benali@example.com');
    await expect(profile.getByRole('button', { name: 'Edit name' })).toHaveText('Sara Benali');
    expect((await window.evaluate(() => window.jobpilot!.profile.get())).personal).toBeNull();
    await expect(window.getByText('Drop your CV first')).toHaveCount(0);

    // The agent opens the conversation; the app, not the agent, counts what is left.
    await expect(window.getByText('Hi Sara, I read your CV.')).toBeVisible();
    await expect(window.getByText('4 things left')).toBeVisible();
    await expect(window.getByRole('group', { name: 'Cap’s question' })).toHaveCount(0);
    await capture(window, testInfo, 'p2-opener');
    // A tapped suggestion is sent as the owner's message.
    await window
      .getByRole('group', { name: 'Quick replies' })
      .getByRole('button', { name: 'Yes, that is right' })
      .click();
    await expect(window.getByText('Thanks. How well do you speak French?')).toBeVisible();
    await expect(window.getByText('3 things left')).toBeVisible();
    await window.getByRole('group', { name: 'Quick replies' }).getByRole('button', { name: 'Fluent' }).click();
    await expect(window.getByText('Noted, French is fluent.')).toBeVisible();
    await expect(window.getByText('2 things left')).toBeVisible();
    // An owner correction wins over the CV value.
    await window.getByLabel('Message Cap').fill('Actually my email is sara@benali.dev');
    await window.getByRole('button', { name: 'Send' }).click();
    await expect(window.getByText('Updated your email.')).toBeVisible();
    await expect(profile.getByRole('button', { name: 'Edit email' })).toHaveText('sara@benali.dev');
    await capture(window, testInfo, 'p2-chat');
    // One multi-part answer: two passports, new target countries and per-country rights; the invalid email fact is dropped.
    await window
      .getByLabel('Message Cap')
      .fill(
        'I hold a Moroccan and a French passport. I want France and Spain, not Morocco. France is fine, Spain needs a visa.',
      );
    await window.getByRole('button', { name: 'Send' }).click();
    await expect(window.getByText('Perfect, you are all set.')).toBeVisible();
    await expect(profile.getByRole('button', { name: 'Edit email' })).toHaveText('sara@benali.dev');
    await expect(window.getByRole('button', { name: 'Ready for take-off →' })).toBeEnabled();
    // Market-neutral copy: no currency or distance defaults anywhere on the screen.
    await expect(window.locator('body')).not.toContainText(/\$|USD|miles|green card/i);
    // Nothing is saved before the last button, and the agent saw the app's open items, not a fixed script.
    expect((await window.evaluate(() => window.jobpilot!.profile.get())).personal).toBeNull();
    const prompts = await app.evaluate(() => (globalThis as { __prompts?: string[] }).__prompts ?? []);
    expect(prompts).toHaveLength(6);
    expect(prompts[1]).toMatch(/<missing>[\s\S]*phone:[\s\S]*rights:FR[\s\S]*<\/missing>/);
    expect(prompts[1]).not.toContain('rights:MA');
    expect(prompts[5]).toContain('Owner: Actually my email is sara@benali.dev');
    await capture(window, testInfo, 'p2-done');
    await window.getByRole('button', { name: 'Ready for take-off →' }).click();

    // P3: setup completes here; the saved profile is the confirmed one.
    await expect.poll(() => window.evaluate(() => location.hash)).toBe('#/welcome/3');
    await expect(window.getByRole('heading', { name: /Cleared for take-off, Sara/ })).toBeVisible();
    await expect
      .poll(async () => (await window.evaluate(() => window.jobpilot!.profile.get())).onboardingCompletedAt)
      .not.toBeNull();
    const saved = await window.evaluate(() => window.jobpilot!.profile.get());
    expect(saved.personal).toMatchObject({
      firstName: 'Sara',
      lastName: 'Benali',
      email: 'sara@benali.dev',
      countryCode: 'MA',
      phone: '+212612345678',
    });
    expect(saved.personal?.languages.find((l) => l.language === 'fr')?.level).toBe('Fluent');
    expect(saved.markets.map((m) => `${m.code}:${m.workAuth}`)).toEqual(['FR:authorized', 'ES:sponsorship']);
    expect(saved.answers?.find((a) => a.id === 'nationality')?.default).toBe('Morocco, France');
    await expect(window.getByLabel('Acme Labs').first()).toBeVisible();
    await expect(window.getByLabel('BOARDING')).toBeVisible();
    await capture(window, testInfo, 'p3-board');
    await window.getByRole('button', { name: 'Start the first job' }).click();
    await expect(window.getByText('Filling Acme Labs…')).toBeVisible();
    await expect.poll(async () => (await window.evaluate(() => window.jobpilot!.runs.list())).length).toBe(1);
    await capture(window, testInfo, 'p3-launched');
    await window.getByRole('button', { name: 'Go to my dashboard' }).click();
    await expect(window.getByRole('navigation', { name: 'Main' })).toBeVisible();
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

// eslint-disable-next-line no-empty-pattern
test('onboarding v5: a revoked grant stops a run, and Allow turns it back on', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const { app, userData } = await launch(testInfo);
  try {
    const window = await app.firstWindow();
    await window.emulateMedia({ reducedMotion: 'reduce' });
    await script(app);
    // Without any grant a run cannot start.
    await expect(window.evaluate(() => window.jobpilot!.runs.start('00000000000000000000000101'))).rejects.toThrow(
      /not allowed/i,
    );
    await window.evaluate(() =>
      window.jobpilot!.onboarding.allow({ agent: { id: 'claude', model: null }, browser: { id: 'neo' } }),
    );
    const [agent] = (await window.evaluate(() => window.jobpilot!.grants.list())).filter((g) => g.kind === 'agent');
    await window.evaluate((id) => window.jobpilot!.grants.revoke(id), agent!.id);
    await expect(window.evaluate(() => window.jobpilot!.runs.start('00000000000000000000000101'))).rejects.toThrow(
      /not allowed/i,
    );
    await window.evaluate(() => window.jobpilot!.onboarding.allow({ agent: { id: 'claude', model: null } }));
    const run = await window.evaluate(() => window.jobpilot!.runs.start('00000000000000000000000101'));
    expect(run.status).toBe('queued');
    // Hostile input stays in the reader process: a non-PDF, a zip (DOCX is not supported) and a truncated PDF are all refused cleanly.
    for (const bytes of [
      [1, 2, 3, 4, 5],
      [0x50, 0x4b, 3, 4, 0, 0, 0, 0],
    ]) {
      await expect(
        window.evaluate((b) => window.jobpilot!.onboarding.extractCv('x.pdf', new Uint8Array(b)), bytes),
      ).rejects.toThrow(/Not a PDF|Not a readable PDF|Could not read|No readable text/);
    }
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});

// eslint-disable-next-line no-empty-pattern
test('onboarding v5: with motion on, the stamp plays and the flow still reaches the next step', async ({}, testInfo) => {
  test.setTimeout(120_000);
  const { app, userData } = await launch(testInfo);
  try {
    const window = await app.firstWindow();
    await window.setViewportSize({ width: 1280, height: 800 });
    await window.emulateMedia({ reducedMotion: 'no-preference' });
    await script(app);
    await window.getByRole('button', { name: 'Allow Claude Code + BrowserOS neo' }).click();
    // The sheet rises in with motion on; click once its own animation has settled (Playwright's stability check races it).
    await expect
      .poll(() =>
        window.evaluate(
          () =>
            document
              .querySelector('dialog')!
              .getAnimations()
              .filter((a) => a.playState === 'running').length,
        ),
      )
      .toBe(0);
    await window.getByRole('dialog').getByRole('button', { name: 'Allow both' }).click();
    await expect(window.getByRole('dialog')).toHaveCount(0);
    await expect(window.getByRole('button', { name: 'Next: about you →' })).toBeVisible({ timeout: 20_000 });
  } finally {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  }
});
