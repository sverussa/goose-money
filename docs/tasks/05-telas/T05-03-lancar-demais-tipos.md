# T05-03 · Formulário de lançamento: compra no cartão, transferência e pagamento de fatura

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Lançar | T05-02 | `feat/lancar-tipos` |

**Referências:** PROMPT 3.4, 3.5, 6.5 (Pagar fatura), 7.1, 7.2, 7.4, 11.1 · `design/telas/LancarDialog.dc.html` · DECISOES D21

## Objetivo

Completar os chips de tipo do formulário de lançamento.

## Escopo

- **Compra no cartão** (à vista): cartão (padrão: o da tela ou o último usado), valor, descrição, categoria, data; mostra em qual fatura cai ("fatura de dez/2026", T01-07). Parcelado abre o diálogo Nova compra (T05-13) com os campos já preenchidos.
- **Transferência**: conta de origem e de destino (diferentes), valor, data; aviso quando as duas têm `incluirNoTotal` diferentes ("O Saldo em contas vai cair R$ X", 3.10).
- **Pagamento de fatura**: cartão, conta (padrão: a de pagamento do cartão), valor ("Saldo total" ou outro), data e fatura de destino (padrão por 3.5); prévia do que acontece (saldo restante ou crédito, T01-09).
- Sem cartão cadastrado: escolher "Compra no cartão" ou "Pagamento de fatura" leva ao cadastro de cartão (D21).
- Troca de chip mantém valor e data já digitados.

## Fora do escopo

Encargo e estorno (T05-15).

## Passos

1. Implementar cada tipo com seu schema de formulário.
2. Testes Playwright com as linhas correspondentes de 7.4.

## Critérios de aceite

- [ ] Na tela de um cartão, compra à vista naquele cartão em 3 interações (11.1).
- [ ] Transferência de incluída para excluída: Saldo em contas −v, Resultado e Patrimônio inalterados (7.4, 11.2).
- [ ] Pagamento integral de fatura que vence no mês: Saldo em contas −v, A pagar −v, Resultado inalterado (11.3).
- [ ] Transferência com origem igual ao destino é bloqueada no formulário.
