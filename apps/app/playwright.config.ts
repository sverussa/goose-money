import { defineConfig, devices } from '@playwright/test';

// A mesma porta do Vite (T00-03): cada worktree testa o próprio servidor (D56).
const porta = Number(process.env.PORTA_APP ?? 1420);
const url = `http://localhost:${String(porta)}`;

// Dia a dia só no Chromium; antes do merge, `make test-e2e-completo` (E2E_COMPLETO=1) soma o
// WebKit. Dois workers fora do CI: com o Supabase e o app, mais que isso sobrecarrega a máquina.
const completo = !!process.env.E2E_COMPLETO;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/preparar.ts',
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? undefined : 2,
  use: { baseURL: url },
  webServer: {
    command: 'pnpm dev',
    url,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // WebKit aproxima a WebView do Tauri no macOS.
    ...(completo ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }] : []),
  ],
});
