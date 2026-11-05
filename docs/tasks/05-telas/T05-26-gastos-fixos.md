# T05-26 · Gastos fixos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Recorrências | T05-25 | `feat/gastos-fixos` |

**Referências:** PROMPT 3.8, 3.10 (Comprometimento da renda), 6.8, 7.4, 11.4, 11.6 · `design/telas/GastosFixos.dc.html`

## Objetivo

`#/gastos-fixos`, como no design, reaproveitando o formulário de Rendas.

## Escopo

- `MonthSelector` e cabeçalho de contexto: previsto no mês, pago, a pagar, vencido e **Comprometimento da renda** (`resumoGastos`, T01-13; indicador de T01-17).
- Botão "Novo gasto fixo" no cabeçalho.
- Lista por data: descrição, valor, dia, forma de pagamento (conta ou cartão), `StatusChip`; ação principal "Pagar" (em conta) ou "Confirmar no cartão" (cria compra à vista que cai na fatura pelo ciclo, 3.8); menu com "Ignorar este mês", "Editar", "Excluir".
- Formulário igual ao de Rendas (componente compartilhado), com forma de pagamento: conta ou cartão; para cartão, mostra em qual fatura o gasto do mês vai cair.
- A pendência "Pagar" ou "Confirmar no cartão" do Painel (T05-16) abre este diálogo.

## Fora do escopo

Confirmação automática (T03-06).

## Passos

1. Montar a tela.
2. Testes Playwright: confirmar o Streaming no cartão; Energia no dia 31 aparece no dia 30 em novembro.

## Critérios de aceite

- [ ] Confirmar gasto em conta pelo valor previsto: Saldo em contas −v; Previsto inalterado (7.4).
- [ ] Streaming no cartão confirmado vira compra na fatura certa e sai da lista de previstos da fatura (11.4).
- [ ] Gasto do dia 31 aparece no dia 30 em novembro (11.6).
