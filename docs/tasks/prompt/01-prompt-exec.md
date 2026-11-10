# Etapa 1 · Domínio · prompt de execução

| | |
| --- | --- |
| Tarefas | T01-01 a T01-22 (`docs/tasks/01-dominio/`) |
| Trilha | C · Core: `packages/core/src/<contexto>/` (`dinheiro`, `datas`, `periodos`, `modelo`, `contas`, `cartoes`, `dividas`, `recorrencias`, `motor`, `seed`, `backup`, `comandos`) |
| Estado | Concluída |
| Modelo | Opus (cartões, dívidas, Motor e comandos). Sonnet só para T01-02 e T01-03 |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA1.md` |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`. Na primeira execução, a etapa rodou em sessões por tarefa.

## Como usar

Cole um dos prompts abaixo, trocando `<N>` pelo número da leva. A leva 1 (T01-01) é sempre em sessão única, porque termina com a sua aprovação. O prompt é retomável: tarefas com ✅ são puladas.

**Com subagentes:**

```
Você é o coordenador da leva <N> de docs/tasks/prompt/01-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, com o modelo indicado na leva) com este pedido:

  Execute a tarefa <T01-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/01-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, rode `pnpm test:coverage 2>&1 | tail -20` e me entregue um resumo das tarefas, da cobertura e das decisões pendentes.
```

**Sessão única:**

```
Execute as tarefas da leva <N> de docs/tasks/prompt/01-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md
   - `docs/MODELO-DADOS.md` (o contrato)
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa
   - só as seções do PROMPT.md e do DECISOES.md que ela cita. A seção 3 do PROMPT.md vence qualquer conflito
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:**
   - TypeScript puro: o core nunca importa React, `@supabase/supabase-js`, DOM nem rede
   - dinheiro em centavos, com decimal.js e as funções de `dinheiro/` (T01-02); datas civis com as funções de `datas/` (T01-03). Nada de `Date` solto nem `number` para dinheiro
   - cada indicador é uma função só
   - edite só `packages/core/src/<contexto>/` da tarefa e o `index.ts` que exporta
   - mudança no contrato (`docs/MODELO-DADOS.md` ou nos tipos e schemas de T01-05): pare e pergunte. Ela vira um PR separado do coordenador
5. **Testes primeiro:** escreva os testes com os valores exatos da spec (exemplos da seção 3 e critérios da seção 11), e só depois implemente. Use os dados de exemplo com hoje = 04/11/2026.
6. **Durante a tarefa,** rode só o que mudou, com saída curta:
   - `pnpm exec vitest run packages/core/src/<contexto>/ --reporter=dot`
   - `pnpm --filter @goose-money/core typecheck`
   - `pnpm exec eslint <arquivos alterados>`
7. **No fim:** `make check 2>&1 | tail -40` e `pnpm test:coverage 2>&1 | tail -20`. Tudo precisa passar, e a cobertura do core fica em 90% de linhas e ramos (D31).
8. **Critérios:** confira os critérios de aceite um a um.
9. **Testes:**
   - os testes de tempo do Motor rodam isolados, no projeto `desempenho` do `vitest.config.ts`. Não os rode em paralelo com outras coisas
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste
10. **Decisões:** caso que a spec não cobre: opção mais conservadora (a que mostra menos dinheiro disponível), anotada numa seção "## T01-YY" de `docs/DECISOES-PENDENTES-ETAPA1.md`.
11. **Fechamento:**
    - commit em Conventional Commits (`feat(core): ...`)
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T01-YY)"`
    - depois o commit "docs: marca T01-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Modelo de dados (T01-01)

**Ordem:** T01-01 · **Modelo:** opus · **Formato:** sessão única, com a minha aprovação

- Só documento: `docs/MODELO-DADOS.md` com entidades, campos, enums, relações e chaves únicas.
- É o contrato entre o core, o banco e a interface.
- Pode rodar no primeiro dia, em paralelo com a leva 1 da etapa 0.
- **Portão:** antes do merge, me mostre o modelo e espere a minha aprovação. Sem ela, nenhuma tarefa de T01-05, T02-03 ou posterior começa.

## Leva 2 · Fundamentos, contas e início de cartões

**Ordem:** T01-02 → T01-03 → T01-04 → T01-05 → T01-06 → T01-07 → T01-08 · **Modelo:** sonnet para T01-02 e T01-03; opus para as demais

- **T01-04:** "Últimos N meses" inclui o mês atual até hoje (D37).
- **T01-05:** schemas Zod sem `.default()`. Os padrões ficam no formulário e no banco.
- **T01-07:** `previaDoCadastro` devolve dados, e a frase fica na interface. Esse é o padrão para todo texto calculado no core.

## Leva 3 · Faturas, dívidas, recorrências e backup

**Ordem:** T01-09 → T01-10 → T01-11 → T01-12 → T01-13 → T01-20 · **Modelo:** opus

- **T01-09:** a fatura não tem tabela; ela é derivada de (cartão, competência) (D33, D38).
- **T01-11:** confira a parcela Price do exemplo de 11.5 com os valores exatos: saldo antes da última de R$ 1.155,49 e juros da última de R$ 17,22.
- **T01-13:** editar uma recorrência nunca muda ocorrências já gravadas (3.8).

## Leva 4 · Motor, seed, pendências e comandos

**Ordem:** T01-14 → T01-15 → T01-16 → T01-17 → T01-18 → T01-19 → T01-21 → T01-22 · **Modelo:** opus

- De T01-14 a T01-19 cada tarefa usa o resultado da anterior. Não paralelize.
- **T01-18:** os testes de tempo (9.3) ficam no projeto `desempenho`.
- **T01-19:** o seed com hoje = 04/11/2026 precisa reproduzir os valores das telas desenhadas.
- **T01-22:** as mudanças saem no formato `{ entidade, acao: 'inserir' | 'alterar', id, dados }` em camelCase. O mapeamento para o banco é só em `src/data` (etapa 3).
