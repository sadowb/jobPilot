import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
  projects: [
    {
      name: 'dev',
      testIgnore: /upgrade\.spec\.ts/, // needs a packaged base app
    },
    {
      name: 'packaged',
    },
  ],
});
