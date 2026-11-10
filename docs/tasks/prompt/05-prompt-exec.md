# Etapa 5 · Telas · prompt de execução

| | |
| --- | --- |
| Tarefas | T05-01 a T05-30 (`docs/tasks/05-telas/`) |
| Trilha | T · Telas: `apps/app/src/features/<funcionalidade>/` e `apps/app/tests/e2e/<funcionalidade>/` |
| Estado | Concluída |
| Modelo | Opus nos subagentes; o coordenador pode rodar no Sonnet |
| Pendências | `docs/DECISOES-PENDENTES-ETAPA5.md` |
| Pré-requisito | T00-14 (ambiente de testes) com ✅ |

Registro revisto com os aprendizados de `docs/Prompts-SubAgents-Strategies-Skill.md`.

Na primeira execução, as levas foram estas:

| Levas | Formato |
| --- | --- |
| T00-14 + T05-01 a T05-10, T05-11 a T05-12, T05-13 a T05-20 | Sessão única |
| T05-21 a T05-25, T05-26 a T05-30 | Coordenador com subagentes |

Aqui as levas foram reagrupadas por módulo, com no máximo 8 tarefas.

Algumas exceções no core e em `src/data` foram criadas durante essa execução e já existem: `motor/conclusoes.ts`, `cadastrar`, `alterarSenha` e a chamada de `apagar_tudo`. Numa nova execução, a exceção só vale se a função ainda não existir.

## Como usar

Cole um dos prompts abaixo, trocando `<N>` pelo número da leva. O prompt é retomável: tarefas com ✅ são puladas.

**Com subagentes** (padrão desta etapa):

```
Você é o coordenador da leva <N> de docs/tasks/prompt/05-prompt-exec.md. Leia nesse arquivo as seções "Regras da etapa" e "Leva <N>". Não implemente nada você mesmo: para cada tarefa da leva, na ordem, abra um subagente (Agent, general-purpose, modelo opus) com este pedido:

  Execute a tarefa <T05-YY>, do início ao merge na main, seguindo as seções "Regras da etapa" e "Leva <N>" de docs/tasks/prompt/05-prompt-exec.md. Responda em no máximo 15 linhas: o que foi feito, os critérios de aceite conferidos, as decisões anotadas e qualquer ponto em aberto. Não cole diffs nem logs.

Antes de cada tarefa:
- Confira que `git status` está limpo, que a branch é a main e que as dependências da tarefa têm ✅ no docs/tasks/README.md. Se algo falhar, pare e me avise.
- Pule a tarefa que já tiver ✅.

Depois de cada subagente:
- Confira com `git log --oneline -3` e no README que o merge e o ✅ estão na main.
- Guarde só o resumo dele. Se ele parou com uma pergunta, pare e me repasse a pergunta.

No fim, me entregue um resumo das tarefas e das decisões pendentes. Na leva 6, a última da etapa, rode antes `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40` na main e liste tudo o que ainda espera aprovação em docs/DECISOES-PENDENTES-ETAPA5.md.
```

**Sessão única:**

```
Execute as tarefas da leva <N> de docs/tasks/prompt/05-prompt-exec.md, uma de cada vez e na ordem da leva, seguindo as seções "Regras da etapa" e "Leva <N>" desse arquivo.
Antes de cada tarefa, confira que a pasta está limpa, que a branch é a main e que as dependências têm ✅. Pule as tarefas que já têm ✅.
No fim, me entregue o resumo das tarefas e das decisões pendentes.
```

## Regras da etapa

1. **Pré-condição:** `git status` limpo e branch `main`. Senão, pare e avise.
2. **Leitura:**
   - CLAUDE.md
   - a seção "Regras de merge" de `docs/tasks/tasks-agents-estrategies.md`
   - o arquivo da tarefa e os arquivos de `design/telas/` que ela cita
   - as linhas dela no `docs/DESIGN-HANDOFF.md`
   - só as seções do PROMPT.md e do DECISOES.md que ela cita
