# T01-11 · Dívidas: tabelas Price, SAC e taxa zero

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Dívidas | T01-02, T01-03 | `feat/core-dividas-tabelas` |

**Referências:** PROMPT 2.2, 3.7, 11.5 · DESIGN-HANDOFF 6 (item 6)

## Objetivo

Criar `packages/core/src/dividas/tabelas.ts`: gerar a tabela de amortização exatamente como a spec define o arredondamento.

## Escopo

- `tabelaPrice(pv, i, n, primeiraData)`:
  - `PMT = round(PV × i ÷ (1 − (1 + i)^−n))`, arredondado uma vez
  - para cada k: `J = round(SD × i)`, `A = PMT − J`, `SD = SD − A`
  - última: `A(n) = SD(n−1)` e parcela = `SD(n−1) + J(n)`, de modo que `SD(n) = 0` exatamente
- `tabelaSac(pv, i, n, primeiraData)`: `A(k)` = parte inteira de PV ÷ n para k < n; `A(n) = SD(n−1)`; `J = round(SD × i)`.
- Taxa zero (Price ou SAC): sem fórmula; rateio com o resto na **última** (T01-02); juros zero.
- Datas de vencimento mês a mês a partir da 1ª, com dia ajustado (3.11).
- Todo intermediário em `Decimal`; conversão para centavos só nos pontos marcados (`paraCentavos`).
- Cada linha: número, vencimento, parcela, juros, amortização, saldo devedor.

## Fora do escopo

Parcela informada e amortização extraordinária (T01-12).

## Passos

1. Testes com os critérios de 11.5 e o valor do handoff.
2. Implementar.

## Critérios de aceite

- [ ] Price R$ 40.000,00, 1,49% a.m., 48x: saldo final exatamente R$ 0,00, com a diferença de centavos na última parcela (11.5).
- [ ] O mesmo caso dá parcela de R$ 1.172,49 da 1ª à 47ª, saldo devedor de R$ 1.155,49 antes da última, juros de R$ 17,22 e última parcela de R$ 1.172,71 (conferido contra o design em 05/11/2026, handoff 6, item 6).
- [ ] Taxa zero, R$ 1.200,00 em 12x: 12 × R$ 100,00, juros zero, sem divisão por zero (11.5).
- [ ] Taxa zero, R$ 1.000,00 em 3x: 333,33 + 333,33 + 333,34 (11.5).
- [ ] Em toda tabela, soma das amortizações = PV (invariante de D3).
