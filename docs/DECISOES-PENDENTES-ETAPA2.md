# Decisões pendentes da etapa 2 (banco)

Casos que a spec não cobre ou em que o texto da tarefa diverge do `MODELO-DADOS.md` aprovado. Em cada um, a opção mais conservadora foi seguida; aguardam aprovação.

## T02-01
1. Testes de banco ficam fora do `pnpm test` no CI (`CI=true`), que ainda não sobe o Supabase (D29). Localmente, com o Supabase desligado, `make test` falha com "Supabase local desligado: rode make db-start e make db-migrate".
2. Chaves dos testes em `supabase/tests/.env` (fora do Git), com `supabase/tests/.env.example` ao lado; `make setup` copia o exemplo. A `service_role` não aparece no `.env` da raiz.
3. `supabase/tests` virou um pacote do workspace (`@goose-money/db-tests`), com dependências (`postgres`, `@supabase/supabase-js`, core) e `typecheck` próprios.
4. Teste de exemplo: o PostgREST não executa SQL solto e ainda não há função RPC; o usuário criado confere a própria sessão pela API e o `select 1` vai pela conexão direta.
5. O teste de desempenho do core (`desempenho.test.ts`, 9.3) falhava às vezes já na `main` (54–60 ms contra o limite de 50 ms) por disputa de CPU entre os workers e o Docker. Passou a rodar num projeto Vitest próprio (`desempenho`), sozinho, depois dos outros (`sequence.groupOrder`). O limite não mudou.
