# Etapa 6 · Qualidade e entrega · prompt de execução

| | |
| --- | --- |
| Tarefas | T06-01 a T06-07 (`docs/tasks/06-qualidade-entrega/`) |
| Trilha | Q · Qualidade (transversal: só depois que as telas param) e B · Banco/produção |
| Estado | A executar |
| Modelo | Opus. O coordenador da leva 1 pode rodar no Sonnet |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA6.md` |
| Pré-requisito | Etapa 5 inteira com ✅ (a leva 2 só precisa da T02-11) |

Três levas de natureza diferente:

| Leva | Tarefas | Quem faz | Formato |
| --- | --- | --- | --- |
| 1 · Qualidade | T06-01 → T06-02 → T06-03 | Só o agente | Coordenador com subagentes |
| 2 · Produção e distribuição | T06-05 → T06-06 → T06-04 | O agente prepara; o Saulo cria as contas e roda os comandos de produção | Sessão única, com o Saulo |
| 3 · Aceite final | T06-07 | O agente, com tudo mergeado | Sessão única |

A leva 2 pode andar em paralelo com a leva 1, numa worktree própria: ela anda no tempo do Saulo.

**O que a leva 2 precisa do Saulo:**

- **Provedor da VPS e domínio:** continuam em aberto (D53), e a T06-05 não fecha sem eles.
- **Contas e chaves:** o projeto Supabase de produção (`sa-east-1`), o SMTP, a VPS e o `.env.producao`.
- **GitHub:** um repositório no GitHub e o push da tag. O repositório não tem remoto, e a T06-04 gera os instaladores pelo GitHub Actions.
- **Testes manuais** no Windows e no Linux.

## Como usar

**Leva 1:** cole o prompt de coordenador abaixo com `<N>` = 1. **Levas 2 e 3:** cole o prompt completo da seção da leva. Os prompts são retomáveis: tarefas com ✅ são puladas.

**Com subagentes** (leva 1):

```
Você é o coordenador da leva <N> de docs/tasks/prompt/06-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, modelo opus) com este pedido:

  Execute a tarefa <T06-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/06-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que todas as tarefas da etapa 5 têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40` na main e me entregue um resumo das tarefas, com os números de desempenho medidos.
```

## Regras da etapa

Valem para a leva 1. As levas 2 e 3 têm prompt próprio.

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa
   - as seções 7 e 9 do `docs/DESIGN-HANDOFF.md`
   - só as seções do PROMPT.md e do DECISOES.md que ela cita
3. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
4. **Implementação:** tarefa transversal. Pode editar qualquer arquivo de `apps/app/src/` e `apps/app/tests/`.
   - mantenha as regras de interface do CLAUDE.md: só variáveis do tema, nenhum valor fixo, nenhum indicador calculado em componente
   - mudança no banco, em migração ou no modelo de dados: pare e pergunte
5. **Durante a tarefa,** rode só o que mudou, com saída curta:
   - `pnpm exec vitest run <arquivo> --reporter=dot`
   - `pnpm --filter @goose-money/app exec playwright test <spec> --project chromium --reporter=line`
   - `pnpm --filter @goose-money/app typecheck` e `pnpm exec eslint <arquivos alterados>`
6. **No fim,** uma vez e um depois do outro: `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
7. **Critérios:** confira os critérios de aceite um a um.
8. **Testes:**
   - seletores por papel e nome acessível
   - falha intermitente: rode de novo só o que falhou (`--last-failed`)
   - banco lento: `make db-limpar-testes`, nunca `make db-reset` sem perguntar
   - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
   - nunca pule nem enfraqueça um teste nem uma regra do axe
9. **shadcn:** depois de `shadcn add`, revise o diff. O `cn` vem de `@/lib/utils`. Desfaça pacote novo, versão rebaixada e import trocado.
10. **Decisões:** caso que a spec não cobre: opção mais conservadora, anotada numa seção "## T06-YY" de `docs/DECISOES-PENDENTES-ETAPA6.md`.
11. **Fechamento:**
    - commit em Conventional Commits
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T06-YY)"`
    - depois o commit "docs: marca T06-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Responsivo, acessibilidade e desempenho

**Ordem:** T06-01 → T06-02 → T06-03 · **Modelo:** opus

- **T06-01:**
  - telas sem desenho em compact e medium seguem o padrão de `MobilePainel.dc.html`
  - a suíte nova abre todas as rotas em 360, 768 e 1440
- **T06-02:**
  - o axe roda em todas as rotas e diálogos, nos dois temas e nas três larguras
  - a revisão manual com teclado e VoiceOver vai, tela por tela, em `docs/ACESSIBILIDADE.md`, porque não há PR
- **T06-03:**
  - meça antes de otimizar e grave os números de antes e depois em `docs/DESEMPENHO.md`
  - otimizações no core (memoização no Motor) são permitidas se não mudarem nenhum resultado, com todos os testes do core passando e cobertura de 90%
  - limite de 9.3 que precise mudar: pare e pergunte

## Leva 2 · Produção e distribuição

**Ordem:** T06-05 → T06-06 → T06-04 · **Modelo:** opus · **Formato:** sessão única, com o Saulo

