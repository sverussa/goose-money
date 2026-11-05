# T05-07 · Lançamentos: "Movimentações", filtros e ações por item

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançamentos | T05-06, T05-04 | `feat/lancamentos-movimentacoes` |

**Referências:** PROMPT 3.2, 6.3, 9.4 · `design/telas/Lancamentos.dc.html`

## Objetivo

A segunda visão (por data do evento), os filtros e o que se pode fazer com cada item.

## Escopo

- Visão **Movimentações** (`?visao=movimentacoes`): todos os lançamentos em conta (inclusive transferências, pagamentos de fatura e de dívida, captações e ajustes) e as compras no cartão pela data da compra. Função do core `movimentacoes(fatos, periodo, filtros)` com testes.
- Cabeçalho dessa visão: entradas e saídas de caixa do recorte.
- Filtros (filter chips + menus): tipo, conta, cartão, categoria, estado (3.1), origem (manual, recorrência, cartão, dívida); busca por descrição. Tudo na URL.
- Ações por item:
  - abrir para editar (o mesmo formulário de lançamento, preenchido)
  - excluir (exclusão lógica, com Desfazer)
  - "Classificar" rápido nos itens em "A classificar" (escolher a categoria sem abrir o formulário)
  - parcelas e compras abrem o menu da compra (T05-14)
- O badge de Lançamentos (itens "A classificar") diminui ao classificar.

## Fora do escopo

Busca global (T04-09).

## Passos

1. Função do core e testes.
2. Tela, filtros e ações.

## Critérios de aceite

- [ ] Uma transferência aparece em Movimentações e não aparece em Receitas e despesas.
- [ ] Classificar um item muda a categoria e atualiza o badge na hora.
- [ ] Excluir e desfazer devolve o item e os indicadores (11.8).
- [ ] Os filtros sobrevivem a recarregar a página.
