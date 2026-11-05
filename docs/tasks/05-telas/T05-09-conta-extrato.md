# T05-09 · Extrato mensal da conta

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Contas | T05-08, T01-06, T03-07 | `feat/conta-extrato` |

**Referências:** PROMPT 3.4, 6.4, 11.2 · `design/telas/ContaExtrato.dc.html` · DESIGN-HANDOFF 7 (chips fixos, falta Exportar CSV)

## Objetivo

`#/contas/:id` com o extrato do mês, como no design.

## Escopo

- Seletor de conta com chips das **contas ativas** (não as 4 fixas do design), na ordem da lista.
- `MonthSelector` na top app bar.
- Cabeçalho fixo: saldo de abertura, entradas, saídas, saldo de fechamento e saldo atual (`extratoMensal`, T01-06).
- Tabela: data, descrição, categoria ou tipo, valor (`MoneyText`) e saldo corrente; movimentos anteriores ao saldo inicial com o chip "Anterior ao saldo inicial"; meses anteriores ao saldo inicial sem a coluna de saldo e com "—" e tooltip "Antes do saldo inicial informado".
- Ações: Lançar (conta pré-selecionada, T05-02), Transferir e Ajustar saldo (T05-10), **Exportar CSV** do mês (por `salvarArquivo`, T03-07).
- Conta arquivada: extrato só para leitura, sem ações de gravação.

## Fora do escopo

Lista e formulário (T05-08).

## Passos

1. Montar a tela.
2. Testes Playwright: abertura + entradas − saídas = fechamento; o FAB nesta tela já vem com a conta.

## Critérios de aceite

- [ ] O fechamento do mês corrente até hoje é igual ao saldo atual (11.2).
- [ ] Os chips mostram as contas cadastradas, inclusive uma criada agora.
- [ ] O CSV exportado tem as mesmas linhas e totais da tela.
- [ ] O FAB nesta tela abre Despesa com esta conta (7.2).
