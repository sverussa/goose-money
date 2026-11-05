# T05-06 · Lançamentos: visão "Receitas e despesas"

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançamentos | T04-07, T01-14 | `feat/lancamentos-competencia` |

**Referências:** PROMPT 6.3, 8 (destino dos cliques), 11.4, 11.7 · `design/telas/Lancamentos.dc.html` · DECISOES D9

## Objetivo

A visão padrão de `#/lancamentos`, por competência, que é o destino de todos os cliques em gráficos de receitas e despesas.

## Escopo

- Segmented button "Receitas e despesas" (padrão) · "Movimentações"; a visão fica na URL (`?visao=competencia`).
- Cabeçalho de contexto fixo com **Receitas**, **Despesas** e **Resultado** do recorte.
- `PeriodPicker` (T04-07); período, filtros e busca na URL (6.3).
- Itens = exatamente `receitasReconhecidas` + `despesasReconhecidas` (T01-14) do recorte.
- Lista agrupada por dia, com total do dia; cada item com descrição (ou nome da categoria se vazia), categoria, conta ou cartão e `MoneyText`. Parcela de cartão no formato "Notebook · 3/10 · Cartão A · comprado em 12/10".
- Previstos só aparecem quando o filtro de estado os inclui, sempre com chip, e nunca somam no cabeçalho.
- Lista virtualizada com `@tanstack/react-virtual` (D9).
- Estados carregando, vazio ("Sem lançamentos neste período · Lançar") e erro (T04-07).

## Fora do escopo

Visão Movimentações, filtros avançados e ações por item (T05-07).

## Passos

1. Montar a tela e ler o estado da URL.
2. Teste Playwright: abrir com a URL de um ponto de gráfico e conferir que a soma da lista = valor do ponto.

## Critérios de aceite

- [ ] Aberta a partir de um gráfico, a soma dos itens = valor clicado (6.3, 11.7).
- [ ] A parcela de compra de outubro com fatura em novembro aparece em novembro (11.4).
- [ ] 10 mil itens rolam sem travar (T06-03 mede).
