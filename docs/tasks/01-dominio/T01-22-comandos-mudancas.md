# T01-22 · Comandos: mudanças e inversas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Comandos | T01-08, T01-09, T01-12, T01-13 | `feat/core-comandos` |

**Referências:** PROMPT 2.1 (gravações compostas), 3.6, 7.1, 9.4 · DECISOES D14, D15, D22

## Objetivo

Criar `packages/core/src/comandos/`: cada ação do usuário vira uma lista de mudanças de domínio (criar, alterar, excluir logicamente) e a lista inversa, usada pelo Desfazer. O app só executa essas listas (T03-04); nenhuma regra de negócio fica no app ou no banco.

## Escopo

- Tipo `Mudanca`: `{ entidade, acao: 'criar' | 'alterar' | 'excluir', id, dados? }`. `excluir` é sempre lógico (`isDeleted = true`).
- Tipo `Comando`: `{ mudancas: Mudanca[]; inversas: Mudanca[]; descricao: string }`. A `descricao` alimenta o snackbar ("Lançado", "Compra excluída"…).
- Inversas: criar ↔ excluir; alterar ↔ alterar com os valores anteriores; excluir ↔ alterar `isDeleted = false` (9.4).
- Um construtor por ação, validando antes com as regras do contexto:
  - lançamentos: criar, editar e excluir receita/despesa; transferência; ajuste de saldo; classificar
  - contas e cartões: criar, editar, arquivar, desarquivar, excluir (com as permissões de D21); configurar ciclo; cartão já em uso
  - compras: nova compra (à vista e parcelada), editar, lançar ajuste, antecipar, cancelar, excluir (3.6)
  - faturas: pagar fatura com alocação, encargo, estorno
  - dívidas: contratar (com parcelas gravadas), registrar pagamento, amortizar, excluir
  - recorrências: criar, nova versão, confirmar, ignorar, confirmar em lote
  - categorias e preferências
- Construtor rejeita com erro de domínio (mensagem pronta para a tela) quando a regra não permite, por exemplo "Arquivar exige saldo zero".
- Cada construtor tem teste: aplicar `mudancas` e depois `inversas` sobre os fatos devolve os fatos originais.

## Fora do escopo

Execução no banco (T02-02, T03-04).

## Passos

1. Definir os tipos e a função `aplicar(fatos, mudancas)` (usada nos testes e na atualização do cache).
2. Escrever os construtores por contexto, um PR por contexto se ficar grande.

## Critérios de aceite

- [ ] Para todo construtor, `aplicar(aplicar(f, c.mudancas), c.inversas)` é igual a `f`.
- [ ] Nova compra em 10x gera 1 compra + 10 parcelas num único comando.
- [ ] Excluir compra parcelada exclui a compra e todas as parcelas no mesmo comando (11.8).
- [ ] Nenhum construtor gera `acao: 'excluir'` físico (não existe essa opção).
