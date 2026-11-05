# T05-18 · Painel › Saldos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T05-16, T04-08 | `feat/painel-saldos` |

**Referências:** PROMPT 3.10, 6.2 (Saldos), 8.1 · `design/telas/PainelSaldos.dc.html` · DESIGN-HANDOFF 6 (item 5)

## Objetivo

A aba Saldos, como no design.

## Escopo

- Destaque do **Patrimônio líquido** de hoje com a decomposição visível: Saldo em todas as contas − Obrigações de cartão − Saldo devedor de dívidas.
- Frase explicativa quando o patrimônio é negativo, como no design: explica que dívidas e compras parceladas somam mais que o saldo das contas e aponta a parcela que mais pesa, vinda do core (D47).
- Cards por conta: saldo atual, variação no mês, sparkline de 30 dias, marca "Fora do total".
- Gráficos (8.1):
  - Composição do saldo por conta (barras horizontais), hoje; clique abre o extrato da conta no mês corrente
  - Evolução do saldo e do patrimônio (linhas no fim de cada mês), período do seletor; sem navegação, tooltip com a composição do ponto
- `PeriodPicker` desta aba (lembrado por aba).

## Fora do escopo

Contas (T05-08).

## Passos

1. Montar a aba.
2. Teste Playwright do clique na barra de uma conta.

## Critérios de aceite

- [ ] A decomposição soma exatamente o Patrimônio líquido mostrado na Barra.
- [ ] Conta fora do total aparece com a marca e entra em "Saldo em todas as contas".
- [ ] Clique numa barra abre o extrato daquela conta no mês corrente.

## Decisão tomada

**D1. Patrimônio negativo** (respondida pelo Saulo em 05/11/2026): frase com a causa (opção A). Registrada em `DECISOES.md` D47.
