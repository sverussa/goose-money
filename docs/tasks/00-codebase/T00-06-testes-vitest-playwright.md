# T00-06 · Testes: Vitest e Playwright com axe

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Qualidade | T00-05 | `feat/testes-base` |

**Referências:** PROMPT 2, 9.3, 11 · DECISOES D20

## Objetivo

Deixar prontas as duas camadas de teste: Vitest para o core e para funções do app, Playwright com axe-core para a interface.

## Escopo

- Dependências na raiz: `vitest`, `@vitest/coverage-v8`. No app: `@playwright/test`, `@axe-core/playwright`.
- `vitest.config.ts` na raiz com `test.projects`:
  - `packages/core`: ambiente `node`
  - `apps/app`: ambiente `node`, só arquivos `src/**/*.test.ts` (sem jsdom e sem Testing Library, D20)
- Cobertura do core com `@vitest/coverage-v8` e limite mínimo de 90% de linhas e de ramos em `packages/core`; abaixo disso o comando falha.
- `apps/app/playwright.config.ts`:
  - `testDir: "tests/e2e"`
  - `webServer`: `pnpm dev`, `url: http://localhost:1420`, `reuseExistingServer: !process.env.CI`
  - projetos `chromium` e `webkit` (WebKit aproxima a WebView do Tauri no macOS)
- `apps/app/tests/e2e/smoke.spec.ts`: abre `/`, confere o texto "Goose Money" e roda `AxeBuilder` sem violações.
- Scripts: raiz `test` (`vitest run`), `test:coverage`; app `test:e2e` (`playwright test`).
- Instalar navegadores: `pnpm --filter @goose-money/app exec playwright install chromium webkit`.

## Fora do escopo

Testes de banco (T02-01) e testes das telas (etapa 5).

## Passos

1. Configurar o Vitest e rodar o teste trivial do core (T00-02).
2. Configurar o Playwright e escrever o teste de fumaça.
3. Rodar `pnpm test`, `pnpm test:coverage` e `pnpm --filter @goose-money/app test:e2e`.

## Critérios de aceite

- [ ] `pnpm test` roda os projetos core e app.
- [ ] O teste de fumaça passa no Chromium e no WebKit, com axe sem violações.
- [ ] O relatório de cobertura do core é gerado e o limite está configurado.

## Decisão tomada

**D1. Cobertura do core:** 90% de linhas e de ramos, com falha abaixo disso (opção A, escolhida pelo Saulo em 05/11/2026). Registrada em `DECISOES.md` D31.
