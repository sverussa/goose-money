# T05-17 · Painel › Visão geral: gráficos e maiores despesas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T05-16, T04-08, T05-06 | `feat/painel-graficos` |

**Referências:** PROMPT 8.1 (gráficos da Visão geral), 8.3, 11.7 · `design/telas/Main.dc.html`

## Objetivo

Os gráficos da Visão geral, cada um com o período e o destino de clique da tabela 8.1.

## Escopo

Cada gráfico num `ChartCard` com título-conclusão como no design ("Sobrou dinheiro nos três meses", "Moradia é 30% das despesas"…), gerado a partir dos dados, não fixo:

| Gráfico | Período | Clique abre |
| --- | --- | --- |
| Receitas × Despesas por mês (barras agrupadas + linha de Resultado) | Seletor | Lançamentos › Receitas e despesas, mês e tipo clicados |
| Despesas por categoria (rosca, até 6 fatias + "Outras", e ranking) | Seletor | Lançamentos › Receitas e despesas, categoria; "Outras" = categorias agrupadas |
| Gasto acumulado vs. mês anterior (duas linhas por dia) | Último mês do período e o anterior | Lançamentos, do dia 1 ao dia clicado |
| Fixos × variáveis (barras empilhadas) | Seletor | Lançamentos, mês e origem |
| Comprometimento da renda (barra segmentada) | Último mês do período | Segmento abre Gastos fixos, Cartões ou Dívidas |
| Maiores despesas (top 5) | Seletor | Detalhe do item (compra, lançamento ou parcela) |

- Séries vindas de T01-17; os títulos-conclusão vêm de funções do core (`conclusaoReceitasDespesas` etc.) testadas.
- A URL de destino leva visão, base de data, período e filtros do ponto clicado.

## Fora do escopo

Outras abas.

## Passos

1. Um gráfico por vez, com teste Playwright de clique.

## Critérios de aceite

- [ ] Para cada gráfico com destino em Lançamentos, a soma da lista aberta = valor clicado (11.7).
- [ ] Cada gráfico respeita o período de 8.1 (11.7).
- [ ] "Ver itens" no menu do card leva ao mesmo destino do clique.
