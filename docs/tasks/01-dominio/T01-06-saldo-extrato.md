# T01-06 · Saldo de conta e extrato mensal

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Contas | T01-05 | `feat/core-saldo-conta` |

**Referências:** PROMPT 3.2, 3.3, 3.4, 6.4, 11.2

## Objetivo

Criar `packages/core/src/contas/` com saldo por data, extrato mensal e cálculo de ajuste.

## Escopo

- `movimentosDeCaixa(fatos, contaId)`: todos os efeitos de caixa na conta, por tipo (3.3): receita +, despesa −, transferência − na origem e + no destino, ajuste ±, pagamento de fatura −, captação +, pagamento de dívida −, amortização −. Previstos não entram.
- `saldo(fatos, contaId, d)`:
  - `null` (indisponível) quando `d < dataSaldoInicial`
  - senão, saldo inicial + movimentos com `dataSaldoInicial < data ≤ d`
- `anteriorAoSaldoInicial(mov, conta)`: marca dos movimentos com data ≤ `dataSaldoInicial`.
- `extratoMensal(fatos, contaId, competencia)`: abertura = saldo em max(último dia do mês anterior, `dataSaldoInicial`); linhas com saldo corrente; entradas, saídas e fechamento. Meses anteriores ao saldo inicial trazem as linhas sem saldo.
- `diferencaDeAjuste(fatos, contaId, saldoReal, data)`: valor do movimento `ajuste` a gravar.
- `impactoDoNovoSaldoInicial(fatos, conta, novoValor, novaData)`: saldo atual antes e depois e quantos movimentos mudam de marca (prévia de D21).

## Fora do escopo

Indicadores agregados (T01-17) e tela (T05-09).

## Passos

1. Escrever os testes dos três primeiros critérios de 11.2.
2. Implementar.

## Critérios de aceite

- [ ] Saldo inicial R$ 1.000,00 em 31/07: despesa de R$ 200,00 em 31/07 não altera o saldo e fica marcada; despesa de R$ 200,00 em 01/08 deixa R$ 800,00; saldo em 30/07 é indisponível (11.2).
- [ ] Abertura + entradas − saídas = fechamento em todo mês; o fechamento do mês corrente até hoje = saldo atual (11.2).
- [ ] Transferência entre duas contas aparece nos dois extratos com sinais opostos.
- [ ] Movimento previsto não altera nenhum saldo.
