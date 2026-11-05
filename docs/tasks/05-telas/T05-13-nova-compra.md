# T05-13 · Nova compra (à vista ou parcelada)

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Cartões | T05-12, T01-08 | `feat/nova-compra` |

**Referências:** PROMPT 3.6, 4.1 (itens 4, 5), 6.5 (Nova compra), 7.4, 11.3 · `design/telas/NovaCompra.dc.html`

## Objetivo

O diálogo de compra no cartão com parcelamento e prévia, como no design.

## Escopo

- Campos: valor, descrição, categoria, data e toggle "Parcelado".
- Ao ligar "Parcelado": seletor de número de parcelas e alternância "Valor total" / "Valor da parcela".
- Prévia ao vivo (`previaDaCompra`, T01-08): uma linha por parcela, "1/10 · R$ 420,00 · fatura de dez/2026", e o novo **Limite disponível**.
- Painel "O que muda ao salvar": efeitos nos indicadores da Barra (A pagar, Resultado do mês, Previsto, Patrimônio), calculados pelo core aplicando o comando sobre os fatos (sem conta no componente).
- "Salvar" e "Salvar e lançar outro"; gravação de compra + parcelas num único comando (T01-22).
- Compra feita antes do cadastro do cartão: parcelas anteriores à primeira fatura controlada aparecem na prévia como "Paga antes do cadastro" (3.5).

## Fora do escopo

Editar compra existente (T05-14).

## Passos

1. Montar o diálogo.
2. Testes Playwright com as linhas de compra de 7.4 e 11.3.

## Critérios de aceite

- [ ] R$ 1.000,00 em 3x mostra 333,34 + 333,33 + 333,33 em faturas consecutivas e reduz o Limite disponível em R$ 1.000,00 (11.3).
- [ ] R$ 1.200,00 em 12x: Patrimônio e Obrigações −R$ 1.200,00; A pagar −R$ 100,00 (11.3).
- [ ] Alternar para "Valor da parcela" e digitar R$ 420,00 em 10x dá total de R$ 4.200,00.
- [ ] Desfazer remove a compra e todas as parcelas.
