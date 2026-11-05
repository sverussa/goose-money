# T01-10 · Indicadores do cartão e cartão já em uso

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Cartões | T01-09 | `feat/core-indicadores-cartao` |

**Referências:** PROMPT 3.5 (Indicadores do cartão, Cartão cadastrado já em uso), 6.2 (aba Cartões), 6.5, D21, 11.3

## Objetivo

Calcular, por cartão, o que se deve agora, o que se deve no total e quanto limite sobra.

## Escopo

- `aPagarNoCartao(faturas)`: saldos das faturas vencidas, fechadas e da aberta.
- `obrigacoesDoCartao(faturas)`: saldos de todas as faturas não pagas e não transportadas, incluindo futuras, menos créditos.
- `limiteDisponivel(cartao, obrigacoes)` = limite − max(0, obrigações).
- `parcelasRestantes(compra, parcelas, ultimaFaturaFechada)` (informativo).
- `comprasParceladasAtivas(fatos, hoje)`: linhas da tabela da aba Cartões (descrição, cartão, parcela atual "3/10", valor da parcela, restantes, valor restante, competência da última) e o total do rodapé.
- `parcelasComprometidas(fatos, hoje, meses = 12)`: série por cartão e competência para o gráfico de barras empilhadas (8.1).
- **Cartão já em uso:** `primeiraFaturaControlada(cartao)` = a aberta na data do cadastro; parcelas com competência anterior ficam "Paga antes do cadastro" e saem de saldo e indicadores; o item "Saldo anterior ao cadastro" entra em A pagar e Obrigações.
- Gastos fixos previstos no cartão **nunca** entram nestes indicadores.
- `podeArquivarCartao(...)` e `podeExcluirCartao(...)` com o motivo (D21).

## Fora do escopo

Somatório global (T01-17).

## Passos

1. Testes com os critérios de 11.3 e o cenário de cartão já em uso.
2. Implementar.

## Critérios de aceite

- [ ] Compra de R$ 1.000,00 em 3x reduz o **Limite disponível** em R$ 1.000,00 (11.3).
- [ ] Compra de R$ 1.200,00 em 12x: Obrigações +R$ 1.200,00; A pagar +R$ 100,00 (11.3).
- [ ] Cartão cadastrado em 04/11 com fatura fechada a pagar de R$ 900,00 e compra antiga em 12x: os critérios de cartão já em uso de 11.3 passam.
- [ ] Arquivar com Obrigações > 0 é negado com motivo; excluir com compras é negado (11.3).
