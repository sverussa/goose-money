# Etapa 4 · Tema e casca · prompt de execução

| | |
| --- | --- |
| Tarefas | T04-01 a T04-09 (`docs/tasks/04-tema-casca/`) |
| Trilha | U · Interface base: `apps/app/src/app/` (tema, casca, rotas) e `src/components/` |
| Estado | Concluída |
| Modelo | Sonnet na leva 1, Opus na leva 2 |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA4.md` |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`.

Na primeira execução, a etapa rodou numa sessão única com as 9 tarefas, rodando `make check` e o e2e completo várias vezes por tarefa. A demora disso gerou a T00-14 e as regras de teste enxuto abaixo.

## Como usar

Cole um dos prompts abaixo, trocando `<N>` pelo número da leva. O prompt é retomável: tarefas com ✅ são puladas.

**Com subagentes:**

```
Você é o coordenador da leva <N> de docs/tasks/prompt/04-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, com o modelo indicado na leva) com este pedido:

  Execute a tarefa <T04-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/04-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, me entregue um resumo das tarefas e das decisões pendentes.
```

**Sessão única:**

```
Execute as tarefas da leva <N> de docs/tasks/prompt/04-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md
   - `docs/DESIGN-HANDOFF.md`
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa e os arquivos de `design/telas/` que ela cita
   - `design/theme-tokens.ts`
   - só as seções do PROMPT.md (4, 5) e do DECISOES.md que ela cita
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:**
   - React + shadcn/ui + Tailwind. Não copie o markup dos `.dc.html`
   - cores, tamanhos e raios só pelas variáveis do tema (`src/app/tema.css`, a partir de `design/theme-tokens.ts`). Nada de hex nem valor arbitrário nos componentes
   - nenhum valor em dinheiro fixo e nenhum indicador calculado em componente. Tudo vem do core pelas consultas de `src/queries`
   - textos em pt-BR, com o nome Goose Money. Os comuns ficam em `src/app/mensagens.ts`
   - edite só `apps/app/src/app/` e `src/components/`. Mudança no core, em `src/data`, `src/queries` ou no banco: pare e pergunte
5. **shadcn:**
   - depois de `shadcn add`, revise o diff. O `cn` vem de `@/lib/utils`
   - desfaça pacote novo (como `next-themes`), versão rebaixada (como a do `recharts`) e import trocado
   - o `cn` com `tailwind-merge` precisa conhecer as classes de tipografia do tema, senão descarta `text-label-md` ao lado de uma cor
6. **Durante a tarefa,** rode só o que mudou, com saída curta:
   - `pnpm exec vitest run <arquivo> --reporter=dot`
   - `pnpm --filter @goose-money/app exec playwright test <spec> --project chromium --reporter=line`
   - `pnpm --filter @goose-money/app typecheck` e `pnpm exec eslint <arquivos alterados>`
7. **No fim,** uma vez e um depois do outro: `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
8. **Critérios:** confira os critérios de aceite um a um e compare com o design no navegador, nos dois temas.
9. **Testes:**
   - valores e datas esperados saem das funções de formatação e de datas, nunca escritos à mão. O "R$" tem espaço não separável
   - seletores por papel e nome acessível (`getByRole`), sem regex sensível a maiúsculas nem seletor que pegue dois elementos
   - axe em cada componente com tela de teste
   - falha intermitente: rode de novo só o que falhou (`--last-failed`)
   - banco lento: `make db-limpar-testes`, nunca `make db-reset` sem perguntar
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste
10. **Decisões:** divergência entre design e spec: siga a spec. Caso que a spec não cobre: opção mais conservadora, anotada numa seção "## T04-YY" de `docs/DECISOES-PENDENTES-ETAPA4.md`.
11. **Fechamento:**
    - commit em Conventional Commits (`feat(app): ...`)
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T04-YY)"`
    - depois o commit "docs: marca T04-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Tema e componentes base

**Ordem:** T04-01 → T04-02 → T04-03 → T04-04 · **Modelo:** sonnet

- Pode rodar junto com a etapa 2 (banco), porque as pastas são diferentes.
- **T04-02:**
  - o tema escuro é gerado em tempo de execução com `@material/material-color-utilities` (D43)
  - o tema claro fica estático
- **T04-03:**
  - é a maior da leva: uns 15 componentes no visual Material 3
  - um componente por commit ajuda a revisar
- **T04-04:**
  - o `MoneyText` respeita o olho de ocultar valores
  - o `StatusChip` nunca usa só a cor como sinal

## Leva 2 · Casca, cabeçalho, gráficos, atalhos e Barra

**Ordem:** T04-05 → T04-07 → T04-08 → T04-09 → T04-06 · **Modelo:** opus

- **T04-05:** crie todas as rotas com páginas provisórias em `src/features/<funcionalidade>/<Nome>Pagina.tsx`. Assim, na etapa 5, cada tela só troca a sua página e não edita o arquivo de rotas.
- **T04-07:**
  - as setas ← → mudam o mês a cada toque
  - a navegação do React Router é uma transição, e o `setSearchParams` não enfileira. Use a forma funcional a partir da URL atual
- **T04-08:**
  - `ChartCard` com título-conclusão e "Ver itens"
  - gráficos com resumo textual em `aria-label`
- **T04-09:** ao escolher "Lançar" na busca, feche a busca antes de abrir o formulário. Senão os dois diálogos disputam o foco.
- **T04-06:**
  - o tooltip do Radix precisa reabrir no próximo indicador depois de um clique
  - o olho de privacidade fica na top app bar no celular (D44)
