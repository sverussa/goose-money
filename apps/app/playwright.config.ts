import { defineConfig, devices } from '@playwright/test';

// A mesma porta do Vite (T00-03): cada worktree testa o próprio servidor (D56).
const porta = Number(process.env.PORTA_APP ?? 1420);
const url = `http://localhost:${String(porta)}`;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  use: { baseURL: url },
  webServer: {
    command: 'pnpm dev',
    url,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit aproxima a WebView do Tauri no macOS.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
