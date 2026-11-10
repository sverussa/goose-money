# Etapa 2 · Banco · prompt de execução

| | |
| --- | --- |
| Tarefas | T02-01 a T02-11 (`docs/tasks/02-banco/`) |
| Trilha | B · Banco: `supabase/` (`flyway/sql/`, `tests/`, `config.toml`) |
| Estado | Concluída |
| Modelo | Opus |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA2.md` |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`. Na primeira execução, a etapa rodou numa sessão única com as 11 tarefas, sem as regras de teste enxuto da T00-14.

**O Supabase local é desta etapa com exclusividade.** Nenhuma outra sessão usa o banco local enquanto ela roda: migrações de branches diferentes quebram o Flyway (versões e checksums).

## Como usar

Cole um dos prompts abaixo, trocando `<N>` pelo número da leva. O prompt é retomável: tarefas com ✅ são puladas.

**Com subagentes:**

```
Você é o coordenador da leva <N> de docs/tasks/prompt/02-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, modelo opus) com este pedido:

  Execute a tarefa <T02-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/02-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de começar, suba o Supabase local com `make db-start` se ele não estiver rodando.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, rode `make check 2>&1 | tail -40` na main e me entregue um resumo das tarefas e das decisões pendentes.
```

**Sessão única:**

```
Execute as tarefas da leva <N> de docs/tasks/prompt/02-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Suba o Supabase local com `make db-start` se ele não estiver rodando.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md, com as regras de banco
   - `docs/MODELO-DADOS.md`
   - `supabase/flyway/sql/README.md` (checklist de tabela nova)
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa
   - só as seções do PROMPT.md (9.4, 12) e do DECISOES.md que ela cita
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:**
   - toda mudança de esquema é uma migração Flyway em `supabase/flyway/sql/`
     - use o número `V` reservado na tarefa (V001 a V010); fora do plano, o próximo número livre
     - nunca edite uma migração `V` já mergeada
     - nos repetíveis (`R__`), um conflito fica com a união das listas
   - toda tabela de negócio tem `id`, `created_at`, `updated_at` (gatilho `set_updated_at`), `created_by` (padrão `auth.uid()`) e `is_deleted`
   - RLS com `created_by = (select auth.uid())`; `delete` revogado para `authenticated` e `anon`
   - chaves únicas com índice parcial `where not is_deleted`
   - funções RPC `security invoker`, com `search_path` fixo e `execute` revogado de `public` e `anon`
   - a `service_role` só em `supabase/tests/` e no `.env` de teste. Nunca no app
   - edite só `supabase/`. Mudança em `docs/MODELO-DADOS.md`, no core ou no app: pare e pergunte
   - mudou o esquema: rode `make db-types` e inclua o `database.types.ts` gerado no commit
5. **Durante a tarefa:**
   - `make db-migrate 2>&1 | tail -20`
   - `pnpm exec vitest run supabase/tests/<arquivo> --reporter=dot`
6. **No fim:** `make db-validate` e `make check 2>&1 | tail -40`. Tudo precisa passar.
7. **Critérios:** confira os critérios de aceite um a um.
8. **Testes:**
   - cada teste cria os próprios usuários com e-mail único (`criarUsuario`, T02-01)
   - banco lento: `make db-limpar-testes` (depois da T00-14)
   - `make db-reset` (e `pnpm test:db-reset`) pede confirmação e apaga tudo: só com a minha autorização
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste
9. **Decisões:** caso que a spec não cobre: opção mais conservadora, anotada numa seção "## T02-YY" de `docs/DECISOES-PENDENTES-ETAPA2.md`.
10. **Fechamento:**
    - commit em Conventional Commits (`feat(db): ...`)
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T02-YY)"`
    - depois o commit "docs: marca T02-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Base, escrita e tabelas

**Ordem:** T02-01 → T02-02 → T02-03 → T02-04 → T02-05 → T02-06 · **Modelo:** opus

- **T02-02:**
  - `gravar(ops)` é a única porta de escrita (D36)
  - aceita `{ entidade, acao: 'inserir' | 'alterar', id, dados }` numa transação
  - só precisa do formato das operações, não do core (A2)
- **T02-03:** as categorias de sistema não podem ser editadas nem excluídas, nem pelo banco.
- **T02-05 e T02-06** podem andar em paralelo no papel, mas ficam na mesma sessão porque o banco local é desta etapa.

## Leva 2 · Recorrências, leitura, operações em massa e segurança

**Ordem:** T02-07 → T02-08 → T02-09 → T02-10 → T02-11 · **Modelo:** opus

- **T02-08:**
  - `inicializar_usuario()` idempotente, chamada pelo app depois do login (D39)
  - as categorias iniciais vêm de `categoriasIniciais` do seed (D40)
- **T02-09:**
  - `carregar_tudo()` devolve um JSON só (D41)
  - teste de volume: 10 mil lançamentos em menos de 1 s
- **T02-10:** `gravar` aceita `alterar` em registro com `is_deleted = true` (para o Substituir e o Desfazer).
- **T02-11:**
  - a suíte de segurança cobre RLS, `delete` revogado e funções
  - o teste de reset (`pnpm test:db-reset`) só roda com a minha autorização
