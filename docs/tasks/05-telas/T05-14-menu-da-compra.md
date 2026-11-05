# T05-14 · Menu de uma compra

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Cartões | T05-13 | `feat/menu-compra` |

**Referências:** PROMPT 3.6 (Operações permitidas), 4.1 (item 3), 6.5 (Menu de uma compra), 11.3 · `design/telas/CartaoFatura.dc.html`

## Objetivo

As operações da tabela 3.6, habilitadas ou desabilitadas conforme a regra, com o motivo.

## Escopo

- Menu (`DropdownMenu`) com: Editar descrição, categoria e observação · Editar valor, parcelas, data ou cartão · Lançar ajuste · Antecipar parcelas · Cancelar compra · Excluir compra.
- Estado de cada item vem de `operacoesPermitidas` (T01-08); desabilitado mostra o motivo no tooltip.
- Diálogos:
  - **Editar** (descrição, categoria, observação): vale para a compra inteira, inclusive parcelas passadas
  - **Editar valor…**: reabre Nova compra preenchida; regenera todas as parcelas
  - **Lançar ajuste**: valor positivo (encargo) ou negativo (estorno) na fatura aberta, vinculado à compra; mostra o valor efetivo (total + ajustes)
  - **Antecipar parcelas**: quantas (k últimas) e desconto opcional (vira estorno); prévia das faturas antes e depois
  - **Cancelar compra**: diálogo de confirmação (operação irreversível, 4.1 item 3) que pergunta se o banco estornou as parcelas já faturadas e, se sim, gera o estorno da soma
  - **Excluir compra**: confirmação; exclusão lógica da compra e das parcelas
- Tudo com Desfazer pelo snackbar.

## Fora do escopo

Pagamentos (T05-15).

## Passos

1. Implementar o menu e os diálogos.
2. Testes Playwright do critério de operações de 11.3.

## Critérios de aceite

- [ ] Compra com parcela em fatura fechada: "Editar valor" desabilitado com motivo; "Lançar ajuste" e "Cancelar compra" disponíveis; soma das parcelas = valor total (11.3).
- [ ] Antecipar 3 parcelas as coloca na fatura aberta e a prévia confere.
- [ ] Excluir e desfazer devolvem a compra e as parcelas (11.8).
