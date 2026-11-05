# T01-08 · Compras parceladas: geração, invariantes e operações

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Cartões | T01-02, T01-07 | `feat/core-compras` |

**Referências:** PROMPT 3.6, 6.5 (Nova compra, Menu de uma compra), 11.3

## Objetivo

Criar `packages/core/src/cartoes/compras.ts`: gerar parcelas, validar invariantes e dizer quais operações uma compra aceita.

## Escopo

- `gerarParcelas(compra, cartao, ciclos)`: rateio com resto na 1ª (T01-02); a parcela k cai na competência da 1ª + (k − 1) meses. Aceita entrada por valor total ou por valor da parcela (alternância da tela Nova compra): valor da parcela × n = valor total.
- `validarInvariantes(compra, parcelas)`: as 4 invariantes de 3.6 (soma = total; quantidade = n numerada de 1 a n; competências em ordem não decrescente; descrição e categoria só na compra). Devolve a lista de violações.
- `operacoesPermitidas(compra, parcelas, faturas, hoje)` → para cada operação da tabela 3.6 (`editarDescricao`, `editarValor`, `lancarAjuste`, `anteciparParcelas`, `cancelar`, `excluir`): `{ permitida: boolean; motivo?: string }`, com o motivo em texto pronto para o tooltip.
- `anteciparParcelas(compra, parcelas, k, faturaAberta, desconto?)`: move as k últimas para a fatura aberta; desconto vira estorno.
- `cancelarCompra(...)`: quais parcelas sair (faturas não fechadas) e, se o banco estornou, o estorno da soma das já faturadas.
- `previaDaCompra(...)`: lista "1/10 · R$ 420,00 · fatura de dez/2026" e o novo **Limite disponível** (usa T01-10).

## Fora do escopo

Comandos e gravação (T01-22, T03-04) e as telas (T05-13, T05-14).

## Passos

1. Testes por operação, com e sem parcela em fatura fechada.
2. Implementar.

## Critérios de aceite

- [ ] R$ 1.000,00 em 3x gera 333,34 + 333,33 + 333,33 em faturas consecutivas (11.3).
- [ ] Com parcela em fatura fechada: `editarValor` não permitido, com motivo; `lancarAjuste` e `cancelar` permitidos; a soma das parcelas continua igual ao total (11.3).
- [ ] Antecipar as 3 últimas de 10 move exatamente 3 parcelas para a fatura aberta, sem mudar a soma.
- [ ] `validarInvariantes` acusa cada uma das 4 violações quando provocadas.
