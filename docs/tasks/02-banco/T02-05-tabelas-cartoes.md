# T02-05 · Tabelas de cartões, compras e faturas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Cartões | T02-04 | `feat/db-cartoes` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 3.5, 3.6, 6.5, 9.4 · DECISOES D21

## Objetivo

Criar as tabelas do contexto de cartões com as invariantes que o banco consegue garantir sozinho.

## Escopo

- `V006__cartoes.sql`: `cartoes` (limite `> 0`, `conta_pagamento_id` obrigatória, cor, `arquivado`) e `cartao_ciclos` (`vigente_desde` competência, `dia_fechamento` e `dia_vencimento` entre 1 e 31, `unique (cartao_id, vigente_desde) where not is_deleted`).
- `V007__compras.sql`: `compras` (valor total, número de parcelas ≥ 1, data, descrição, categoria, `cancelada` com a data do cancelamento) e `parcelas` (número, competência, valor, `paga_antes_do_cadastro`, `unique (compra_id, numero) where not is_deleted`).
- `V008__itens_fatura.sql`: `itens_fatura` (tipo encargo, estorno, ajuste_compra, saldo_anterior_cadastro; `cartao_id`, competência, valor, `compra_id` opcional) e `alocacoes_pagamento` (lançamento `pagamento_fatura` → cartão + competência + valor).
- Invariante da soma das parcelas: trigger de restrição **adiado até o fim da transação** (`constraint trigger … deferrable initially deferred`) que confere, para cada compra alterada e **não cancelada**, soma das parcelas ativas = valor total e quantidade = número de parcelas. Compra cancelada (3.6) fica fora da regra, porque perde as parcelas das faturas não fechadas. Assim o lote de `gravar` pode inserir a compra e as parcelas em qualquer ordem.
- Conta de pagamento do cartão precisa estar ativa e com `incluir_no_total` (trigger de `check`, 3.9).
- Checklist de 12.2 em todas as tabelas; incluir na lista de `gravar`; regenerar tipos.

## Fora do escopo

Saldo e status da fatura (derivados no core, T01-09).

## Passos

1. Migrações e testes.

## Critérios de aceite

- [ ] Compra de R$ 1.000,00 em 3x com parcelas que somam R$ 999,99 é recusada no fim da transação.
- [ ] Excluir logicamente uma parcela sem excluir nem cancelar a compra é recusado (a soma deixa de bater).
- [ ] Cancelar uma compra com parcelas faturadas grava sem erro.
- [ ] Cartão com conta de pagamento fora do total é recusado.
- [ ] Checklist de 12.2 com testes.
