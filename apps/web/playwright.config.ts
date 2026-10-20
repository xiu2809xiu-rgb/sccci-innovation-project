import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

/**
 * The e2e smoke test drives a running stack: by default the one
 * `docker compose up --build` serves on port 8080, in demo mode with
 * synthetic data. Point E2E_BASE_URL elsewhere to test another deployment.
 */
export default defineConfig({
  testDir: './e2e',
  // One long journey: several pages, an AI proposal and an axe scan of each step.
  timeout: 120_000,
  // A full stack answers its first requests after a start more slowly than unit tests expect.
  expect: { timeout: 15_000 },
  // The journey changes data (it approves a mapping), so runs never overlap.
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    // axe measures contrast on what is painted, so a panel still fading in reads as low
    // contrast. Reduced motion settles every page at once, and exercises that path too.
    reducedMotion: 'reduce',
    // Recording a trace throughout slows the software-rendered 3D teaser a great deal,
    // so it is kept for the CI retry of a failed run.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
