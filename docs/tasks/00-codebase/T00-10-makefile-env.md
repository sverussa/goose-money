# T00-10 · Makefile, scripts e `.env.example`

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Ferramentas | T00-06, T00-07, T00-09 | `feat/makefile` |

**Referências:** PROMPT 12.1, 12.3 · DECISOES D24

## Objetivo

Um comando `make` curto e documentado para cada tarefa do dia a dia.

## Escopo

- Scripts no `package.json` da raiz (a lógica fica aqui, não no Makefile):
  - `dev`, `dev:desktop`, `build`, `build:desktop` → repassam para `@goose-money/app` com `pnpm --filter`
  - `lint`, `format`, `format:check`, `typecheck` (todos os pacotes: `pnpm -r typecheck`), `test`, `test:e2e`
- `Makefile` na raiz com todos os alvos de PROMPT 12.3 e mais `db-types` (gera tipos do banco, usado em T00-11):
  - compatível com GNU Make 3.81 (sem `.ONESHELL`, sem `$(file ...)`)
  - `.DEFAULT_GOAL := help`; `help` lista os alvos lendo o comentário `## descrição` de cada linha
  - `.PHONY` com todos os alvos
  - `db-reset` e `db-migrate-prod` pedem confirmação digitada (por exemplo, digitar `RESET` e `PRODUCAO`)
  - `db-migrate-prod` usa `docker compose --env-file .env.producao run --rm flyway migrate` e falha com mensagem clara se `.env.producao` não existir
  - `setup` roda `pnpm install` e copia `.env.example` para `.env` se o `.env` não existir
- `.env.example` (no Git):
  - `PORTA_APP=1420` (cada worktree usa a sua, de 1420 a 1424; a 1420 fica para quem roda o Tauri)
  - `VITE_SUPABASE_URL=http://127.0.0.1:54321`
  - `VITE_SUPABASE_ANON_KEY=` (preencher com `make db-status`)
  - `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD` locais (T00-09)
  - comentário avisando que a chave `service_role` nunca vai para variável `VITE_`
- Atualizar a tabela de PROMPT 12.3 com o alvo `db-types`.

## Fora do escopo

CI (T00-12).

## Passos

1. Escrever os scripts e o Makefile.
2. Testar cada alvo num clone limpo: `make setup`, `make db-start`, `make db-migrate`, `make dev`, `make test`, `make check`.
3. Testar `make db-reset` cancelando e confirmando.

## Critérios de aceite

- [ ] `make` sem argumentos lista todos os alvos com descrição.
- [ ] Cada alvo de PROMPT 12.3 funciona (ou explica o que falta, como o Docker parado).
- [ ] `db-reset` e `db-migrate-prod` não rodam sem a confirmação.
- [ ] Num clone limpo, `make setup && make db-start && make db-migrate && make dev` deixa o app rodando.
