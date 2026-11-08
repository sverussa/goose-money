# Prompts, subagentes e estratégias de execução

O que aprendemos escrevendo os prompts que executaram as etapas 2 a 6 do Goose Money. A skill `prompts-de-execucao` (`.claude/skills/prompts-de-execucao/`) aplica estas regras para gerar o prompt de uma nova leva de tarefas. Este arquivo explica o porquê de cada regra; a skill traz o passo a passo e os modelos.

## 1. Antes de escrever o prompt: olhar o estado real

O prompt bom nasce do repositório como ele está agora, não do plano.

| Conferir | Por quê | Como |
| --- | --- | --- |
| Branch atual e arquivos sem commit | Duas vezes havia uma tarefa em andamento na mesma pasta (T03-08, T05-17). Um prompt colado ali mistura duas tarefas | `git status --short`, `git branch --show-current` |
| ✅ no índice | Mostra o que já terminou e se as dependências da leva estão na `main` | `grep` nas linhas da etapa em `docs/tasks/README.md` |
| Dependências de cada tarefa | Define a ordem. A tarefa que espera outra do mesmo lote vai para o fim (T05-17, T05-10) | Coluna "Depende de" do índice |
| Funções que a tarefa cita | As tarefas citam funções do core e de `src/data` que às vezes não existem (`conclusaoReceitasDespesas`, causa do patrimônio negativo, `cadastrar`, `apagar_tudo`). Sem uma exceção no prompt, o agente para no meio | `grep -rn "export function <nome>"` em `packages/core/src` e `apps/app/src/data` |
| Remoto Git | O repositório não tem remoto. Não há PR: o merge é local, e o que depende de GitHub (CI, Release) precisa do Saulo | `git remote -v` |
| Pontos que exigem uma pessoa | Contas, chaves, VPS, domínio, testes em outro sistema operacional | Ler o escopo da tarefa procurando produção, conta, segredo e plataforma |

**Diagnóstico de outra sessão é hipótese, não fato.** O relatório da etapa 4 dizia que `lancamentos` não tinha índice por `created_by`, mas tinha (`lancamentos_por_data`). Faltavam índices em outras tabelas. Por isso a T00-14 manda medir antes de corrigir.

## 2. Estrutura de um prompt de execução

Todo prompt de execução tem as mesmas partes, nesta ordem:

1. **Escopo e ordem:** quais tarefas, em que ordem e por quê.
2. **Pré-condições que fazem parar:**
   - pasta limpa
   - branch `main`
   - dependências com ✅
3. **Retomada:** pular as tarefas que já têm ✅. Assim o mesmo prompt serve para continuar numa sessão nova.
4. **Leitura mínima:**
   - CLAUDE.md
   - a tarefa
   - o design citado
   - a linha da tarefa no DESIGN-HANDOFF
   - só as seções do PROMPT.md que ela cita (o PROMPT inteiro tem cerca de 19 mil tokens)
5. **Padrão a copiar:** a tela ou o módulo parecido que já está pronto (Contas para Cartões, Rendas para Gastos fixos). Isso evita reinventar e acelera.
6. **Regras do projeto** que a tarefa toca: tema, valores do core, mutações com Desfazer, textos em `mensagens.ts` e pastas da trilha.
7. **Exceções explícitas:** o que pode ser editado fora da trilha, nomeado arquivo por arquivo. Todo o resto faz parar e perguntar.
8. **Ligações entre tarefas:** quem liga o quê. Uma tarefa deixa um ponto de ligação, sem diálogo provisório, e a seguinte liga.
9. **Testes:** o que rodar durante a tarefa e o que rodar no fim (seção 3).
10. **Erros conhecidos:** shadcn e expectativas de teste (seção 4).
11. **Decisões:** spec acima do design, opção mais conservadora e anotação em `docs/DECISOES-PENDENTES-ETAPA<n>.md`.
12. **Fechamento:**
    - commit em Conventional Commits
    - `git merge --no-ff` com a mensagem padrão
    - commit do ✅
    - sem push
13. **Entrega:** checagem final na `main` e resumo das decisões pendentes.

## 3. Testes: o maior custo de tempo

Na etapa 4, o que mais demorou foi rodar e repetir testes, não escrever código: `make check` leva de 1 a 2 minutos, `make test-e2e` de 1,3 a 3 minutos, e quase toda tarefa precisou de várias rodadas.

- **Durante a tarefa, só o que mudou:**
  - `pnpm exec vitest run <arquivo> --reporter=dot`
  - Playwright da pasta da funcionalidade, só no Chromium, com `--reporter=line`
  - `typecheck` do pacote e `eslint` só nos arquivos alterados
- **No fim, uma vez e um depois do outro:** `make check` e depois `make test-e2e-completo` (Chromium e WebKit). Rodados ao mesmo tempo, os dois disputam a CPU e geram falsos negativos.
- **Saída curta:** `2>&1 | tail -40`. O log completo só entra no contexto quando algo falha.
- **Falha intermitente:** rodar de novo só o teste que falhou (`--last-failed`). Se ele passa sozinho e falha no conjunto, é o ambiente: anotar e seguir, sem afrouxar o teste.
- **Limite de 3 tentativas:** se a mesma falha continua depois de 3 correções, parar e mostrar a saída. Isso evita gastar dezenas de rodadas num diagnóstico errado (as setas ← → levaram três tentativas até a causa certa).
- **Banco:**
  - `make db-limpar-testes` quando ficar lento
  - `make db-reset` nunca sem perguntar: ele pede confirmação e apaga tudo
