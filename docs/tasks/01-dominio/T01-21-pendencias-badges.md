# T01-21 · Pendências e badges do menu

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-15 | `feat/core-pendencias` |

**Referências:** PROMPT 5.1 (Badges), 6.2 (Pendências), 6.3 ("A classificar")

## Objetivo

Calcular no core o card Pendências e os números dos badges do menu.

## Escopo

- `pendencias(derivado, hoje)` → itens com tipo, texto, valor, data e ação:
  - rendas atrasadas → "Confirmar"
  - gastos fixos vencidos ou vencendo em até 3 dias → "Pagar" (conta) ou "Confirmar no cartão"
  - faturas fechadas ou vencidas → "Pagar fatura"
  - parcelas de dívida vencidas → "Registrar pagamento"
  - ordenados por data
- `podeConfirmarTodos(pendencias)`: só recorrências entram em "Confirmar todos".
- `badges(derivado, hoje)`:
  - Gastos fixos: vencidos + vencendo em até 3 dias
  - Rendas fixas: atrasadas
  - Cartões: faturas vencidas
  - Lançamentos: itens em "A classificar"

## Fora do escopo

Card e menu na tela (T05-16, T04-05).

## Passos

1. Testes com o seed de T01-19 em datas diferentes (antes e depois do dia 20, para o Freelance).
2. Implementar.

## Critérios de aceite

- [ ] Com o seed e hoje = 04/11/2026, os badges batem com os itens que geram cada um.
- [ ] Gasto fixo que vence daqui a 3 dias entra; daqui a 4 dias não entra.
- [ ] Fatura aberta não gera pendência.
