# Estratégia de implementação com agentes em paralelo

Como dividir as 101 tarefas de `docs/tasks/` entre vários agentes ao mesmo tempo sem que um quebre o trabalho do outro. Complementa o índice (`README.md`), que continua sendo a fonte das dependências.

## Recomendação

**Trilhas por contexto, contrato primeiro, no máximo 4 agentes ao mesmo tempo e um coordenador.**

1. **Contrato primeiro.** O modelo de dados (T01-01) é o contrato entre o core, o banco e a interface. Ele é escrito no primeiro dia e aprovado pelo Saulo antes de qualquer trilha abrir em leque. Depois de aprovado, só muda por um PR pequeno do coordenador, mergeado antes de tudo que depende dele.
2. **Trilhas por contexto.** Cada agente fica com uma sequência de tarefas de um mesmo contexto (cartões, dívidas, banco, painel…) e com as pastas desse contexto. Duas trilhas nunca editam a mesma pasta.
3. **Uma tarefa = uma worktree = uma branch = um PR.** Nenhum agente trabalha na pasta principal do repositório.
4. **No máximo 4 agentes ao mesmo tempo.** O limite não é a máquina, é a revisão: cada PR precisa ser lido antes do merge. Mais agentes que isso enchem a fila de PRs sem acelerar o merge.
5. **O banco é o gargalo.** Mesmo com os ajustes abaixo, o caminho crítico passa pela trilha do banco (T02-01 a T02-09), que é sequencial e usa o Supabase local com exclusividade. Ela começa assim que a fundação permitir e fica com o agente mais forte.

## Ajustes aplicados nas tarefas

Aplicados em 05/11/2026 e registrados como D56 em `docs/DECISOES.md`. Eles encurtam o caminho crítico e evitam que um agente teste o código de outro.

| # | Ajuste | Por quê |
| --- | --- | --- |
| A1 | T01-01 sem dependência (antes dependia de T00-13) | É um documento. Escrito no primeiro dia, libera o core e o banco 9 ondas antes |
| A2 | T02-02 depende de T02-01 e T01-01 (antes dependia de T01-22) | A função `gravar(ops)` só precisa do formato das operações, descrito em T02-02; T01-22 passa a produzir mudanças nessa mesma forma. Com isso o banco não espera o core terminar |
| A3 | Porta do app configurável: `PORTA_APP` (padrão 1420) em T00-03, T00-06, T00-08 (redirects de 1420 a 1424) e T00-10 | Duas worktrees não sobem o Vite na mesma porta. Pior: o Playwright usa `reuseExistingServer` e testaria, sem avisar, o servidor de **outra** worktree |
| A4 | Textos por funcionalidade: `src/features/<funcionalidade>/mensagens.ts`, com só os textos comuns em `src/app/mensagens.ts` (revê D10) | Um arquivo único de textos seria editado por todas as telas ao mesmo tempo |
| A5 | O ✅ do índice e o registro de decisões novas em `DECISOES.md` são feitos só pelo coordenador, no merge | Os dois arquivos seriam editados em todo PR e gerariam conflito em quase todos |

Com A1 e A2, o caminho crítico caiu de 32 para 26 ondas (uma onda = tarefas cujas dependências já estão todas prontas):

```
T00-01 → 02 → 03 → 04 → 05 → 06 → 10 → 11 → T02-01 → 02 → 03 → 04 → 05 → 07 → 09
       → T03-02 → 03 → 04 → T04-06 → T05-02 → 04 → 05 → T06-01 → 02 → 04 → 07
```

## Papéis

**Coordenador** (a sessão principal do Claude Code, ou o próprio Saulo):

- escolhe as tarefas prontas (dependências mergeadas) e dispara um agente por tarefa, com o modelo de pedido abaixo
- revisa e faz o merge **na ordem das dependências**
- é o único que edita `docs/tasks/README.md` (status), `docs/DECISOES.md` (decisões novas vindas dos PRs) e o contrato (T01-01) depois de aprovado
- é o único que roda `make db-reset` no Supabase local compartilhado
- responde as dúvidas A/B/C que os agentes levantarem

**Agente de trilha:**

- trabalha só na sua worktree e só nas pastas da sua trilha
- faz uma tarefa por vez; termina com `make check` passando e abre o PR
- não edita os arquivos do coordenador; decisão nova vai na descrição do PR, como seção "Decisões" com A/B/C
- se a tarefa exigir mexer fora das suas pastas (uma migração, um componente base, o contrato), para e pede ao coordenador em vez de fazer

## Trilhas e pastas

