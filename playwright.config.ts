import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  projects: [
    {
      name: 'dev',
      testMatch: /(?:launch|first-launch|add-job|diagnostics|runs|live-list|secrets|agents|memory)\.spec\.ts/,
    },
    {
      name: 'packaged',
      testMatch: /(?:launch|first-launch|upgrade|add-job|diagnostics|runs|live-list|secrets|agents|memory)\.spec\.ts/,
    },
  ],
});
