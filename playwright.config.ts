import { defineConfig, devices } from '@playwright/test'
const production = process.env.TEST_PRODUCTION === '1'
const baseURL = `http://127.0.0.1:${production ? 4174 : 4173}/shixi-study/`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    timezoneId: 'Asia/Shanghai',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: production
      ? 'node scripts/serve-dist.mjs'
      : 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort --base /shixi-study/',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
