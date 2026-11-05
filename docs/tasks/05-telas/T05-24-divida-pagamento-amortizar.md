# T05-24 · Registrar pagamento e amortizar dívida

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Dívidas | T05-22 | `feat/divida-pagamentos` |

**Referências:** PROMPT 3.3, 3.7, 4.3 (Microcopy), 7.4 (Pagar parcela de dívida), 11.4 · DESIGN-HANDOFF 7 (diálogos não desenhados)

## Objetivo

Os dois diálogos do detalhe da dívida e a ligação com a pendência do Painel.

## Escopo

- **Registrar pagamento**: parcela (padrão: a vencida mais antiga ou a próxima), conta (padrão: a de débito), valor (padrão: o da parcela), data (padrão: hoje). Gera `pagamento_divida` na conta e marca a parcela paga.
- **Amortizar**: valor, data, conta e modo "Reduzir prazo" (padrão) ou "Reduzir valor da parcela"; prévia antes de salvar com o número de parcelas e o valor novo (`amortizarExtraordinario`, T01-12). Para dívida paga a terceiro, avisa que o valor conta como despesa (3.3).
- A pendência "Registrar pagamento" do Painel (T05-16) abre este diálogo com a parcela já escolhida.

## Fora do escopo

Cadastro (T05-23).

## Passos

1. Implementar os dois diálogos.
2. Testes Playwright com a linha "Pagar parcela de dívida" de 7.4 e os critérios de 11.4.

## Critérios de aceite

- [ ] Pagar parcela: Saldo em contas −v; Resultado do mês inalterado; Patrimônio −juros da parcela (7.4).
- [ ] Empréstimo creditado em conta: só os juros entram em Despesas; financiamento pago a terceiro: a parcela inteira; nenhum pagamento muda o Resultado (11.4).
- [ ] Amortizar com "Reduzir prazo" mostra menos parcelas na prévia e na tabela depois de salvar.
