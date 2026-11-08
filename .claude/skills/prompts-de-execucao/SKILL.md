---
name: prompts-de-execucao
description: Gera o prompt para executar uma leva de tarefas de docs/tasks/ do Goose Money (ex.: "faça o prompt da T05 21-25", "prompt para executar a etapa 6", "prompt para a tarefa T00-14"). Confere o estado do repositório, as dependências e as funções que as tarefas citam, escolhe o formato (coordenador com subagentes, sessão única ou produção com o Saulo) e devolve um prompt retomável, com testes enxutos e pontos de parada. Use sempre que pedirem um prompt, pedido ou instrução para outra sessão ou agente executar tarefas do plano.
---

# Prompts de execução

Gera o prompt que outra sessão vai colar para executar tarefas de `docs/tasks/`. O porquê de cada regra está em `docs/Prompts-SubAgents-Strategies-Skill.md`; os modelos estão em `modelos.md`, nesta pasta.

O resultado é texto em pt-BR para o Saulo colar. **Não execute as tarefas** nem altere o repositório, a não ser que ele peça.

## 1. Levantar o estado (barato, numa ou duas chamadas)

```bash
git status --short | head; git branch --show-current; git log --oneline -3; git remote -v
grep -nE "^\| (✅ )?\[T0X-" docs/tasks/README.md | sed -E 's/\]\(.*\) \|/ |/'
```

Para cada tarefa da leva, leia só o cabeçalho, as referências, o escopo e os critérios:

```bash
sed -n '/^| [0-9]/p;/^\*\*Refer/p;/^## Escopo/,/^## Fora/p;/^## Critérios/,$p' docs/tasks/<etapa>/T0X-YY-*.md
```

Anote:

- **Pasta suja ou outra branch:** uma tarefa está em andamento. Diga ao Saulo, nomeando a branch e os arquivos, e mantenha no prompt a pré-condição de pasta limpa.
- **Dependências sem ✅:** a leva não pode começar, ou a ordem precisa mudar.
- **Funções, RPCs e arquivos que o escopo cita:** confira se existem com `grep -rn "export function <nome>\|export const <nome>"` em `packages/core/src` e `apps/app/src/data`. O que faltar vira uma **exceção explícita** no prompt (passo 3).
- **Necessidade de uma pessoa:** produção, contas, chaves, domínio, outro sistema operacional ou GitHub (sem remoto) mudam o formato (passo 2).
- **Itens em "Em aberto"** no `docs/DECISOES.md` que travam alguma tarefa.
- **Contradições** entre um critério e uma decisão (ex.: "passa no CI" contra a D29).
- **Problemas da leva anterior:** arquivos fora da trilha, arquivos temporários (`zz-*.spec.ts`) e reexportes provisórios. Mencione na resposta.

Não confie em diagnóstico de outra sessão sem conferir no código.

## 2. Escolher o formato

| Situação | Formato | Modelo |
| --- | --- | --- |
| 3 ou mais tarefas, sem interação com o Saulo | Coordenador com um subagente por tarefa | `modelos.md` › A |
| 1 ou 2 tarefas, ou tarefas curtas e muito ligadas | Sessão única, retomável | `modelos.md` › B |
| Produção, contas, chaves, deploy, release | Sessão única com o Saulo, que roda os comandos de produção | `modelos.md` › C |
| Aceite ou fechamento de etapa | Sessão única, com checagem completa e consolidação das decisões | `modelos.md` › D |

**Ordem:** respeite as dependências. Coloque no fim a tarefa que depende de outra do mesmo lote. Na dúvida, use a ordem da fase em `docs/tasks/tasks-agents-estrategies.md`.

**Tamanho:** de 5 a 8 tarefas por prompt. Mais que isso, proponha dividir em duas levas.

## 3. Preencher o modelo

Copie o modelo escolhido e preencha:

- **Tarefas e ordem**, com o motivo da ordem quando não for a numérica.
- **Padrão a copiar:** a funcionalidade pronta mais parecida (`ls apps/app/src/features/`).
- **Pastas da trilha:** `features/<funcionalidade>` e `tests/e2e/<funcionalidade>` para telas. Para as outras trilhas, veja a tabela em `tasks-agents-estrategies.md`.
- **Exceções:** só as que o passo 1 mostrou serem necessárias, cada uma com o arquivo, o que criar e como testar. Se o escopo pedir frases no core, o core devolve dados e a frase fica em `mensagens.ts`. Mudança no core vai em commit próprio, mantendo a cobertura de 90%.
- **Ligações:** qual tarefa deixa um ponto de ligação e qual liga. Nunca diálogos provisórios.
- **Telas sem design:** qual padrão seguir (veja o DESIGN-HANDOFF 7).
- **Critérios com valores exatos:** cite as seções de 11.x que a leva cobre e os casos do seed que precisam bater.
- **Arquivo de decisões:** `docs/DECISOES-PENDENTES-ETAPA<n>.md` da etapa.
- **Comandos:** confira no `Makefile` se os alvos citados existem (`make help`). Ex.: `test-e2e-completo` e `db-limpar-testes` vêm da T00-14.

Remova do modelo o que não se aplica, como regras de tela numa tarefa de banco ou shadcn onde não há componente.

## 4. Responder

Escreva em pt-BR, nesta ordem:

1. Uma ou duas frases sobre o estado: o que já está na `main` e o que bloqueia, se houver.
2. O que mudou em relação ao modelo e por quê: exceções, ordem, formato. São no máximo 4 itens curtos.
3. O prompt num bloco de código só, pronto para colar.
4. Dicas de execução, só as que valem para esta leva:
   - **modelo:** coordenador no Sonnet; subagentes no Opus para domínio, banco, segurança e autenticação; Sonnet para configuração e telas simples
   - **paralelismo possível:** pastas diferentes, sem dependência, cada sessão com worktree e `PORTA_APP` própria. Lembre que paralelismo economiza tempo, não tokens
   - **o que o Saulo precisa fazer antes**
   - **como retomar:** colar o mesmo prompt numa sessão nova

## Regras que todo prompt carrega

- Pré-condição: pasta limpa, na `main`, dependências com ✅. Senão, parar.
- Retomável: pular tarefas com ✅.
- Leitura mínima: só as seções citadas do PROMPT.md e do DECISOES.md.
- Testes:
  - durante a tarefa, só o que mudou, com saída curta;
  - no fim, `make check` e depois `make test-e2e-completo`, com `| tail -40`;
  - `--last-failed` para falha intermitente;
  - 3 tentativas e parar;
  - `make db-limpar-testes`, nunca `make db-reset` sem perguntar;
  - nunca enfraquecer um teste.
- Expectativas de teste vindas das funções do core e do app; seletores por papel.
- shadcn: revisar o diff depois de `add`.
- Spec acima do design. Caso não coberto: opção mais conservadora, anotada no arquivo de pendências.
- Fechamento:
  - commit em Conventional Commits;
  - `git merge --no-ff <branch> -m "Merge branch '<branch>' (T0X-YY)"`;
  - commit "docs: marca T0X-YY como concluída", só com o ✅;
  - sem push.
- Segurança: nunca a `service_role` no app, nenhuma senha em log ou URL. O agente não cria contas, não lida com chaves e não roda comandos de produção.
