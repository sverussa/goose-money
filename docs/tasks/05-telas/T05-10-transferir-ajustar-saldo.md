# T05-10 · Diálogos Transferir e Ajustar saldo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Contas | T05-09, T05-03 | `feat/transferir-ajustar` |

**Referências:** PROMPT 3.4 (Ajuste), 3.10 (transferências), 4.1 (item 5), 7.4 · DESIGN-HANDOFF 7 (diálogos não desenhados)

## Objetivo

Os dois diálogos da tela de conta.

## Escopo

- **Transferir** (a partir do extrato): reaproveita o tipo Transferência do formulário de lançamento (T05-03), com a conta da tela como origem.
- **Ajustar saldo**: o usuário informa o saldo real e a data; o diálogo mostra antes de salvar o saldo calculado, o informado e a diferença (`diferencaDeAjuste`, T01-06); salvar grava um movimento `ajuste` dessa diferença. Diferença zero desabilita o botão com a frase "O saldo já confere".
- O ajuste aparece só no extrato e em Movimentações, nunca em Receitas e despesas (3.3).
- Visual seguindo o diálogo de `LancarDialog.dc.html` (não desenhados).

## Fora do escopo

Regras de cálculo (core).

## Passos

1. Implementar os diálogos.
2. Testes Playwright com a linha "Ajuste de saldo" de 7.4.

## Critérios de aceite

- [ ] Ajuste de diferença d: Saldo em contas ±d, Previsto ±d, Patrimônio ±d, Resultado inalterado (7.4).
- [ ] O ajuste não aparece na visão Receitas e despesas.
- [ ] A diferença mostrada é a mesma gravada.
