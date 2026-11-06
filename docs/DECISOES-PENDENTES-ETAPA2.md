# Decisões pendentes da etapa 2 (banco)

Casos que a spec não cobre ou em que o texto da tarefa diverge do `MODELO-DADOS.md` aprovado. Em cada um, a opção mais conservadora foi seguida; aguardam aprovação.

## T02-01
1. Testes de banco ficam fora do `pnpm test` no CI (`CI=true`), que ainda não sobe o Supabase (D29). Localmente, com o Supabase desligado, `make test` falha com "Supabase local desligado: rode make db-start e make db-migrate".
2. Chaves dos testes em `supabase/tests/.env` (fora do Git), com `supabase/tests/.env.example` ao lado; `make setup` copia o exemplo. A `service_role` não aparece no `.env` da raiz.
3. `supabase/tests` virou um pacote do workspace (`@goose-money/db-tests`), com dependências (`postgres`, `@supabase/supabase-js`, core) e `typecheck` próprios.
4. Teste de exemplo: o PostgREST não executa SQL solto e ainda não há função RPC; o usuário criado confere a própria sessão pela API e o `select 1` vai pela conexão direta.
5. O teste de desempenho do core (`desempenho.test.ts`, 9.3) falhava às vezes já na `main` (54–60 ms contra o limite de 50 ms) por disputa de CPU entre os workers e o Docker. Passou a rodar num projeto Vitest próprio (`desempenho`), sozinho, depois dos outros (`sequence.groupOrder`). O limite não mudou.

## T02-02
1. A lista fixa de tabelas fica numa função própria, `tabelas_de_negocio()` (`R__tabelas_de_negocio.sql`), para `gravar`, `carregar_tudo`, `apagar_tudo` e os testes de segurança usarem a mesma lista.
2. `dados` vem com os nomes do banco (`snake_case`); a tradução de `Mudanca` (entidade e campos em `camelCase`) para `ops` fica em `src/data` (T03-04).
3. Coluna desconhecida em `dados` é erro (`42703`), em vez de ser ignorada em silêncio.
4. `alterar` de registro inexistente ou de outro usuário (o RLS esconde) é erro `P0002`, em vez de não fazer nada.
5. `alterar` só com colunas de controle (`id`, `created_at`, `created_by`, `updated_at`) não muda nada e devolve a linha.
6. Erros de restrição saem com o mesmo código (`23505`, `23503`, `23514`, `23502`, `P0001`) e `detail` em JSON com `tabela`, `operacao` (posição na lista) e `restricao`. As checagens adiadas (T02-05, T02-06) rodam no fim da função com `set constraints all immediate`, com `tabela` e `operacao` nulos.
7. O retorno traz a última versão de cada id, por tabela.