3. **Padrão:**
   - siga a funcionalidade pronta indicada na leva: diálogos, menus com motivo de desabilitado, mutações e testes
   - reuse o que existe em `src/components/` e `src/app/` (AppShell, TotalsBar, MoneyText, StatusChip, seletores, ChartCard); não recrie
4. **Branch:** crie a branch do cabeçalho da tarefa a partir da `main`.
5. **Implementação:**
   - React + shadcn/ui + Tailwind. Não copie o markup dos `.dc.html`
   - cores, tamanhos e raios só pelas variáveis do tema. Nada de hex nem valor arbitrário; a cor de cartões e categorias vem da paleta do tema
   - nenhum valor fixo: prévias, efeitos na Barra, indicadores, séries, projeções, resumos, status e relatórios vêm do core pelas consultas de `src/queries`, nunca calculados no componente
   - toda gravação passa pelas mutações de T03-04 (com "Salvando…" e Desfazer), com os comandos do core. Nunca direto no Supabase
   - textos em pt-BR, com o nome Goose Money, em `src/features/<funcionalidade>/mensagens.ts`
   - edite só `apps/app/src/features/<funcionalidade>/` e `apps/app/tests/e2e/<funcionalidade>/`. Substitua a página provisória da rota (T04-05), sem editar o arquivo de rotas
6. **Exceções:** só as listadas na leva.
   - Mudança no core vai em commit próprio (`feat(core): ...`) antes da tela, com testes e cobertura de 90%. O core devolve dados, e a frase fica em `mensagens.ts`, como em `previaDoCadastro`
   - qualquer outra mudança no core, em `src/data`, `src/queries`, `src/components` ou no banco: pare e pergunte
7. **Ligações:**
   - quem deixa um ponto de ligação e quem liga está na leva
   - nunca crie diálogo provisório para uma tarefa que ainda não existe
8. **Telas sem design:**
   - use o vocabulário das telas e diálogos existentes, seguindo o que a leva indica
   - anote o que escolheu
9. **Durante a tarefa,** rode só o que mudou, com saída curta:
   - `pnpm exec vitest run <arquivo> --reporter=dot`
   - `pnpm --filter @goose-money/app exec playwright test tests/e2e/<funcionalidade>/ --project chromium --reporter=line`
   - `pnpm --filter @goose-money/app typecheck` (e o do core, se mexer nele) e `pnpm exec eslint <arquivos alterados>`
   - leia o log completo só quando algo falhar
10. **No fim,** uma vez e um depois do outro: `make check 2>&1 | tail -40` e `make test-e2e-completo 2>&1 | tail -40`. Tudo precisa passar.
11. **Critérios:**
    - confira os critérios de aceite um a um, os de 11.x com os valores exatos da spec
    - compare com o design no navegador, com os dados de exemplo e hoje = 04/11/2026
12. **Testes:**
    - valores e datas esperados saem das funções de formatação e de datas do core e do app, nunca escritos à mão
    - gráfico com destino em Lançamentos: a soma da lista aberta é igual ao valor clicado (11.7)
    - seletores por papel e nome acessível
    - falha intermitente: rode de novo só o que falhou (`--last-failed`). Se passar sozinho e falhar no conjunto, é o ambiente: anote e siga
    - banco lento: `make db-limpar-testes`, nunca `make db-reset` sem perguntar
    - a mesma falha depois de 3 tentativas de correção: pare e mostre a saída
    - nunca pule nem enfraqueça um teste
    - apague arquivos de teste temporários (como `zz-visual.spec.ts`) antes do commit
13. **shadcn:**
    - depois de `shadcn add`, revise o diff. O `cn` vem de `@/lib/utils`
    - desfaça pacote novo, versão rebaixada e import trocado
