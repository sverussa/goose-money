# T01-14 · Reconhecimento de receitas e despesas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-06, T01-10, T01-12, T01-13 | `feat/core-reconhecimento` |

**Referências:** PROMPT 3.2, 3.3, 6.3, 8 (cliques), 11.4

## Objetivo

Criar `packages/core/src/motor/reconhecimento.ts` com as **únicas** funções que dizem o que é receita e despesa (3.3).

## Escopo

- `receitasReconhecidas(fatos, periodo, filtros, hoje)` e `despesasReconhecidas(...)` → lista de itens reconhecidos, cada um com: data de competência, valor, categoria (e categoria pai), origem (manual, recorrência, cartão, dívida), conta ou cartão, referência ao registro de origem e texto de exibição ("Notebook · 3/10 · Cartão A · comprado em 12/10", 6.3).
- Regras por tipo de movimento, exatamente a tabela 3.3:
  - receita e despesa em conta na data
  - parcela de cartão na competência da fatura, categoria da compra
  - estorno negativo e encargo na competência
  - pagamento de fatura, captação, pagamento de dívida, transferência, ajuste, saldo transportado, crédito, saldo anterior ao cadastro, "Paga antes do cadastro": nunca
  - parcela de dívida conforme o destino (T01-12)
  - amortização extraordinária só quando paga a terceiro
  - previstos nunca
- Filtros de 6.3: tipo, conta, cartão, categoria (inclui subcategorias), origem, busca por descrição.
- `somar(itens)` para os totais, e a garantia de que **toda tela e gráfico usam estas funções** (nada recalcula receita ou despesa por fora).

## Fora do escopo

Visão Movimentações (é por data do evento e fica no app, T05-07).

## Passos

1. Um teste por linha da tabela 3.3.
2. Testes de 11.4.
3. Implementar.

## Critérios de aceite

- [ ] Cada linha da tabela 3.3 tem teste.
- [ ] Parcela de compra feita em outubro com fatura vencendo em novembro conta nas Despesas de novembro (11.4).
- [ ] Pagar uma fatura de R$ 800,00 não muda Receitas nem Despesas (11.3).
- [ ] Estorno de R$ 89,90 reduz as despesas da categoria da compra original.
- [ ] A soma dos itens filtrados por um ponto de gráfico é igual ao valor do ponto (invariante de 6.3, testada aqui para todos os gráficos de receitas e despesas).
