# Modelos de prompt

Troque o que está entre `<>` e apague as linhas que não se aplicam à leva.

## A · Coordenador com um subagente por tarefa

```
Você é o coordenador das tarefas <T0X-AA a T0X-BB> de docs/tasks/<pasta-da-etapa>/. Não implemente nada você mesmo: para cada tarefa, abra um subagente (Agent, general-purpose, modelo <opus|sonnet>) e espere o resumo dele antes da próxima. Ordem: <T0X-AA → ... → T0X-BB>.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, me entregue um resumo das tarefas e das decisões pendentes.
<Se for a última leva da etapa: rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40` na main e liste tudo o que ainda espera aprovação em docs/DECISOES-PENDENTES-ETAPA<n>.md.>

Pedido para cada subagente (troque T0X-YY):
---
Execute a tarefa docs/tasks/<pasta-da-etapa>/T0X-YY-*.md, do início ao merge na main.

1. Leia CLAUDE.md, a seção "Regras de merge" de docs/tasks/tasks-agents-estrategies.md, o arquivo da tarefa, os arquivos de design/telas/ que ela cita, as linhas dela no docs/DESIGN-HANDOFF.md e só as seções do PROMPT.md e do DECISOES.md que ela cita.
2. Siga o padrão de <funcionalidade parecida já pronta> e reuse o que existe em src/components/ e src/app/; não recrie.
3. Crie a branch do cabeçalho da tarefa a partir da main.
4. Implemente seguindo as regras do CLAUDE.md:
   - <telas> React + shadcn/ui + Tailwind, sem copiar o markup dos .dc.html; cores, tamanhos e raios só pelas variáveis do tema
   - nenhum valor fixo: <o que vem do core nesta leva> vem do core pelas consultas de src/queries, nunca calculado no componente
   - toda gravação passa pelas mutações de T03-04 (com "Salvando…" e Desfazer)
   - textos em pt-BR, com o nome Goose Money, em src/features/<funcionalidade>/mensagens.ts
   - edite só <pastas da trilha>; substitua a página provisória, sem editar o arquivo de rotas
5. Exceções (só estas): <arquivo → o que criar → como testar>. Mudança no core vai em commit próprio ("feat(core): ...") antes da tela, com testes e cobertura de 90%; o core devolve dados e a frase fica em mensagens.ts. Qualquer outra mudança no core, em src/data, src/queries, src/components ou no banco: pare e devolva a pergunta.
6. Ligações: <quem deixa o ponto de ligação, quem liga>. Sem diálogos provisórios.
7. Telas sem design: <qual padrão seguir>. Anote o que escolheu.
8. Durante a tarefa, rode só o que mudou, com saída curta:
   - `pnpm exec vitest run <arquivo> --reporter=dot`
   - `pnpm --filter @goose-money/app exec playwright test tests/e2e/<funcionalidade>/ --project chromium --reporter=line`
   - `pnpm --filter @goose-money/app typecheck` e `pnpm exec eslint <arquivos alterados>`
   Leia o log completo só quando algo falhar.
9. No fim, uma vez e um depois do outro: `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
10. Confira os critérios de aceite um a um, os de <11.x> com os valores exatos da spec, com os dados de exemplo e hoje = 04/11/2026. <Casos do seed que precisam bater.>
11. Testes:
    - valores e datas esperados saem das funções do core e do app, nunca escritos à mão
    - seletores por papel e nome acessível
    - falha intermitente: rode de novo só o teste que falhou (`--last-failed`)
    - banco lento: `make db-limpar-testes`, nunca `make db-reset`
    - a mesma falha depois de 3 tentativas: pare e devolva a saída
    - nunca pule nem enfraqueça um teste
12. Depois de `shadcn add`, revise o diff: o `cn` vem de `@/lib/utils`. Desfaça qualquer pacote novo, versão rebaixada ou import trocado.
13. Divergência entre design e spec: siga a spec. Caso que a spec não cobre: opção mais conservadora (a que mostra menos dinheiro disponível), anotada numa seção "## T0X-YY" de docs/DECISOES-PENDENTES-ETAPA<n>.md.
14. Commit em Conventional Commits. Na main, faça `git merge --no-ff <branch> -m "Merge branch '<branch>' (T0X-YY)"` e depois o commit "docs: marca T0X-YY como concluída", só com o ✅ no README. Não faça push.

Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.
---
```