14. **Decisões:**
    - divergência entre design e spec: siga a spec
    - caso que a spec não cobre: opção mais conservadora (a que mostra menos dinheiro disponível), anotada numa seção "## T05-YY" de `docs/DECISOES-PENDENTES-ETAPA5.md`
15. **Fechamento:**
    - commit em Conventional Commits (`feat(app): ...`)
    - na `main`, `git merge --no-ff <branch> -m "Merge branch '<branch>' (T05-YY)"`
    - depois o commit "docs: marca T05-YY como concluída", só com o ✅ no README
    - não faça push

## Leva 1 · Login, Lançar e Lançamentos

**Ordem:** T05-01 → T05-02 → T05-03 → T05-04 → T05-05 → T05-06 → T05-07 · **Modelo:** opus
**Padrão:** os componentes da etapa 4. São as primeiras telas.

- **T05-01:**
  - se a rota `/login` ainda apontar para a página provisória de `src/app/`, faça ela só reexportar a tela de `features/acesso`
  - anote a limpeza para quando o arquivo de rotas puder ser editado
- **T05-02:**
  - troca o diálogo provisório `src/features/lancar/LancarDialog.tsx` que a casca abre (tecla `N`, busca e FAB)
  - a casca expõe `useLancar()`
- **T05-03:** compra no cartão, transferência e pagamento de fatura, no mesmo formulário.
- **T05-05:**
  - em tela cheia no celular, com `Drawer`
  - o FAB fica acima da navigation bar
- **T05-07:** as ações por item usam os mesmos diálogos do formulário de lançamento (T05-04).

## Leva 2 · Contas e cartões

**Ordem:** T05-08 → T05-09 → T05-10 → T05-11 → T05-12 · **Modelo:** opus
**Padrão:** Contas (T05-08) vira o padrão de Cartões (T05-11).
**Dependência de outra leva:** T05-10 precisa da T05-03 (leva 1).

- **Telas sem design:**
  - T05-08: lista e formulário de contas
  - T05-10: diálogos Transferir e Ajustar saldo
  - T05-11: lista de cartões, com a face do cartão de `PainelCartoes.dc.html`
  - T05-12: seletor de cartão, em chips com os cartões ativos
- **T05-12, ponto de ligação:** os botões "Nova compra", "Pagar fatura", "Lançar encargo ou estorno" e "Configurar ciclo" e o clique numa compra ficam na tela.
  - os diálogos são da leva 3; aqui fica só o ponto de ligação
  - o FAB abre "Compra no cartão" (T05-03) com este cartão
- **T05-12, casos do seed:**
  - a fatura de M−1 do Cartão B "Transportada"
  - a seguinte com "Saldo anterior não pago"
  - "Paga parcialmente"
  - o crédito de R$ 50,00
  - o item previsto separado no fim e fora do saldo (D46)

## Leva 3 · Ações do cartão

**Ordem:** T05-13 → T05-14 → T05-15 · **Modelo:** opus
**Padrão:** Cartões (T05-11, T05-12).

- **Ligações:**
  - as três tarefas ligam os seus diálogos nos pontos que a T05-12 deixou
  - "Editar valor" da T05-14 reabre a Nova compra da T05-13 preenchida
- **T05-14:** o estado de cada item do menu vem de `operacoesPermitidas`. Item desabilitado mostra o motivo no tooltip.
- **T05-15:** as prévias de pagamento vêm de `previaDoPagamento` (restante ou crédito). Nenhuma receita é reconhecida no crédito.

## Leva 4 · Painel

**Ordem:** T05-16 → T05-18 → T05-19 → T05-20 → T05-17 → T05-21 · **Modelo:** opus
**Padrão:** os componentes de gráficos da T04-08.

- **Exceções no core** (em `packages/core/src/motor/conclusoes.ts`, se ainda não existirem):
  - T05-17: os dados de cada título-conclusão dos gráficos (ex.: `conclusaoReceitasDespesas`)
  - T05-18: a causa do patrimônio negativo (D47): qual parcela pesa mais e os valores
  - T05-21: a conclusão da simulação (primeiro mês abaixo do limite de alerta com o hipotético)
