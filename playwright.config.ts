import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.BUBBLE_E2E_URL || 'http://localhost:8091';
const apiURL = process.env.BUBBLE_E2E_API_URL || 'http://localhost:8085';
for (const value of [baseURL, apiURL]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(value).hostname)) throw new Error('Browser tests require isolated localhost servers.');
}
if (process.env.BUBBLE_E2E_DISPOSABLE !== '1') throw new Error('Confirm an isolated test database with BUBBLE_E2E_DISPOSABLE=1.');
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, retries: 0,
  timeout: 45000, expect: { timeout: 10000 }, reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `pnpm web --port ${Number(new URL(baseURL).port || 8091)}`,
    url: baseURL, timeout: 120000,
    reuseExistingServer: process.env.BUBBLE_E2E_REUSE_SERVER === '1',
    env: { EXPO_PUBLIC_API_URL: apiURL, CI: '1', EXPO_NO_TELEMETRY: '1' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
