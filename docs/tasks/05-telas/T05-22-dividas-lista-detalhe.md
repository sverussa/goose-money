# T05-22 · Dívidas: lista e detalhe

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Dívidas | T04-08, T01-12 | `feat/dividas-detalhe` |

**Referências:** PROMPT 3.7, 6.6 (Lista, Detalhe), 8.1 · `design/telas/DividaDetalhe.dc.html`

## Objetivo

`#/dividas` e `#/dividas/:id`, como no design.

## Escopo

- **Lista**: cabeçalho de contexto com **Saldo devedor de dívidas** e parcelas a vencer no mês; botão "Nova dívida" (abre T05-23); cards por dívida com credor, tipo, saldo devedor, progresso (18/48 com `Progress`), próxima parcela, quitação prevista.
- **Detalhe**:
  - resumo do contrato (`resumoDaDivida`, T01-12): valor contratado, taxa informada ou implícita (com tooltip explicando), sistema (tooltip para SAC e Price, 1.2), destino do valor, total pago, juros pagos e a pagar
  - gráfico Saldo devedor (linha decrescente) e gráfico Juros × amortização (barras empilhadas por parcela); clique leva à linha da tabela
  - tabela de amortização com número, vencimento, parcela, juros, amortização, saldo e `StatusChip` (a vencer, vencida, paga, "Paga antes do cadastro")
  - ações "Registrar pagamento" e "Amortizar" (T05-24); menu com "Excluir dívida" (exclusão lógica da dívida e das parcelas)
- Título-conclusão dos gráficos gerado pelo core ("Faltam R$ 31,1 mil, zerando em ago/2029").

## Fora do escopo

Cadastro (T05-23), diálogos de pagamento (T05-24).

## Passos

1. Montar lista e detalhe.
2. Teste Playwright do clique no gráfico levando à linha da tabela.

## Critérios de aceite

- [ ] Com o seed, a tabela do financiamento mostra 12 parcelas "Paga antes do cadastro".
- [ ] Clique num ponto do gráfico rola e destaca a linha da parcela.
- [ ] Saldo devedor da lista = soma dos saldos de cada dívida.
