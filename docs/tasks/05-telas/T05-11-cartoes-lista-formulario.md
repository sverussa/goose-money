# T05-11 · Cartões: lista, formulário e menu

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Cartões | T05-08, T01-10 | `feat/cartoes-lista` |

**Referências:** PROMPT 3.5 (Cartão cadastrado já em uso), 6.5, 11.3 · DECISOES D21 · `design/telas/PainelCartoes.dc.html` (face do cartão) · DESIGN-HANDOFF 7

## Objetivo

`#/cartoes` com a lista de cartões, o cadastro (inclusive de cartão já em uso), a edição, o arquivamento e a exclusão.

## Escopo

- **Lista** (não desenhada; usar a face do cartão de `PainelCartoes.dc.html`):
  - cabeçalho de contexto com **A pagar nos cartões**, **Obrigações de cartão** e o botão "Novo cartão"
  - cards no estilo cartão físico, na cor escolhida, com nome, fatura aberta, vencimento e barra de limite (`Progress`); clique abre a fatura
  - arquivados recolhidos no fim, com a contagem
- **Formulário** (diálogo): campos e regras da tabela de 6.5 (D21):
  - nome, instituição, cor (paleta), limite, dia de fechamento, dia de vencimento, conta de pagamento (só contas ativas e incluídas no total)
  - prévia "Compras feitas hoje caem na fatura que vence em dd/mm/aaaa" e datas da fatura aberta (`previaDoCadastro`, T01-07)
  - campo opcional "Saldo da fatura fechada a pagar", só no cadastro, com explicação curta de que vira "Saldo anterior ao cadastro" e não é despesa
- **Editar**: nome, instituição, cor, limite e conta de pagamento; mostra o novo **Limite disponível** antes de salvar. Os dias do ciclo só por "Configurar ciclo" (T05-15).
- **Menu do cartão**: Editar, Configurar ciclo, Arquivar, Desarquivar, Excluir, com motivo quando desabilitado.

## Fora do escopo

Fatura (T05-12).

## Passos

1. Montar a lista e o formulário.
2. Testes Playwright dos critérios de cartões de 11.3.

## Critérios de aceite

- [ ] Três cartões cadastrados: A pagar e Obrigações somam os três (11.3).
- [ ] Cadastro com fatura fechada a pagar de R$ 900,00: o valor entra em A pagar e Obrigações e não entra em Despesas (11.3).
- [ ] Arquivar com Obrigações > 0 e excluir com compras ficam desabilitados com motivo (11.3).
- [ ] A conta de pagamento só lista contas ativas e incluídas no total.
