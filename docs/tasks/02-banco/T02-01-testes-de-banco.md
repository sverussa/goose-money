# T02-01 · Base para testes de banco

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Testes | T00-09, T00-11 | `feat/db-testes` |

**Referências:** PROMPT 11.8, 12.1, 12.2 · DECISOES D18

## Objetivo

Permitir que cada migração da etapa 2 venha com testes rodando contra o Supabase local.

## Escopo

- Projeto Vitest `db` em `supabase/tests/` (ambiente `node`), separado dos testes de core e app.
- `supabase/tests/apoio.ts`:
  - lê URL e chaves locais do `.env` de teste (`SUPABASE_SERVICE_ROLE_KEY` só aqui, nunca com prefixo `VITE_`)
  - `criarUsuario(email)` com a chave `service_role` (API admin), devolvendo um cliente autenticado como esse usuário
  - `clienteAnonimo()`
  - `sqlComoPostgres(query)` para conferir o que está gravado, ignorando RLS (via conexão direta com `postgres` em `127.0.0.1:54322`, usando o pacote `postgres`)
  - limpeza: cada arquivo de teste usa usuários com e-mail único e não depende de outros testes
- Script `test:db` e inclusão em `make test`, com aviso claro quando o Supabase local não está rodando.
- Um teste de exemplo: usuário criado consegue chamar `select 1` pela API.

## Fora do escopo

Testes das tabelas (cada tarefa da etapa 2 traz os seus).

## Passos

1. Instalar `postgres` (cliente SQL) como dev no workspace raiz.
2. Escrever os utilitários e o teste de exemplo.
3. Rodar com o Supabase local ligado e desligado.

## Critérios de aceite

- [ ] `make test` roda os testes de banco quando o Supabase local está ligado.
- [ ] Com o Supabase desligado, a mensagem diz "rode make db-start".
- [ ] A chave `service_role` só aparece em `supabase/tests/` e no `.env` de teste.
