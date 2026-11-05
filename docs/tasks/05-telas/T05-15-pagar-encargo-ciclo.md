# T05-15 · Pagar fatura, encargo ou estorno, configurar ciclo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Cartões | T05-12 | `feat/fatura-acoes` |

**Referências:** PROMPT 3.5, 6.5 (Pagar fatura, Configurar ciclo), 11.3 · `design/telas/CartaoFatura.dc.html` (painel Pagar fatura) · DESIGN-HANDOFF 7

## Objetivo

As três ações da fatura além da nova compra.

## Escopo

- **Pagar fatura** (painel do design): conta (padrão: a de pagamento do cartão), valor ("Saldo total" ou "Outro valor"), data, fatura de destino (padrão por 3.5, `destinoPadraoDoPagamento`); antes de salvar mostra o saldo restante ou o crédito para a próxima fatura (`previaDoPagamento`, T01-09). Botão "Registrar pagamento".
- **Lançar encargo ou estorno** (não desenhado): tipo (juros, multa, anuidade → encargo; estorno), valor, data, compra vinculada opcional (estorno), categoria ("Juros e encargos" ou "Tarifas" para encargos). Cai na fatura da data.
- **Configurar ciclo** (não desenhado): novos dias de fechamento e vencimento; mostra a partir de qual fatura valem (`primeiraFaturaNaoFechada`, T01-07) e avisa que faturas fechadas e parcelas existentes não mudam.
- Ao transportar saldo (pagamento parcial), sugestão de lançar os juros do rotativo como encargo (3.5): banner na fatura seguinte com o botão "Lançar juros".

## Fora do escopo

Menu da compra (T05-14).

## Passos

1. Implementar os três diálogos.
2. Testes Playwright de pagamento parcial e excedente (11.3).

## Critérios de aceite

- [ ] Pagamento de R$ 600,00 numa fatura de R$ 1.000,00: prévia mostra R$ 400,00 restantes; chip "Paga parcialmente" (11.3).
- [ ] Pagamento de R$ 550,00 numa de R$ 500,00: prévia mostra crédito de R$ 50,00; nenhuma receita reconhecida (11.3).
- [ ] Mudar o fechamento não move parcelas nem altera faturas fechadas (11.3).
