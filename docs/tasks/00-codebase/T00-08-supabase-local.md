# T00-08 · Supabase local em Docker

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Back end | T00-01 | `feat/supabase-local` |

**Referências:** PROMPT 12.1, 6.1 · DECISOES D2, D18, D23, D28

## Objetivo

Subir o Supabase completo na máquina, em Docker, pelo Supabase CLI, sem usar as migrações nativas dele.

## Escopo

- Dependência de dev na raiz: `supabase` (CLI 2, versão fixa com ≥ 7 dias; não usar a 3.0 ainda).
- `pnpm exec supabase init` → `supabase/config.toml` (versionado) e `supabase/.gitignore`.
- Ajustes no `config.toml`:
  - `project_id = "goose-money"`
  - `[api] schemas = ["public", "graphql_public"]` (o schema `flyway` nunca é exposto)
  - `[db.seed] enabled = false` (dados de exemplo vêm do app, T05-29)
  - `[auth] site_url = "http://localhost:1420"` e `additional_redirect_urls` com `http://localhost:1420/**` a `http://localhost:1424/**` (uma porta por worktree, D56)
  - `[auth] enable_signup = true`, `[auth.email] enable_confirmations = true` e `[auth] minimum_password_length = 8` (D28)
  - `[auth.email] double_confirm_changes = true`
  - `[inbucket]`/Mailpit ligado (porta 54324) para testar e-mails
- Garantir que **não existe** `supabase/migrations/` (as migrações são do Flyway, T00-09).
- Conferir que o Docker está rodando antes de `supabase start`.

## Fora do escopo

Migrações (T00-09), cliente no app (T00-11), tela de login (T05-01).

## Passos

1. Instalar o CLI e rodar o `init`.
2. Ajustar o `config.toml`.
3. `pnpm exec supabase start` e anotar URL da API, chave `anon` e chave `service_role` locais.
4. Abrir o Studio (`http://127.0.0.1:54323`) e o Mailpit (`http://127.0.0.1:54324`).
5. `pnpm exec supabase stop`.

## Critérios de aceite

- [ ] `supabase start` sobe API (54321), Postgres (54322), Studio (54323) e Mailpit (54324).
- [ ] `supabase status` mostra as chaves locais.
- [ ] Não existe pasta `supabase/migrations/`.
- [ ] Cadastro aberto com confirmação: o e-mail de confirmação chega ao Mailpit e, antes de confirmar, o login é recusado.

## Decisão tomada

**D1. Entrada de novos usuários:** cadastro aberto com confirmação por e-mail (opção B, escolhida pelo Saulo em 05/11/2026). A tela de cadastro é a T05-30. Registrada em `DECISOES.md` D28.