| Trilha | Tarefas | Pastas que só ela edita |
| --- | --- | --- |
| **F · Fundação** | T00-01 a T00-14 (T00-14 também mexe em `supabase/` e roda sozinha, antes da etapa 5) | raiz (`package.json`, `pnpm-workspace.yaml`, `Makefile`, configs), `.github/` |
| **C · Core** | T01-02 a T01-22 | `packages/core/src/<contexto>/` (uma pasta por contexto: `dinheiro`, `datas`, `periodos`, `contas`, `cartoes`, `dividas`, `recorrencias`, `motor`, `seed`, `backup`, `comandos`) |
| **B · Banco** | T02-01 a T02-11, T06-05, T06-06 | `supabase/` |
| **D · Dados no app** | T03-01 a T03-08 | `apps/app/src/data/`, `src/queries/`, `src/plataforma/`, `src-tauri/` |
| **U · Interface base** | T04-01 a T04-09 | `apps/app/src/app/` (tema, casca, rotas), `src/components/` |
| **T · Telas** | T05-01 a T05-30 | `apps/app/src/features/<funcionalidade>/` e `apps/app/tests/e2e/<funcionalidade>/` |
| **Q · Qualidade** | T06-01 a T06-04, T06-07 | transversal: só depois que as telas param |

`packages/core/src/index.ts` é compartilhado pela trilha C: cada tarefa só **acrescenta** a linha de exportação do seu contexto, o que mantém os conflitos triviais.

## Fases

Cada fase lista o que roda ao mesmo tempo. Algumas tarefas dependem de outra do mesmo período feita por outro agente (por exemplo, T01-13 espera T01-07, e T03-04 espera T01-22). Regra geral: antes de começar uma tarefa, o agente confere se todas as dependências já estão na `main`. Se não estiverem, pula para a próxima da sua lista e volta depois. Um agente que termina a sua sequência pega a próxima tarefa pronta da sua trilha; se não houver, pega uma de outra trilha que não esteja ocupada.

### Fase 0 · Contrato e esqueleto (2 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · F | T00-01 → T00-02 → T00-03 |
| 2 · C | T01-01 (documento do modelo de dados) |

**Portão:** o Saulo aprova `docs/MODELO-DADOS.md`. Sem isso nenhuma tarefa de T01-05, T02-03 ou posterior começa.

### Fase 1 · Fundação e domínio inicial (3 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · F | T00-04 → T00-05 → T00-06 → T00-10 → T00-11 → T00-12 → T00-13 |
| 2 · F/B | T00-08 → T00-09 → T00-07 → T03-07 (arquivos, depende só do Tauri) |
| 3 · C | T01-02 → T01-03 → T01-04 → T01-05 → T01-11 → T01-12 |

A fundação mexe em arquivos da raiz nas duas sequências. Conflitos em `package.json` e `pnpm-lock.yaml` se resolvem como descrito em "Regras de merge".

### Fase 2 · Domínio em leque, banco e tema (4 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · B | T02-01 → T02-02 → T02-03 → T02-04 → T02-05 → T02-06 → T02-07 → T02-08 → T02-09 |
| 2 · C · Cartões | T01-07 → T01-08 → T01-09 → T01-10 |
| 3 · C · Contas e recorrências | T01-06 → T01-13 → T01-20 |
| 4 · U | T04-01 → T04-02 → T04-03 → T04-04 |

T02-05 e T02-06 podem andar em paralelo, mas ficam com o mesmo agente porque a trilha B é dona do Supabase local (ver "Ambiente compartilhado").

### Fase 3 · Motor e ponte com o app (4 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · B | T02-10 → T02-11 |
| 2 · C · Motor | T01-14 → T01-15 → T01-16 → T01-17 → T01-18 → T01-19 |
| 3 · C · Comandos | T01-22 → T01-21 |
| 4 · D | T03-01 → T03-02 → T03-03 → T03-04 → T03-05 → T03-06 → T03-08 |

T01-14 a T01-19 ficam num agente só: é a parte em que os contextos convergem e cada tarefa usa o resultado da anterior.

### Fase 4 · Casca e acesso (3 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · U | T04-05 → T04-07 → T04-08 → T04-09 → T04-06 |
| 2 · T · Acesso | T05-01 → T05-30 |
| 3 · B | T06-05 (produção; precisa do provedor da VPS e do domínio, ainda em aberto) → T06-06 |

T04-05 já cria todas as rotas com páginas provisórias. Por isso, na fase 5, cada tela só substitui a sua página e não edita o arquivo de rotas.

### Fase 5 · Telas em leque (4 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · Lançar e Lançamentos | T05-02 → T05-03 → T05-04 → T05-05 → T05-06 → T05-07 |
| 2 · Contas e Cartões | T05-08 → T05-09 → T05-11 → T05-12 → T05-13 → T05-14 → T05-15 → T05-10 |
| 3 · Painel | T05-16 → T05-18 → T05-19 → T05-20 → T05-21 → T05-17 |
| 4 · Dívidas, Recorrências e Configurações | T05-22 → T05-23 → T05-24 → T05-25 → T05-26 → T05-27 → T05-28 → T05-29 |