- **Nunca** pular, enfraquecer ou apagar um teste, nem desligar uma regra do axe, para ficar verde.

O ambiente foi corrigido na T00-14: índices por dono, limpeza dos usuários de teste com mais de 1 hora, 2 workers e só o Chromium no dia a dia, testes de tempo isolados e `optimizeDeps` no Vite. Se a lentidão voltar, a primeira suspeita é o ambiente, não o código.

## 4. Erros que se repetiram

**Ao escrever testes:**

- O "R$" usa espaço não separável. O valor esperado sai da função de formatação, nunca escrito à mão.
- Datas calculadas de cabeça erram (28/01 no lugar de 27/01). Use as funções de datas do core.
- Use seletores por papel e nome acessível (`getByRole`). Evite regex sensível a maiúsculas e seletor que pega dois elementos.

**Com o CLI do shadcn:**

- Ele trocou o import do `cn`, trouxe `next-themes` e rebaixou o `recharts`.
- Depois de cada `shadcn add`: revisar o diff e desfazer pacote novo, versão rebaixada e import trocado. O `cn` vem de `@/lib/utils`.

**Bugs reais que os testes acharam** (valeram o tempo): o `tailwind-merge` descartando uma classe de tipografia, a navegação do React Router que não enfileira e o foco disputado entre dois diálogos. O prompt não deve evitar esses achados, só as rodadas desperdiçadas.

## 5. Contexto e custo

| Estratégia | Quando usar | Efeito |
| --- | --- | --- |
| **Coordenador e um subagente por tarefa** | Leva de 3 ou mais tarefas sem interação com o Saulo | Cada tarefa começa com o contexto limpo. A sessão principal só guarda resumos. É o padrão a partir da etapa 5 |
| Sessão nova por tarefa | Quando prefere controlar à mão | Mesmo efeito, colando o mesmo prompt retomável a cada vez |
| Sessão única, sem subagentes | Tarefas com ida e volta com o Saulo (produção, decisões) ou uma tarefa só | Mantém a conversa; o contexto cresce |

Regras do formato coordenador:

- O coordenador não implementa. Antes de cada tarefa confere a pré-condição, e depois confere o merge e o ✅ no git. Ele repassa as perguntas dos subagentes em vez de decidir por eles.
- O subagente recebe o pedido completo, porque começa sem nada da conversa. Ele responde em até 15 linhas, sem diffs nem logs.
- **Modelos:**
  - coordenador no Sonnet (só confere o git e repassa resumos);
  - subagentes no Opus para regras de domínio, banco, segurança, autenticação e telas com regras;
  - Sonnet para configuração, componentes simples e trabalho mecânico.
- Subagente não compensa para tarefas pequenas: cada um começa do zero e relê o CLAUDE.md.

## 6. Paralelismo

- **Paralelismo economiza tempo, não tokens.** Quatro agentes gastam mais ou menos quatro vezes mais, e conflitos geram retrabalho.
- **Só em paralelo quando tudo isto for verdade:**
  - as pastas são diferentes
  - nenhuma tarefa precisa do resultado da outra
  - cada sessão tem a sua worktree e a sua `PORTA_APP` (1421 a 1424)
- O Supabase local é um só. Com migrações diferentes em duas branches, o Flyway quebra. A limpeza de testes respeita o limite de 1 hora para não apagar os usuários de outra rodada.
- Os merges vão para a mesma `main` local. Sequencial é mais barato e não gera conflito; foi o padrão adotado.
- Um bom caso de paralelo foi produção (T06-05), que anda no tempo do Saulo, junto com qualidade (T06-01 a T06-03).

## 7. Produção e ações de uma pessoa

- O agente não cria contas, não digita senhas e não lê nem escreve chaves. Contas, SMTP, VPS, domínio e `.env.producao` ficam com o Saulo; o agente cria só o `.example`, com os nomes das variáveis.
- O agente nunca roda comandos contra produção. Ele prepara o comando, testa localmente o que der e diz o que rodar; o Saulo roda e cola a saída para o agente conferir.
- Push e tags ficam com o Saulo.
- Critério que depende de uma pessoa fica como "aguardando o Saulo", e o ✅ só entra quando todos os critérios estiverem conferidos.

## 8. Contradições e pontos em aberto

O prompt aponta as contradições em vez de deixar o agente descobrir no meio:

- O critério da T06-07, "passa no CI", contra a D29 (o CI não sobe banco).
- Itens em "Em aberto" no DECISOES.md que travam uma tarefa (VPS e domínio para a T06-05).
- Uma tarefa que manda o core gerar frases, contra o padrão `previaDoCadastro` (core devolve dados, a frase fica em `mensagens.ts`).

## 9. Revisar o que a leva entregou

Ao preparar a próxima leva, confira a anterior:

- arquivos editados fora da trilha (a T05-17 mexeu em `src/components/`)
- arquivos temporários esquecidos (`zz-visual.spec.ts`)
- reexportes provisórios a limpar (`LoginProvisorio` reexportando a `LoginPagina`)
- decisões pendentes acumuladas: aprovar e levar para o `DECISOES.md` no fim de cada etapa

## 10. Tamanho da leva

- De 5 a 8 tarefas por prompt. Mais que isso, a sessão é resumida no meio, e o prompt retomável segura isso, mas o resumo do coordenador perde detalhes.
- Uma leva por bloco coerente: um módulo, ou uma etapa curta.
- A última leva de uma etapa termina com a checagem completa na `main` e com a lista de decisões pendentes da etapa.
