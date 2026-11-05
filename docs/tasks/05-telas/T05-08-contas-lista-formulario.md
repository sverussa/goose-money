# T05-08 · Contas: lista, formulário e menu

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Contas | T04-07, T01-22 | `feat/contas-lista` |

**Referências:** PROMPT 6.4, 7.2 (primeiro uso), 11.2 · DECISOES D21 · DESIGN-HANDOFF 7 (lista e formulário não desenhados)

## Objetivo

`#/contas` com a lista de contas, o cadastro, a edição, o arquivamento e a exclusão.

## Escopo

- **Lista** (não desenhada; seguir o vocabulário de `PainelSaldos.dc.html` e `ContaExtrato.dc.html`):
  - cabeçalho de contexto com **Saldo em contas**, **Saldo em todas as contas** e o botão "Nova conta"
  - cards por conta: nome, tipo, instituição, saldo atual, marca "Fora do total"; clique abre o extrato
  - arquivadas recolhidas no fim, com a contagem
- **Formulário** (diálogo): campos e regras da tabela de 6.4 (D21); para o tipo investimento, "Incluir no total" vem desmarcado; explicação "saldo no fim deste dia" na data do saldo inicial.
- **Editar**: mudar saldo inicial ou data mostra a prévia (`impactoDoNovoSaldoInicial`, T01-06) antes de salvar; desmarcar "Incluir no total" da conta de pagamento de cartão ativo é bloqueado com motivo.
- **Menu da conta**: Editar, Arquivar, Desarquivar, Excluir, com itens desabilitados e motivo no tooltip (regras de D21, construtores de T01-22).
- Primeiro uso: sem contas, a tela mostra `EmptyState` "Cadastre sua primeira conta" e o FAB leva ao formulário (7.2).

## Fora do escopo

Extrato (T05-09), Transferir e Ajustar saldo (T05-10).

## Passos

1. Montar a lista e o formulário.
2. Testes Playwright dos critérios de contas de 11.2.

## Critérios de aceite

- [ ] Várias contas de todos os tipos são cadastradas; nome repetido entre contas ativas é rejeitado (11.2).
- [ ] Arquivar com saldo diferente de zero ou sendo conta de pagamento de cartão ativo fica desabilitado com motivo; com saldo zero, a conta sai dos indicadores e "Desarquivar" a traz de volta (11.2).
- [ ] Excluir conta com movimentos fica desabilitado e oferece "Arquivar" (11.2).
- [ ] Desmarcar "Incluir no total" da conta de pagamento de cartão ativo é bloqueado (11.2).
