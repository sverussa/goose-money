# T00-02 · Pacote `@goose-money/core`

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Core | T00-01 | `feat/pacote-core` |

**Referências:** PROMPT 2.1, 2.3 · DECISOES D12, D19

## Objetivo

Criar o pacote do domínio: TypeScript puro, sem React, sem rede e sem DOM.

## Escopo

- `packages/core/package.json`:
  - `"name": "@goose-money/core"`, `"type": "module"`, `"private": true`
  - `"exports": { ".": "./src/index.ts" }` (pacote só com código-fonte; quem compila é o Vite do app e o Vitest)
  - dependências: `decimal.js` e `zod` (versões exatas)
  - scripts: `typecheck` (`tsc --noEmit`) e `test` (`vitest run`)
- `packages/core/tsconfig.json`: estende `../../tsconfig.base.json`, com `"lib": ["ES2023"]` **sem `DOM`**. Assim, usar `window`, `document` ou `localStorage` no core quebra a checagem de tipos.
- `packages/core/src/index.ts` exportando só uma constante `VERSAO_CORE` (os módulos chegam nas tarefas da etapa 1).
- `packages/core/src/index.test.ts` com um teste trivial, para provar que o Vitest roda.

## Fora do escopo

Regras de domínio (etapa 1). Configuração de lint (T00-05) e do Vitest da raiz (T00-06).

## Passos

1. Criar os arquivos acima.
2. `pnpm install` na raiz.
3. `pnpm --filter @goose-money/core typecheck` e `pnpm --filter @goose-money/core test`.

## Critérios de aceite

- [ ] `typecheck` e `test` do core passam.
- [ ] Escrever `window.alert('x')` em qualquer arquivo do core faz o `typecheck` falhar (testar e desfazer).
- [ ] O `package.json` do core não tem React, Supabase nem Tauri.
