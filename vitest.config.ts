import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          include: ['src/**/*.test.ts'],
          exclude: ['src/motor/desempenho.test.ts'],
          environment: 'node',
        },
      },
      {
        // Tempos de 9.3 medidos sozinhos, depois dos outros projetos: em paralelo, a disputa
        // de CPU com os demais workers (e o Supabase no Docker) estoura os limites.
        test: {
          name: 'desempenho',
          root: './packages/core',
          include: ['src/motor/desempenho.test.ts'],
          environment: 'node',
          sequence: { groupOrder: 1 },
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
      // Testes de banco (T02-01): precisam do Supabase local, que o CI ainda não sobe (D29).
      ...(process.env.CI
        ? []
        : [
            {
              test: {
                name: 'db',
                root: './supabase/tests',
                include: ['**/*.test.ts'],
                environment: 'node',
                globalSetup: ['./preparar.ts'],
              },
            },
          ]),
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
