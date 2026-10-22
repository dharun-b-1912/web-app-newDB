import { defineConfig, devices } from '@playwright/test';

/**
 * Joy PeopleHR — Master Playwright End-to-End Test Configuration
 * Configured for SaaS full-stack regression, multi-tenancy, and module certification.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/unit/**', '**/__tests__/**'],
  /* Maximum time one test can run for */
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  /* Run tests sequentially by default to avoid localStorage and session collisions */
  fullyParallel: false,
  /* Fail the build on CI if test.only is committed */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Workers: 1 worker ensures stable serial execution across stateful workflows */
  workers: 1,
  outputDir: './scratch/test-results',
  /* Reporters: terminal list + HTML report + JSON output */
  reporter: [
    ['list'],
    ['html', { outputFolder: './scratch/playwright-report', open: 'never' }],
    ['json', { outputFile: './scratch/playwright-report/test-results.json' }],
  ],
  /* Shared settings for test runs */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  /* Browser configuration */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Run or reuse existing dev server */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
