import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the dev server with the local PGlite database.
// Locally they use the installed Edge; CI installs Chromium (PW_CHANNEL unset there).
const channel = process.env.CI ? undefined : process.env.PW_CHANNEL ?? 'msedge';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3210', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run db:migrate && npx next dev -p 3210',
    url: 'http://localhost:3210',
    // Sign-in only accepts requests from its own address, so the test server must know its port
    // 11:00 on a Wednesday in Lagos, so Heads up and "tonight" are the same on every run
    env: { HAVEN_FAKE_NOW: '2026-11-18T10:00:00Z', BETTER_AUTH_URL: 'http://localhost:3210', BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-only-secret-not-used-anywhere-real' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
