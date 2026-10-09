import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173/',
    // Use the installed Google Chrome locally; CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : 'chrome',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome', viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' } },
  ],
  webServer: {
    // CI tests the production build (exactly what gets deployed); locally, the dev server.
    command: process.env.CI || process.env.E2E_PROD ? 'npx vite build && npx vite preview --port 5173 --strictPort' : 'npm run dev',
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
