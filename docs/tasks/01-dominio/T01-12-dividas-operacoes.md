# T01-12 · Dívidas: parcela informada, amortização e saldo devedor

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Dívidas | T01-11 | `feat/core-dividas-operacoes` |

**Referências:** PROMPT 3.3 (dívidas), 3.7, 6.6, 11.4, 11.5 · DECISOES D3

## Objetivo

Completar `packages/core/src/dividas/` com a taxa implícita, a amortização extraordinária e os indicadores de cada dívida.

## Escopo

- `tabelaParcelaInformada(pv, pmt, n, primeiraData)`:
  - erro "As parcelas somam menos que o valor contratado" se `PMT × n < PV`
  - `PMT × n = PV` → i = 0
  - senão, taxa implícita por bisseção em [0; 1] com tolerância 1e-12; tabela com o PMT informado, juros arredondados por parcela e a última ajustada para zerar o saldo
  - devolve também a diferença da última parcela em relação ao PMT informado
- `amortizarExtraordinario(divida, parcelas, valor, data, modo: 'reduzirPrazo' | 'reduzirValor')`: novas parcelas **não pagas**; as pagas nunca mudam (D3).
- `statusParcela(parcela, hoje)`: a vencer, vencida, paga, "Paga antes do cadastro".
- `saldoDevedor(parcelas)`: SD após a última parcela paga.
- `resumoDaDivida(...)`: valor contratado, taxa (informada ou implícita), sistema, destino, total pago, juros pagos e a pagar, progresso (18/48), próxima parcela, quitação prevista.
- `despesaDaParcela(divida, parcela)`: só os juros se `creditado_em_conta`; o valor inteiro se `pago_a_terceiro` (3.3). Usada por T01-14.

## Fora do escopo

Comandos e gravação (T01-22, T03-04) e telas (T05-22 a T05-24).

## Passos

1. Testes com 11.5 e com os dois tipos de destino de 11.4.
2. Implementar.

## Critérios de aceite

- [ ] R$ 300,00 × 12 com valor contratado R$ 4.800,00 é rejeitado com a mensagem exata; R$ 450,00 × 12 é aceito com taxa implícita próxima de 1,86% a.m. (11.5).
- [ ] Amortização extraordinária com "reduzir prazo" diminui o número de parcelas; com "reduzir valor" mantém o número e reduz a parcela; parcelas pagas não mudam.
- [ ] Empréstimo creditado em conta: só juros contam como despesa; financiamento pago a terceiro: a parcela inteira (11.4).
- [ ] Após a amortização, saldo final continua exatamente R$ 0,00.
