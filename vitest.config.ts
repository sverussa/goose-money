import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // Funções do app, sem jsdom nem Testing Library (D20).
        extends: './apps/app/vite.config.ts',
        test: {
          name: 'app',
          root: './apps/app',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          passWithNoTests: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      // D31: abaixo de 90% de linhas ou de ramos, o comando falha.
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
