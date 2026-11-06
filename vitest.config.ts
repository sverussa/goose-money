import { defineConfig } from 'vitest/config';

// Testes de tempo do banco: rodam sozinhos, no fim (T00-14).
const TEMPO_DB = ['carregar-tudo.test.ts', 'massa.test.ts'];

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
          sequence: { groupOrder: 2 },
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
                exclude: ['**/node_modules/**', ...TEMPO_DB],
                environment: 'node',
                globalSetup: ['./preparar.ts'],
              },
            },
            {
              // Tempos do banco (9.3) depois de todos os outros, como o `desempenho` (T00-14).
              test: {
                name: 'db-tempo',
                root: './supabase/tests',
                include: TEMPO_DB,
                environment: 'node',
                globalSetup: ['./preparar.ts'],
                sequence: { groupOrder: 3 },
                // Um arquivo por vez: os dois medem tempo e disputariam o banco entre si.
                fileParallelism: false,
              },
            },
            {
              // src/data do app contra o banco, com usuários dos utilitários de supabase/tests.
              // Depois do `db`, para não disputar o banco com os testes de tempo dele.
              extends: './apps/app/vite.config.ts',
              test: {
                name: 'app-db',
                sequence: { groupOrder: 1 },
                root: './apps/app',
                include: ['tests/db/**/*.test.ts'],
                environment: 'node',
                globalSetup: ['../../supabase/tests/preparar.ts'],
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