- **Ligações:**
  - T05-16: a pendência "Pagar fatura" abre o diálogo da T05-15
  - T05-16: dívidas, rendas e gastos fixos levam à tela do módulo até as levas 5 ligarem os diálogos
- **T05-20:** a faixa colorida entre zero e o limite de alerta substitui as duas linhas do design (D48).
- **T05-17:**
  - fica para o fim da leva porque é a maior e usa as anteriores
  - se precisar mexer em `src/components/ChartCard.tsx` ou nos gráficos base, pare e pergunte
- **T05-21:** o simulador não grava nada. O estado fica só na tela.

## Leva 5 · Dívidas e recorrências

**Ordem:** T05-22 → T05-23 → T05-24 → T05-25 → T05-26 · **Modelo:** opus
**Padrão:** Cartões para diálogos e menus. Rendas (T05-25) para Gastos fixos (T05-26).

- **Exceções:**
  - T05-22: os títulos-conclusão dos gráficos da dívida, em `motor/conclusoes.ts`, se ainda não existirem
  - T05-26: mova o formulário de Rendas para `src/features/recorrencias/` e use-o nas duas telas. Os testes de Rendas continuam passando
- **Ligações:**
  - a pendência "Registrar pagamento" do Painel abre o diálogo da T05-24 com a parcela escolhida
  - a pendência "Confirmar" de renda abre o diálogo da T05-25
  - a pendência "Pagar" ou "Confirmar no cartão" abre o da T05-26
- **Telas sem design:**
  - T05-23: o stepper de 5 etapas
  - T05-24: os diálogos de pagamento e amortização
- **T05-23, critérios de 11.5:**
  - R$ 300,00 × 12 contra R$ 4.800,00 é rejeitado
  - R$ 450,00 × 12 dá taxa implícita perto de 1,86% a.m.
  - Price R$ 40.000,00 a 1,49% em 48x zera o saldo
- **T05-25 e T05-26:** editar uma recorrência exige "Aplicar a partir de" e nunca muda ocorrências já gravadas (3.8).

## Leva 6 · Configurações e Criar conta

**Ordem:** T05-27 → T05-28 → T05-29 → T05-30 · **Modelo:** opus
**Padrão:** Contas e Cartões para diálogos. Login e Redefinir senha (`src/features/acesso/`) para a T05-30.

- **Exceções** (se ainda não existirem):
  - T05-28: `alterarSenha(atual, nova)` em `apps/app/src/data/auth.ts`. Confere a senha atual antes de trocar e devolve o erro para mostrar inline
  - T05-29: uma função em `apps/app/src/data/` que chama a RPC `apagar_tudo()`. Importação e dados de exemplo usam o `executar` existente, num comando só
  - T05-30: `cadastrar(email, senha)` em `apps/app/src/data/auth.ts` e as rotas públicas `#/criar-conta` e `#/confirmar`. Se a rota não existir, é a única edição permitida no arquivo de rotas
- **Comandos do core já existentes:** `excluirCategoria`, `salvarPreferencias` e os de recorrências.
- **T05-27:**
  - excluir uma categoria em uso move os itens para "A classificar", com Desfazer (D49)
  - excluir uma categoria pai exclui também as subcategorias
- **T05-29:**
  - dados de exemplo só com a base vazia (D50)
  - "Apagar tudo" só depois de digitar "APAGAR"
  - o teste usa um usuário próprio, nunca um compartilhado
- **T05-30:**
  - o fluxo completo lê o e-mail de confirmação no servidor de e-mail local, como `tests/e2e/redefinir-senha.spec.ts`
  - a mensagem depois do envio é sempre a mesma, exista ou não a conta
- **Segurança:** nenhuma senha em log, URL ou mensagem de erro.