A ordem dentro de cada agente já deixa para o fim as tarefas que esperam outro agente: T05-10 espera T05-03 e T05-17 espera T05-06, ambas do agente 1.

### Fase 6 · Qualidade e entrega (até 3 agentes)

| Agente | Sequência |
| --- | --- |
| 1 · Q | T06-01 → T06-02 |
| 2 · Q | T06-03 |
| 3 · Q | T06-04 (depois de T06-02 e T06-05) → T06-07 (aceite final, sozinho, com tudo mergeado) |

## Ambiente compartilhado

As worktrees separam o código, mas Docker, portas e o banco local são da máquina. É aqui que agentes em paralelo mais se atrapalham.

| Recurso | Regra |
| --- | --- |
| **Supabase local** (portas 54321 a 54324) | Até o fim da fase 2, só a trilha B usa. Migrações de uma branch aplicadas no banco de todos quebrariam o Flyway das outras (versões e checksums diferentes). Da fase 3 em diante, o esquema está estável: uma instância única, com as migrações da `main`, usada por todos. Cada teste cria usuários com e-mail único (T02-01), então os testes não se enxergam |
| **Migração nova fora da trilha B** | Não. O agente pede ao coordenador, que abre uma tarefa da trilha B |
| **`make db-reset`** | Só o coordenador, avisando antes, porque derruba os testes que estiverem rodando |
| **Porta do app** | Cada worktree usa a sua `PORTA_APP`, de 1421 a 1424 (ajuste A3). A 1420 fica para quem estiver rodando o Tauri. O Supabase local só aceita redirecionamento de login para essas portas |
| **Playwright** | Sempre com a porta da própria worktree. Nunca confiar em `reuseExistingServer` sem a porta própria |
| **Tauri** (`make dev-desktop`) | Um agente por vez; o build do Rust é pesado e a porta 1420 é fixa |

## Regras de merge

- **Ordem:** o coordenador só mergeia uma tarefa depois de todas as dependências dela. Na dúvida, a mais antiga da fila primeiro.
- **Antes do PR:** `git rebase main`, depois `make check` (formatação, lint, tipos, testes). Na trilha B e nas telas, também os testes de banco e o Playwright da tarefa.
- **`pnpm-lock.yaml`:** nunca resolver o conflito à mão. Fica a versão da `main` e roda `pnpm install`, que regenera o lockfile com as dependências das duas branches.
- **Tipos gerados do banco:** no conflito, roda `make db-types` de novo depois do rebase.
- **Migrações Flyway:** os números V001 a V010 já estão reservados nas tarefas. Migração fora do plano pega o próximo número livre na hora do PR. Migração `V` mergeada nunca é editada. Nos repetíveis (`R__gravar.sql`, lista de tabelas), o conflito é textual: fica a união das duas listas.
- **Contrato (T01-01 e os tipos de T01-05):** mudança depois da aprovação é um PR separado, do coordenador, mergeado antes do PR que precisou dela.
- **CI vermelho na `main`:** ninguém mergeia até corrigir. A correção vem antes de qualquer outro PR.

## Modelo de pedido para um agente

```
Execute a tarefa docs/tasks/<etapa>/<arquivo>.md.

- Siga CLAUDE.md, docs/tasks/tasks-agents-estrategies.md e as referências da tarefa.
- Trabalhe numa worktree própria, na branch do cabeçalho da tarefa, a partir da main.
- Edite só as pastas da trilha <trilha>. Se precisar mexer em outra pasta, numa
  migração ou no modelo de dados, pare e me pergunte.
- Use PORTA_APP=<porta> para o app e o Playwright.
- Não edite docs/tasks/README.md nem docs/DECISOES.md. Dúvida não coberta pela
  spec vai na descrição do PR, como seção "Decisões" com as opções A, B e C.
- Termine com `make check` passando, os critérios de aceite marcados na
  descrição do PR e o PR aberto. Não faça merge.
```

No Claude Code, cada agente pode ser uma sessão própria com worktree (uma linha na barra lateral, que dá para abrir e acompanhar) ou um subagente com `isolation: "worktree"` disparado pelo coordenador. Sessões próprias são melhores para tarefas longas, como as telas, porque dá para conversar com cada uma. Subagentes servem para tarefas curtas do core.

## Quando não paralelizar

- **Fase 0 e o fim da fundação** (T00-10 a T00-13): mexem em configuração que todo o resto usa. Um agente só.
- **Motor** (T01-14 a T01-19) e **aceite final** (T06-07): cada passo usa o resultado do anterior.
- **Correção de bug que atravessa trilhas:** um agente só, mesmo que demore mais. Dividir uma correção entre trilhas é a forma mais rápida de gerar dois bugs.
