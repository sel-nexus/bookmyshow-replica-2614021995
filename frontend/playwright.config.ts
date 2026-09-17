import { defineConfig } from '@playwright/test';

/** Run E2E journeys against the local API through the frontend's same-origin proxy. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node node_modules/tsx/dist/cli.mjs src/server.ts',
      cwd: '../backend',
      env: {
        PORT: '4000',
        CORS_ORIGIN: 'http://127.0.0.1:3000',
        DATABASE_PATH: '/tmp/bookmyshow-playwright.db',
      },
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node node_modules/next/dist/bin/next dev -p 3000',
      cwd: '.',
      env: {
        API_PROXY_TARGET: 'http://127.0.0.1:4000',
      },
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
