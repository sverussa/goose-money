# Etapa 3 · Dados no app · prompt de execução

| | |
| --- | --- |
| Tarefas | T03-01 a T03-08 (`docs/tasks/03-dados-app/`) |
| Trilha | D · Dados no app: `apps/app/src/data/`, `src/queries/`, `src/plataforma/`, `src-tauri/`, `apps/app/tests/db/` |
| Estado | Concluída |
| Modelo | Opus |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA3.md` |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`.

## Como usar

Cole um dos prompts abaixo, com `<N>` = 1. O prompt é retomável: tarefas com ✅ são puladas.

**Com subagentes:**

```
Você é o coordenador da leva <N> de docs/tasks/prompt/03-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, modelo opus) com este pedido:

  Execute a tarefa <T03-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/03-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40` na main e me entregue um resumo das tarefas e das decisões pendentes.
```

**Sessão única:**

```
Execute as tarefas da leva <N> de docs/tasks/prompt/03-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md
   - `docs/MODELO-DADOS.md`
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa
   - só as seções do PROMPT.md e do DECISOES.md que ela cita
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:**
   - o mapeamento `snake_case` ↔ `camelCase` existe só em `src/data`
   - toda leitura do banco passa pela validação Zod do core (D42)
   - toda escrita vai por `gravar(ops)` com as mudanças dos comandos do core (D36). Nenhuma regra de negócio no app
   - leitura com `carregar_tudo()`; o Motor roda no app sobre os fatos (T03-03)
   - Auth com PKCE. A `service_role` nunca no app
   - edite só as pastas da trilha D. Mudança no core, no banco ou no modelo de dados: pare e pergunte
5. **Tauri** (T03-07, T03-08):
   - crates com pelo menos 7 dias, conferidos à mão (D58)
   - permissões e CSP mínimas em `src-tauri/capabilities/` e `tauri.conf.json`
   - uma sessão por vez com `make dev-desktop`, porque a porta 1420 é fixa
   - se faltar o Rust, pare e me diga
6. **Durante a tarefa,** rode só o que mudou, com saída curta:
   - `pnpm exec vitest run <arquivo> --reporter=dot`
   - `pnpm --filter @goose-money/app exec playwright test <spec> --project chromium --reporter=line`
   - `pnpm --filter @goose-money/app typecheck` e `pnpm exec eslint <arquivos alterados>`
7. **No fim,** uma vez e um depois do outro: `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
8. **Critérios:** confira os critérios de aceite um a um.
9. **Testes:**
   - os testes de `src/data` contra o banco ficam em `apps/app/tests/db/` e usam os utilitários de `supabase/tests/apoio.ts`
   - falha intermitente: rode de novo só o que falhou (`--last-failed`)
   - banco lento: `make db-limpar-testes`, nunca `make db-reset` sem perguntar
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste
10. **Decisões:** caso que a spec não cobre: opção mais conservadora, anotada numa seção "## T03-YY" de `docs/DECISOES-PENDENTES-ETAPA3.md`.
11. **Fechamento:**
    - commit em Conventional Commits (`feat(app): ...`)
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T03-YY)"`
    - depois o commit "docs: marca T03-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Sessão, leitura, escrita e plataforma

**Ordem:** T03-01 → T03-02 → T03-03 → T03-04 → T03-05 → T03-06 → T03-07 → T03-08 · **Modelo:** opus

- **T03-01:**
  - depois do login e da confirmação do cadastro, o app chama `inicializar_usuario()` antes de carregar (D39)
  - "Sair" limpa a sessão e o cache
- **T03-03:** o "hoje" vem de um só lugar, para os testes poderem fixar 04/11/2026.
- **T03-04:**
  - toda mutação mostra "Salvando…"
  - o Desfazer grava as inversas do comando (T01-22)
  - sem conexão, nada é gravado pela metade
- **T03-07:**
  - depende só da T00-07 e pode ser adiantada
  - salvar e abrir arquivos funciona no navegador e no Tauri
- **T03-08:**
  - deep link `goosemoney://` no Tauri e `#/...` no navegador
  - redefinição de senha com `exchangeCodeForSession`
  - os redirecionamentos aceitos são os de T00-08