```
Execute comigo as tarefas T06-05, T06-06 e T06-04 de docs/tasks/06-qualidade-entrega/, nessa ordem, uma de cada vez. Elas mexem em produção, então siga estas regras acima de tudo:

- Você não cria contas, não digita senhas e não lê nem escreve chaves.
  - Eu crio o projeto Supabase de produção (sa-east-1), o SMTP, a VPS e o repositório no GitHub.
  - Eu preencho o .env.producao. Você só cria o .env.producao.example com os nomes das variáveis, sem valores.
- Você nunca roda comando contra produção (`make db-migrate-prod`, `make deploy-web`, testes de segurança contra produção, `make db-eliminar-usuario` com a conexão de produção).
  - Prepare o comando, teste o que der no ambiente local e me diga exatamente o que rodar.
  - Eu rodo e colo a saída para você conferir.
- Nada de produção vai para o Git: .env.producao, chaves e o IP da VPS ficam fora. Confira o .gitignore.
- A chave service_role nunca entra no app nem no build.

Antes de começar:
- Confira que `git status` está limpo e que a branch é a main.
- Leia CLAUDE.md, os arquivos das três tarefas e só as seções do PROMPT.md e do DECISOES.md que elas citam.
- Me pergunte o provedor da VPS e o domínio do app web (D53, em aberto). Registre a resposta no docs/DECISOES.md e tire o item de "Em aberto".
- Me passe a lista, em ordem, de tudo o que eu preciso criar ou configurar fora do repositório para as três tarefas, e espere eu dizer que terminei cada parte.

Para cada tarefa:
1. Crie a branch do cabeçalho a partir da main.
2. Implemente a parte que é código e documentação:
   - T06-05: deploy/docker-compose.yml, deploy/Caddyfile com os cabeçalhos de segurança e o cache, `make deploy-web` com confirmação digitada, a configuração de Auth de produção documentada e o guia da VPS no README
   - T06-06: `make db-eliminar-usuario`, testado contra o banco local com um usuário de teste, e o texto de privacidade em Configurações, no rodapé do Login e em Criar conta
   - T06-04: ícones com `tauri icon`, a CSP de produção, o workflow com tauri-action fixada por SHA, disparado por tag v*, com os SHA-256 no Release, e o README de como abrir o app sem assinatura
3. Rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
4. Me diga os comandos de produção a rodar e confira a saída que eu colar:
   - T06-05: migração, validação, suíte de segurança com dois usuários de teste (e a remoção deles depois) e `curl -I` no domínio
   - T06-04: o push da tag; os testes manuais no Windows e no Linux ficam comigo
5. Confira os critérios de aceite um a um. Os que dependem de mim ficam marcados como "aguardando o Saulo" até eu confirmar.
6. Commit em Conventional Commits. Na main, faça `git merge --no-ff <branch> -m "Merge branch '<branch>' (T06-xx)"` e depois o commit "docs: marca T06-xx como concluída", só com o ✅ no README e só quando todos os critérios estiverem conferidos. Não faça push. Os pushes ficam comigo.

No fim, me entregue o que ficou pendente do meu lado, se houver.
```

## Leva 3 · Aceite final

**Ordem:** T06-07 · **Modelo:** opus · **Formato:** sessão única, com tudo mergeado

```
Execute a tarefa docs/tasks/06-qualidade-entrega/T06-07-aceite-final.md, do início ao merge na main.

Antes de começar, confira que `git status` está limpo, que a branch é a main e que T06-01 a T06-06 e toda a etapa 5 têm ✅ no docs/tasks/README.md. Se algo faltar, pare e me avise.

1. Leia CLAUDE.md, a seção 11 do PROMPT.md, a seção 9 do docs/DESIGN-HANDOFF.md e o docs/DECISOES.md.
2. Crie a branch docs/aceite-mvp a partir da main.
3. docs/ACEITE.md: cada critério de 11.1 a 11.8 com o teste que o cobre (arquivo e nome do teste) e o resultado. Critério sem teste ganha teste antes de fechar.
4. CI: o CI não sobe banco (D29), então os testes de banco e o e2e não rodam lá. Marque no ACEITE.md onde cada critério roda (CI ou local, com `make check` e `make test-e2e-completo`). Registre essa divergência do critério "passa no CI" em docs/DECISOES.md.
5. Decisões pendentes:
   - junte os itens ainda não aprovados de docs/DECISOES-PENDENTES-ETAPA*.md numa lista só
   - me apresente a lista para eu aprovar ou mudar
   - leve só os aprovados para o docs/DECISOES.md; "Em aberto" fica só com o que eu adiar
6. Limpeza das levas anteriores:
   - arquivos de teste temporários
   - reexportes provisórios (como o `LoginProvisorio`)
   - edições fora da trilha
   Liste o que encontrou e corrija o que for seguro.
7. Checklist visual da seção 9 do handoff, tela por tela, comparando no navegador com os dados de exemplo e hoje = 04/11/2026.
8. Atualize o README (badge, "Como rodar", "Estrutura do repositório", funcionalidades do MVP marcadas) e o "Project status" do CLAUDE.md.
9. Rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar, limpo.
10. Commit "docs: aceite final do MVP (T06-07)". Na main, faça `git merge --no-ff docs/aceite-mvp -m "Merge branch 'docs/aceite-mvp' (T06-07)"` e depois o commit "docs: marca T06-07 como concluída". Não faça push.

No fim, me entregue o resumo do aceite: quantos critérios, quantos testes novos e o que ficou adiado.
```
