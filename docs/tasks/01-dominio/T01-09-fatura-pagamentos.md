# T01-09 · Saldo da fatura, status, pagamentos e transporte

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Cartões | T01-08 | `feat/core-faturas` |

**Referências:** PROMPT 3.5 (Saldo, Status, Pagamentos), 6.5 (Pagar fatura), 11.3

## Objetivo

Criar `packages/core/src/cartoes/faturas.ts`: montar cada fatura com seus itens, saldo e status, e alocar pagamentos.

## Escopo

- `montarFaturas(fatos, cartaoId, hoje)` → lista ordenada de faturas com competência, datas, itens (parcelas, encargos, estornos, ajustes, "Saldo anterior não pago", "Crédito de pagamento", "Saldo anterior ao cadastro"), pagamentos alocados, saldo e status.
- Saldo da fatura M = parcelas M + encargos − estornos + saldo transportado de M−1 − crédito transportado de M−1 − pagamentos alocados a M.
- Status: Futura, Aberta, Fechada, Vencida, Paga, Transportada; chip extra "Paga parcialmente" (pagamento e saldo > 0).
- **Transporte de saldo** e **crédito de pagamento** calculados no Motor a partir das datas e dos pagamentos, sem gravar nada (D38).
- `destinoPadraoDoPagamento(faturas)`: fatura vencida ou fechada mais antiga com saldo; senão, a aberta.
- `previaDoPagamento(faturas, destino, valor)`: saldo restante, ou crédito para a próxima fatura (6.5).
- `itensPrevistosNaFatura(fatos, cartaoId, competencia, hoje)`: gastos fixos no cartão ainda não confirmados, separados do saldo (decisão de design 4 do handoff).
- Itens de fatura nunca são receita nem despesa aqui; o reconhecimento é T01-14.

## Fora do escopo

Indicadores do cartão (T01-10).

## Passos

1. Testes com os cenários de pagamento de 11.3.
2. Implementar.

## Critérios de aceite

- [ ] Fatura de R$ 1.000,00 com pagamento de R$ 600,00: saldo R$ 400,00 e "Paga parcialmente"; no fechamento seguinte, R$ 400,00 viram "Saldo anterior não pago" e a antiga fica "Transportada" com saldo zero (11.3).
- [ ] Fatura de R$ 500,00 paga com R$ 550,00: "Paga" e crédito de −R$ 50,00 na seguinte (11.3).
- [ ] Pagamento sem destino escolhido vai para a fatura vencida mais antiga com saldo.
- [ ] Gasto fixo previsto no cartão aparece na fatura certa e não entra no saldo.

## Decisão tomada

**D1. Transporte de saldo e crédito de pagamento** (respondida pelo Saulo em 05/11/2026): derivados no Motor (opção A). Registrada em `DECISOES.md` D38.
