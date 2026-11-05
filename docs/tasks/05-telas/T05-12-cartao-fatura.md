# T05-12 · Fatura do cartão

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Cartões | T05-11, T01-09 | `feat/cartao-fatura` |

**Referências:** PROMPT 3.5, 6.5 (Detalhe), 11.3 · `design/telas/CartaoFatura.dc.html` · DESIGN-HANDOFF 6 (item 4), 7 (seletor de cartão)

## Objetivo

`#/cartoes/:id` com as faturas do cartão, como no design, mais o seletor de cartão que falta no desenho.

## Escopo

- **Seletor de cartão**: chips com os cartões ativos (o título "Cartão A" fixo do design vira o nome do cartão selecionado).
- Tabs secundárias roláveis, uma por fatura, abrindo na aberta (`montarFaturas`, T01-09); a fatura fica na URL (`?fatura=2026-12`).
- Cabeçalho de contexto da fatura: saldo, `StatusChip` (Futura, Aberta, Fechada, Vencida, Paga, Transportada, "Paga parcialmente"), fechamento, vencimento, pagamentos feitos, **Limite disponível**.
- Itens: compras à vista, parcelas ("Notebook · 3/10"), estornos, encargos, ajustes, "Saldo anterior não pago", "Crédito de pagamento", "Saldo anterior ao cadastro".
- Item previsto (gasto fixo no cartão não confirmado) conforme a decisão D1.
- Ações: "Nova compra" (T05-13), "Pagar fatura", "Lançar encargo ou estorno", "Configurar ciclo" (T05-15). Clique numa compra abre o menu da compra (T05-14).
- O FAB nesta tela abre "Compra no cartão" com este cartão (7.2).

## Fora do escopo

Os diálogos das ações (T05-13 a T05-15).

## Passos

1. Montar a tela.
2. Testes Playwright com o seed: fatura do Cartão B de M−1 aparece "Transportada" e a seguinte com "Saldo anterior não pago".

## Critérios de aceite

- [ ] Trocar de cartão e de fatura atualiza a URL e o conteúdo.
- [ ] Os status do seed batem com 3.5 (paga parcialmente, transportada, crédito de R$ 50,00).
- [ ] O item previsto não soma no saldo da fatura.

## Decisões

**D1. Como mostrar o gasto fixo previsto dentro da fatura?** (decisão de design 4 do handoff)

- **A)** Separado no fim da lista, tracejado, com o chip "Previsto" e fora do saldo da fatura, como desenhado. *(recomendado)*
- **B)** Misturado aos itens pela data, com o chip "Previsto" e fora do saldo.
- **C)** Não mostrar na fatura; só na projeção e em Gastos fixos.
