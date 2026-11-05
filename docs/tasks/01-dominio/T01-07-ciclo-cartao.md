# T01-07 · Ciclo do cartão e atribuição de compra à fatura

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Cartões | T01-05 | `feat/core-ciclo-cartao` |

**Referências:** PROMPT 3.5 (Ciclo, Atribuição, Mudança de ciclo), 3.11, 11.3

## Objetivo

Criar `packages/core/src/cartoes/ciclo.ts`: datas de cada fatura e em qual fatura cai uma compra.

## Escopo

- `cicloVigente(ciclos, competencia)`: versão de `CartaoCiclo` com maior `vigenteDesde` ≤ competência.
- `datasDaFatura(cartao, ciclos, competencia)` → `{ fechamento, vencimento }`:
  - vencimento = dia V de M (ajustado por 3.11)
  - fechamento = dia F de M se F < V, ou dia F de M−1 se F ≥ V (ajustado por 3.11)
- `faturaDaCompra(cartao, ciclos, dataCompra)` → competência M tal que fechamento(M−1) ≤ data < fechamento(M). Compra no dia do fechamento vai para a fatura seguinte.
- `faturaAberta(cartao, ciclos, hoje)`: a fatura que recebe compras hoje.
- `primeiraFaturaNaoFechada(cartao, ciclos, hoje)`: a partir de qual fatura vale uma mudança de ciclo (3.5).
- `previaDoCadastro(F, V, hoje)`: "Compras feitas hoje caem na fatura que vence em …" (6.5, D21).
- Mudança de ciclo nunca recalcula competências já gravadas em parcelas: a função recebe só datas e devolve competência; quem grava é a etapa 2.

## Fora do escopo

Saldo e status da fatura (T01-09).

## Passos

1. Testes com os cenários de 11.3 e casos de virada de ano.
2. Implementar.

## Critérios de aceite

- [ ] Cartão A (fecha 3, vence 10): compra em 02/11 → fatura que vence 10/11; em 03/11 → 10/12 (11.3).
- [ ] Cartão B (fecha 25, vence 5): compra em 24/11 → vence 05/12; em 25/11 → 05/01 (11.3).
- [ ] Fechamento no dia 31: em fevereiro fecha no dia 28 (29 em ano bissexto) (11.3).
- [ ] Compra em 28/12 num cartão que fecha dia 25 e vence dia 5 cai na fatura de fevereiro do ano seguinte.
- [ ] Com uma nova versão do ciclo vigente desde 2027-01, faturas de 2026 mantêm as datas antigas.
