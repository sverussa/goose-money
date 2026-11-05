# T05-16 · Painel › Visão geral: pendências e KPIs

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T04-07, T01-17, T01-21 | `feat/painel-visao-geral` |

**Referências:** PROMPT 6.2 (Pendências, Visão geral), 3.10 (Variação), 11.7 · `design/telas/Main.dc.html` · DESIGN-HANDOFF 3 (linha Main)

## Objetivo

A parte de cima da aba Visão geral: abas do Painel, card Pendências, período e KPIs.

## Escopo

- Abas primárias do Painel: Visão geral · Saldos · Cartões · Projeções; aba na URL (`?aba=`).
- Card **Pendências** (só quando houver), acima de tudo: itens de `pendencias()` (T01-21) com ação direta (Confirmar, Pagar, Pagar fatura, Registrar pagamento) e o botão "Confirmar todos os fixos" para recorrências.
  - as ações abrem o diálogo correspondente já preenchido (de T05-15, T05-24, T05-25, T05-26) ou confirmam direto quando não há o que editar
  - enquanto esses diálogos não existirem, a ação leva à tela do módulo; a ligação direta é feita em cada uma dessas tarefas
- `PeriodPicker` com o texto do período e do período de comparação.
- 4 cards de KPI: **Receitas**, **Despesas**, **Resultado**, **Taxa de poupança**, cada um com **Variação** ("+12,3%", "—" ou "Novo").
- Estados carregando, vazio e erro.

## Fora do escopo

Gráficos e Maiores despesas (T05-17).

## Passos

1. Montar abas, card e KPIs.
2. Testes Playwright: confirmar uma pendência a remove da lista e atualiza a Barra.

## Critérios de aceite

- [ ] Período sem receitas: Taxa de poupança "—"; anterior zero e atual R$ 500,00: Variação "Novo" (11.7).
- [ ] Confirmar uma renda atrasada pela pendência atualiza a Barra e o badge de Rendas.
- [ ] Sem pendências, o card não aparece.
