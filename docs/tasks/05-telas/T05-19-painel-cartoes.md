# T05-19 · Painel › Cartões

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T05-16, T01-10 | `feat/painel-cartoes` |

**Referências:** PROMPT 6.2 (Cartões), 8.1 · `design/telas/PainelCartoes.dc.html`

## Objetivo

A aba Cartões do Painel, como no design.

## Escopo

- Card por cartão ativo: face do cartão na cor escolhida, fatura aberta, próxima fatura a vencer, **Limite disponível** com barra, **Obrigações do cartão**.
- Tabela de compras parceladas ativas (`comprasParceladasAtivas`, T01-10): descrição, cartão, parcela atual (3/10), valor da parcela, parcelas restantes, valor restante, competência da última; total no rodapé.
- Gráficos (8.1):
  - Parcelas comprometidas (barras empilhadas por cartão), próximos 12 meses; clique abre a fatura daquele cartão naquela competência
  - Gasto por cartão (barras), período do seletor (competência); clique abre Lançamentos › Receitas e despesas filtrado pelo cartão

## Fora do escopo

Detalhe da fatura (T05-12).

## Passos

1. Montar a aba.
2. Testes Playwright dos dois cliques.

## Critérios de aceite

- [ ] O total do rodapé = soma dos valores restantes das linhas.
- [ ] Clique numa barra de Parcelas comprometidas abre a fatura certa.
- [ ] Gasto por cartão: soma da lista aberta = valor da barra.