## B · Sessão única, retomável

```
Execute as tarefas <T0X-AA a T0X-BB> de docs/tasks/<pasta-da-etapa>/, uma de cada vez, nesta ordem: <...>.

Antes de começar:
- Confira que `git status` está limpo e que a branch atual é a main. Se não estiver, pare e me avise.
- Leia CLAUDE.md e a seção "Regras de merge" de docs/tasks/tasks-agents-estrategies.md.
- Pule as tarefas que já têm ✅ no docs/tasks/README.md e comece pela primeira sem ✅.

Para cada tarefa:
<os passos 1 a 14 do pedido do subagente do modelo A, sem a linha de resposta em 15 linhas>

No fim:
- `make check` e `make test-e2e-completo` passando na main.
- As tarefas com ✅.
- Um resumo das decisões pendentes para eu aprovar.
```

## C · Produção com o Saulo

```
Execute comigo as tarefas <...> de docs/tasks/<pasta-da-etapa>/, nessa ordem, uma de cada vez. Elas mexem em produção, então siga estas regras acima de tudo:

- Você não cria contas, não digita senhas e não lê nem escreve chaves. Eu crio <contas e serviços> e preencho o <arquivo de ambiente>. Você só cria o <arquivo>.example com os nomes das variáveis, sem valores.
- Você nunca roda comando contra produção (<lista de comandos>). Prepare o comando, teste o que der no ambiente local e me diga exatamente o que rodar. Eu rodo e colo a saída para você conferir.
- Nada de produção vai para o Git. Confira o .gitignore.
- A chave service_role nunca entra no app nem no build.

Antes de começar:
- Confira que `git status` está limpo e que a branch é a main.
- Leia CLAUDE.md, os arquivos das tarefas e só as seções do PROMPT.md e do DECISOES.md que elas citam.
- <Itens em aberto: me pergunte ..., registre a resposta no docs/DECISOES.md e tire o item de "Em aberto".>
- Me passe a lista, em ordem, de tudo o que eu preciso criar ou configurar fora do repositório, e espere eu dizer que terminei cada parte.

Para cada tarefa:
1. Crie a branch do cabeçalho a partir da main.
2. Implemente a parte que é código e documentação: <por tarefa>.
3. Rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
4. Me diga os comandos de produção a rodar e confira a saída que eu colar.
5. Confira os critérios de aceite um a um. Os que dependem de mim ficam como "aguardando o Saulo" até eu confirmar.
6. Commit em Conventional Commits. Na main, faça o merge --no-ff e depois o commit do ✅, só com todos os critérios conferidos. Não faça push. Os pushes e as tags ficam comigo.

No fim, me entregue o que ficou pendente do meu lado.
```

## D · Aceite ou fechamento de etapa

```
Execute a tarefa <...>, do início ao merge na main.

Antes de começar, confira que `git status` está limpo, que a branch é a main e que <tarefas> têm ✅ no docs/tasks/README.md. Se algo faltar, pare e me avise.

1. Leia CLAUDE.md, <seções do PROMPT.md>, <seção do DESIGN-HANDOFF> e o docs/DECISOES.md.
2. Crie a branch <...> a partir da main.
3. <Entregável do aceite: critério → teste que cobre → resultado. Critério sem teste ganha teste.>
4. <Contradições conhecidas, ex.: CI sem banco (D29): marque onde cada critério roda e registre a divergência no DECISOES.md.>
5. Decisões pendentes:
   - junte os itens não aprovados de docs/DECISOES-PENDENTES-ETAPA*.md numa lista só
   - me apresente a lista para eu aprovar ou mudar
   - leve só os aprovados para o docs/DECISOES.md
6. Limpeza: arquivos temporários, reexportes provisórios e edições fora da trilha das levas anteriores. Liste o que encontrou e corrija o que for seguro.
7. Atualize o README ("Estrutura do repositório" e o que mudou) e o "Project status" do CLAUDE.md.
8. Rode `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar, limpo.
9. Commit, merge --no-ff e o commit do ✅. Não faça push.

No fim, me entregue o resumo: o que foi conferido, o que foi corrigido e o que ficou adiado.
```
