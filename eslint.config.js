import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Fronteiras da arquitetura (D15, D19, D20).
const proibirSupabase = {
  group: ['@supabase/*'],
  message: 'Só src/data fala com o Supabase (D15).',
};
const proibirTauri = {
  group: ['@tauri-apps/*'],
  message: 'Só src/plataforma usa o Tauri.',
};

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/src-tauri/target',
      '**/src-tauri/gen',
      '**/coverage',
      '**/playwright-report',
      '**/test-results',
      'apps/app/src/components/ui/**',
      'design/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Arquivos de configuração fora dos tsconfig dos pacotes.
          allowDefaultProject: ['*.ts', 'apps/app/*.ts'],
          defaultProject: 'apps/app/tsconfig.node.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', '@goose-money/app'].map((name) => ({
            name,
            message: 'O core é TypeScript puro (D19).',
          })),
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: 'O core é TypeScript puro (D19).' },
            proibirSupabase,
            proibirTauri,
          ],
        },
      ],
    },
  },
  {
    files: ['apps/app/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    // Ponto de entrada: não é fronteira de Fast Refresh.
    files: ['apps/app/src/main.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['apps/app/src/**'],
    ignores: ['apps/app/src/data/**', 'apps/app/src/plataforma/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [proibirSupabase, proibirTauri] }],
    },
  },
  {
    files: ['apps/app/src/data/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [proibirTauri] }] },
  },
  {
    files: ['apps/app/src/plataforma/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [proibirSupabase] }] },
  },
  {
    // Cores só pelo tema (CLAUDE.md): nada de bg-[#...] nem hexadecimal solto.
    files: ['apps/app/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\[#|#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use as variáveis do tema, não cores literais.',
        },
        {
          selector: 'TemplateElement[value.raw=/\\[#|#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use as variáveis do tema, não cores literais.',
        },
      ],
    },
  },
);
