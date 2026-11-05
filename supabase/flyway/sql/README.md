# Migrações Flyway

Todo comando de banco (tabelas, índices, restrições, políticas RLS, grants, triggers e funções RPC) é uma migração aqui, aplicada pelo container do Flyway (`docker-compose.yml` na raiz). Regras completas em `docs/PROMPT.md` 9.4 e 12.2.

```sh
docker compose run --rm flyway migrate   # ou info, validate
```

## Nomes

- `V###__descricao.sql`: migração versionada, aplicada uma vez, em ordem (`V001__funcoes_base.sql`, `V002__contas.sql`…). Descrição em português, em `snake_case`, dizendo o que a migração faz.
- `R__descricao.sql`: migração repetível, para funções RPC e views, sempre com `create or replace`. O Flyway reaplica quando o conteúdo muda.

## Regras

- Migração já aplicada nunca é editada: o `validate` falha pela diferença de checksum. Correção é uma nova migração.
- `flyway clean` fica desabilitado em todos os ambientes.
- Não tocar nos schemas gerenciados pelo Supabase (`auth`, `storage`); só referenciar (`auth.users`, `auth.uid()`).
- O histórico fica no schema `flyway`, que não é exposto pela API.

## Checklist de toda tabela nova

1. Colunas de controle e o trigger:
   ```sql
   id          uuid primary key default gen_random_uuid(),
   created_at  timestamptz not null default now(),
   updated_at  timestamptz not null default now(),
   created_by  uuid not null default auth.uid() references auth.users on delete restrict,
   is_deleted  boolean not null default false
   ```
   ```sql
   create trigger set_updated_at before update on public.<tabela>
     for each row execute function public.set_updated_at();
   ```
2. `alter table public.<tabela> enable row level security;` e políticas de `select`, `insert` e `update` com `created_by = auth.uid()` (`with check` no `insert` e no `update`).
3. `revoke delete on public.<tabela> from authenticated, anon;` e `revoke all on public.<tabela> from anon;`.
4. Índices de unicidade parciais `where not is_deleted` e chaves estrangeiras `on delete restrict`.
