import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      Authorization: `Basic ${Buffer.from('admin:docs').toString('base64')}`,
    },
  },
  projects: [
    {
      name: 'API',
      testDir: './tests',
      testMatch: /.*\.test\.ts/,
    },
  ],
});