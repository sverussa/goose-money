# Etapa 0 · Codebase · prompt de execução

| | |
| --- | --- |
| Tarefas | T00-01 a T00-14 (`docs/tasks/00-codebase/`) |
| Trilha | F · Fundação: raiz (`package.json`, `pnpm-workspace.yaml`, `Makefile`, configs), `.github/`, o esqueleto de `apps/app`, `packages/core` e `supabase/` |
| Estado | Concluída. A T00-14 foi feita depois, antes da etapa 5 |
| Modelo | Sonnet na maior parte. Opus em T00-08, T00-09 (Supabase e Flyway) e T00-14 |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA0.md` |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`. Na primeira execução, a etapa 0 rodou com prompts mais simples, uma tarefa por sessão.

## Como usar

Cole um dos prompts abaixo, trocando `<N>` pelo número da leva. O prompt é retomável: tarefas com ✅ são puladas, então colar de novo numa sessão nova continua de onde parou.

**Com subagentes** (padrão para levas com 3 ou mais tarefas):

```
Você é o coordenador da leva <N> de docs/tasks/prompt/00-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, com o modelo indicado na leva) com este pedido:

  Execute a tarefa <T00-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/00-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, me entregue um resumo das tarefas e das decisões pendentes.
```

**Sessão única** (leva curta, ou quando quiser acompanhar de perto):

```
Execute as tarefas da leva <N> de docs/tasks/prompt/00-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:** CLAUDE.md, a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`, o arquivo da tarefa e só as seções do PROMPT.md (2, 12) e do DECISOES.md que ela cita.
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:**
   - nenhuma regra de negócio nesta etapa
   - versões exatas, publicadas há pelo menos 7 dias (D5). O pnpm garante isso com `minimumReleaseAge`; no Cargo, confira a data de cada crate à mão (D58)
   - nunca resolva conflito no `pnpm-lock.yaml` à mão: fique com o da `main` e rode `pnpm install`
   - chaves só no `.env`, fora do Git. A `service_role` nunca no app
   - edite só os arquivos que a tarefa cria ou configura. Mudança em `docs/MODELO-DADOS.md` ou em regra de negócio: pare e pergunte
   - se faltar uma ferramenta do sistema (Docker, Rust, Xcode), pare e me diga o que instalar. Não instale ferramentas do sistema
5. **Durante a tarefa:** rode só os comandos que a própria tarefa cria ou já existem. Com saída curta, por exemplo `pnpm lint 2>&1 | tail -20`. Antes da T00-10 não há `make check`.
6. **No fim:**
   - a partir da T00-10, `make check 2>&1 | tail -40`
   - a partir da T00-06, também os testes da tarefa
   - tudo precisa passar
7. **Critérios:** confira os critérios de aceite um a um.
8. **Testes:**
   - falha intermitente: rode de novo só o que falhou
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste ou uma regra de lint
9. **Decisões:** caso que a spec não cobre: opção mais conservadora, anotada numa seção "## T00-YY" de `docs/DECISOES-PENDENTES-ETAPA0.md`.
10. **Fechamento:**
    - commit em Conventional Commits
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T00-YY)"`
    - depois o commit "docs: marca T00-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Monorepo, app e qualidade

**Ordem:** T00-01 → T00-02 → T00-03 → T00-04 → T00-05 → T00-06 · **Modelo:** sonnet

- Pode rodar em paralelo com a T01-01 (modelo de dados, `01-prompt-exec.md`, leva 1), que é só documento.
- **T00-04:** `shadcn init` com o `cn` em `@/lib/utils`. Revise o diff e desfaça pacotes que o CLI trouxer sem a tarefa pedir.
- **T00-06:** o Playwright usa `PORTA_APP` (padrão 1420) e `reuseExistingServer` só fora do CI.

## Leva 2 · Desktop, Supabase, Flyway, Makefile, CI e documentação

**Ordem:** T00-07 → T00-08 → T00-09 → T00-10 → T00-11 → T00-12 → T00-13 · **Modelo:** opus para T00-08 e T00-09; sonnet para as demais

- **T00-07:**
  - precisa do Rust e das dependências do Tauri na máquina; se faltar, pare e me diga
  - identificador `app.goosemoney` (D27)
  - CSP e permissões mínimas
- **T00-08:**
  - cadastro aberto com confirmação, senha mínima de 8 (D28)
  - redirecionamentos para as portas 1420 a 1424
- **T00-09:** Flyway em Docker. `flyway clean` desligado. Nunca use `supabase/migrations` nem o Studio para mudar o esquema.
- **T00-10:** todo alvo do Makefile só chama `pnpm`, `docker compose` ou `pnpm exec supabase`. `.env.example` com `PORTA_APP`.
- **T00-12:** o CI roda só as checagens sem banco (D29). Actions fixadas por SHA.
- **T00-13:** atualize a seção "Estrutura do repositório" do README e o CLAUDE.md.

## Leva 3 · Ambiente de testes rápido e estável (T00-14)

**Ordem:** T00-14 · **Modelo:** opus · **Formato:** sessão única
**Pré-requisito:** T02-11 e T04-09 com ✅

A tarefa nasceu na etapa 4. O banco local crescia a cada rodada (cerca de 1.300 usuários e 200 mil lançamentos), a máquina chegava a carga 14–23 e o Vite recarregava no meio dos testes.

- **Meça antes de mudar:** `explain (analyze, buffers)` das consultas de `carregar_tudo()` com o banco cheio. `lancamentos` já tinha índice por `created_by`; os índices faltavam em outras tabelas.
- Migração com o próximo número livre. Nunca edite uma migração já mergeada.
- **Script de limpeza:**
  - só roda contra `127.0.0.1` ou `localhost`
  - só apaga usuários `@teste.local` com mais de 1 hora, porque o Supabase é compartilhado entre worktrees
- Guarde os tempos de antes e depois e mostre a tabela no resumo.
- **Atualize:**
  - a tabela de comandos do CLAUDE.md
  - as "Regras de merge" de `tasks-agents-estrategies.md` (`make test-e2e-completo` antes do merge)
