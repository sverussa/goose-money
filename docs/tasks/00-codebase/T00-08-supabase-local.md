# T00-08 · Supabase local em Docker

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Back end | T00-01 | `feat/supabase-local` |

**Referências:** PROMPT 12.1, 6.1 · DECISOES D2, D18, D23 · Em aberto: cadastro de usuários

## Objetivo

Subir o Supabase completo na máquina, em Docker, pelo Supabase CLI, sem usar as migrações nativas dele.

## Escopo

- Dependência de dev na raiz: `supabase` (CLI 2, versão fixa com ≥ 7 dias; não usar a 3.0 ainda).
- `pnpm exec supabase init` → `supabase/config.toml` (versionado) e `supabase/.gitignore`.
- Ajustes no `config.toml`:
  - `project_id = "goose-money"`
  - `[api] schemas = ["public", "graphql_public"]` (o schema `flyway` nunca é exposto)
  - `[db.seed] enabled = false` (dados de exemplo vêm do app, T05-29)
  - `[auth] site_url = "http://localhost:1420"` e `additional_redirect_urls` com `http://localhost:1420/**`
  - `[auth] enable_signup` e `[auth.email] enable_confirmations` conforme a decisão D1
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
- [ ] A configuração de cadastro segue a decisão D1.

## Decisões

**D1. Como novos usuários entram no sistema?** (ponto "Cadastro de usuários" em aberto no DECISOES.md)

- **A)** Sem tela de cadastro: `enable_signup = false` e o usuário é criado pelo painel do Supabase. Conservador para um app pessoal. *(recomendado)*
- **B)** Cadastro aberto com confirmação por e-mail: `enable_signup = true` e `enable_confirmations = true`; exige desenhar a tela de cadastro.
- **C)** Só por convite: cadastro fechado e convites enviados pelo painel do Supabase (`inviteUserByEmail`); exige tela para definir a senha a partir do convite.
