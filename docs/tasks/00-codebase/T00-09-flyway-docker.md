# T00-09 · Flyway em Docker e migração base

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | Back end | T00-08 | `feat/flyway` |

**Referências:** PROMPT 9.4, 12.2 · DECISOES D22, D23, D25

## Objetivo

Aplicar migrações no Postgres do Supabase local pelo container do Flyway e criar a migração base que toda tabela vai usar.

## Escopo

- `docker-compose.yml` na raiz, exatamente como em PROMPT 12.2 (imagem `flyway/flyway:13.11.1-alpine` ou mais nova com ≥ 7 dias).
- Variáveis no `.env` (e no `.env.example`, T00-10):
  - `FLYWAY_URL=jdbc:postgresql://host.docker.internal:54322/postgres`
  - `FLYWAY_USER=postgres`
  - `FLYWAY_PASSWORD=postgres`
- `supabase/flyway/sql/V001__funcoes_base.sql`:
  1. Função `public.set_updated_at()` (`returns trigger`, `language plpgsql`), que faz `new.updated_at = now()` e não deixa `created_at` nem `created_by` mudarem (`new.created_at = old.created_at; new.created_by = old.created_by`).
  2. `alter default privileges in schema public revoke delete on tables from authenticated, anon;`
  3. `alter default privileges in schema public revoke all on tables from anon;`
  4. `alter default privileges in schema public revoke execute on functions from anon;`
- `supabase/flyway/sql/README.md` com a checklist de toda tabela nova (PROMPT 12.2) e a convenção de nomes (`V###__descricao.sql`, `R__descricao.sql`).

## Fora do escopo

Tabelas de negócio (etapa 2).

## Passos

1. Com o Supabase local rodando, `docker compose run --rm flyway migrate`.
2. `docker compose run --rm flyway info` e `validate`.
3. Rodar `migrate` de novo e confirmar que nada é reaplicado.
4. No SQL do Studio, conferir que `flyway.flyway_schema_history` existe e que `set_updated_at` está em `public`.
5. Pela API REST local, confirmar que o schema `flyway` não é acessível.

## Critérios de aceite

- [ ] `migrate` aplica a V001; a segunda execução não muda nada.
- [ ] A tabela de histórico fica no schema `flyway`, fora da API.
- [ ] `flyway clean` falha por estar desabilitado.
- [ ] Editar a V001 depois de aplicada faz o `validate` falhar (testar e desfazer).
