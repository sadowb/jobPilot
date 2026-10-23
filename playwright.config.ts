import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  projects: [
    { name: 'dev', testMatch: /(?:launch|add-job|runs|secrets)\.spec\.ts/ },
    { name: 'packaged', testMatch: /(?:launch|upgrade|add-job|runs|secrets)\.spec\.ts/ },
  ],
});
