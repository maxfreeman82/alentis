import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Charger .env.local (variables de l'app + TEST_USER_EMAIL/PASSWORD)
config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir:       './e2e',
  outputDir:     './e2e/test-results',
  fullyParallel: false,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 1,
  workers:       1,
  reporter: [
    ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
    ['line'],
  ],
  use: {
    baseURL:    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // ── Smoke : sans auth, pas de dépendance ──────────────────────────────
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // ── Setup : login Supabase org_admin une fois ──────────────────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // ── Auth-required org : dashboard, recrutement, etc. ──────────────────
    {
      name: 'chromium',
      testMatch: /(?<!smoke|talent-onboarding)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // ── Talent onboarding : spec indépendante (login inline) ──────────────
    {
      name: 'talent',
      testMatch: /talent-onboarding\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:             'pnpm dev',
    url:                 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout:             120_000,
  },
});
