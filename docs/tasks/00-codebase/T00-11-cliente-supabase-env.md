# T00-11 · Cliente Supabase e variáveis de ambiente no app

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 0 · Codebase | App · Dados | T00-08, T00-10 | `feat/cliente-supabase` |

**Referências:** PROMPT 2.1, 6.1 · DECISOES D2, D15, D18, D20 (PKCE)

## Objetivo

Criar o único ponto do app que fala com o Supabase, com variáveis validadas e tipos gerados do banco.

## Escopo

- Dependência no app: `@supabase/supabase-js` 2.
- `apps/app/src/app/env.ts`: valida `import.meta.env` com Zod (`VITE_SUPABASE_URL` URL, `VITE_SUPABASE_ANON_KEY` não vazia). Se faltar algo, o app mostra a tela "Configuração incompleta" com o nome da variável, em vez de quebrar.
- `apps/app/src/data/supabase.ts`: `createClient<Database>(url, anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage } })`.
  - `storage` é um adaptador que grava em `localStorage` ou `sessionStorage` conforme a preferência "Manter conectado" (a chave da preferência fica em `localStorage`; a tela que a usa é T05-01).
- `apps/app/src/data/database.types.ts` gerado por `make db-types` (`supabase gen types typescript --local`). Nesta tarefa o arquivo só tem os tipos vazios; ele é regenerado a cada migração da etapa 2.
- Teste unitário do adaptador de `storage` (escolhe o armazenamento certo).

## Fora do escopo

Login, guarda de rotas e sessão (T03-01).

## Passos

1. Instalar e escrever os arquivos.
2. Rodar com `.env` válido e com `VITE_SUPABASE_URL` vazia.
3. `make build` e procurar `service_role` no `dist/`.

## Critérios de aceite

- [ ] Sem variável, o app mostra "Configuração incompleta" com o nome dela.
- [ ] O cliente é criado com `flowType: 'pkce'`.
- [ ] O build não contém o texto `service_role` nem a chave `service_role` local.
- [ ] A regra de lint de T00-05 impede importar `@supabase/supabase-js` fora de `src/data`.
