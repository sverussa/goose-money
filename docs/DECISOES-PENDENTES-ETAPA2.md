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

## T02-03
1. `categorias.sistema` é a chave de texto do modelo (D62: `a_classificar`, `juros_encargos`, `tarifas`, `ajuste_saldo`), não o booleano do texto da tarefa.
2. Nome único de conta só dentro de `contas` (índice parcial `where not is_deleted and not arquivada`). A unicidade conjunta entre contas e cartões (D67, como o core confere no backup) fica no core: índice único não cruza tabelas.
3. Nome único entre categorias irmãs do mesmo tipo (mesmo pai, ou ambas sem pai): "Outras" pode existir em receita e em despesa.
4. Categoria de sistema: o trigger recusa mudar nome, tipo, ícone, cor, pai e `is_deleted`; nenhuma categoria muda o próprio `sistema`. Regravar com os mesmos valores passa (importação no modo Substituir).
5. Um nível de subcategoria, filha com o tipo da pai e pai excluída sem as filhas: trigger adiado `categorias_um_nivel` (D35, D49).
6. O banco também confere o formato da chave de cor (`^[a-z][a-z0-9-]*$`); categoria do usuário pode ficar sem cor, como no core.
7. Chaves estrangeiras compostas `deferrable initially deferred`, para o lote de `gravar` valer em qualquer ordem (importação, subcategoria antes da pai). Checklist do `supabase/flyway/sql/README.md` atualizada.
8. Políticas `to authenticated` com `(select auth.uid())`, calculado uma vez por consulta.
9. O passo `make db-reset` da tarefa não foi preciso. A V002–V004 aplicada só no banco local desta branch foi desfeita à mão (drop das tabelas e das linhas do histórico do Flyway) e reaplicada com a chave estrangeira adiada, antes do merge.

## T02-04
1. Sem colunas de origem (recorrência, ocorrência) no lançamento, como pede o texto da tarefa: a origem é derivada (MODELO-DADOS seção 5, D69). Ficam só os vínculos do modelo (`cartao_id`, `fatura_competencia`, `divida_id`, `parcela_divida_id`); as chaves estrangeiras de cartão e dívida chegam na V006 e na V009.
2. D79 no banco: trigger recusa lançamento efetivado com data depois de hoje, com "hoje" no fuso `America/Sao_Paulo`. Quem estiver num fuso adiantado (ex.: Lisboa depois das 21h de Brasília) não grava efetivado com a própria data de hoje até virar o dia em Brasília (conservador). Só confere ao inserir ou quando data ou status mudam.
3. Uma parcela de dívida tem no máximo um `pagamento_divida` ativo (índice único parcial), para não contar o pagamento duas vezes.
4. O tipo da categoria (receita, despesa, `ajuste_saldo` no ajuste) não é conferido no banco; fica no core (`validarLancamento`), como as demais regras compostas (D36).
5. Cada regra por tipo é um `check` com nome próprio (`lancamentos_destino`, `lancamentos_categoria`, `lancamentos_fatura`, `lancamentos_divida`, `lancamentos_previsto`, `lancamentos_valor`), para o app traduzir pelo nome.

## T02-05
1. Sem a tabela `alocacoes_pagamento` do texto da tarefa: a alocação são os campos `cartao_id` e `fatura_competencia` do lançamento `pagamento_fatura` (D59). A V006 acrescenta a chave estrangeira de `lancamentos.cartao_id`.
2. Sem a coluna `paga_antes_do_cadastro` em `parcelas`: é derivada da competência (D60).
3. `compras.cancelada` é só o booleano do modelo, sem a data do cancelamento que o texto da tarefa cita (a data do estorno fica no item de fatura).
4. Trigger adiado `compras_parcelas_conferem`: compra ativa e não cancelada tem exatamente as parcelas 1..n somando o valor total; cancelada só mantém parcelas entre 1 e n; **compra excluída não pode ficar com parcelas ativas** (exclusão em conjunto, 11.8). A ordem das competências fica no core.
5. Trigger adiado `cartoes_conta_pagamento` dos dois lados: gravar um cartão ativo com conta arquivada, excluída ou fora do total é recusado, e também tirar do total, arquivar ou excluir a conta de pagamento de um cartão ativo.
6. Não conferidos no banco (ficam no core, D36): categoria do encargo ser `juros_encargos` ou `tarifas`; item de fatura com compra de outro cartão; excluir a compra levar os itens de fatura dela.
7. A V007 aplicada só no banco local desta branch tinha um erro no trigger; foi desfeita à mão (drop e histórico do Flyway da V007 e V008) e reaplicada corrigida, antes do merge.

## T02-06
1. Sem as colunas "saldo devedor após", "status pago" e "lançamento de pagamento" em `parcelas_divida`, citadas no texto da tarefa: são derivadas (MODELO-DADOS 3.10). O pagamento é o lançamento `pagamento_divida` que aponta para a parcela. A coluna do sistema é `sistema_amortizacao`, como no modelo.
2. `taxa_mensal` é `numeric` sem escala fixa (o modelo), e não `numeric(12,8)`: não arredonda a taxa digitada. Nula só na parcela informada.
3. Invariante adiada `dividas_amortizacoes_conferem`: amortizações das parcelas ativas + lançamentos `amortizacao` ativos = valor contratado (equivale a saldo devedor final zero, D3). Dívida excluída não pode ficar com parcelas ativas. A numeração e a quantidade de parcelas ficam no core (amortizar e "reduzir prazo" mudam a quantidade).
4. "Parcela paga" para o trigger `parcelas_divida_paga_imutavel` = `paga_antes_do_cadastro` ou com `pagamento_divida` ativo; o trigger recusa mudar valor, juros ou amortização (excluir a parcela continua possível, para excluir a dívida sem pagamentos).
5. O pagamento aponta para uma parcela da mesma dívida (chave estrangeira `(parcela_divida_id, divida_id, created_by)`).
6. Não conferido no banco (core): parcela `paga_antes_do_cadastro` com `pagamento_divida`.

## T02-07
1. Retrato da ocorrência no banco, igual ao core: confirmada exige valor, data, categoria e exatamente um par (conta + lançamento) ou (cartão + compra); ignorada tem o retrato todo nulo (`ocorrencias_retrato`).
2. Não conferidos no banco (core, D36): renda só com forma de pagamento "conta"; excluir a recorrência levar versões e ocorrências; excluir o lançamento ou a compra de uma ocorrência levar a ocorrência (D68).
3. O teste de concorrência usa duas sessões do mesmo usuário gravando a mesma confirmação ao mesmo tempo: uma grava, a outra recebe `23505` e o lote dela (com a receita) é desfeito inteiro.
