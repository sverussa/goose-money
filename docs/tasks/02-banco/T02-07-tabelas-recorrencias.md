# T02-07 · Tabelas de recorrências

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Recorrências | T02-05 | `feat/db-recorrencias` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 3.8, 6.7, 6.8, 9.4

## Objetivo

Criar `recorrencias`, `recorrencia_versoes` e `ocorrencias`, com a chave única que impede confirmação duplicada.

## Escopo

- `V010__recorrencias.sql`:
  - `recorrencias`: natureza (`renda`, `gasto`), descrição, competência de início e fim, `auto_confirmar`, `ativa`
  - `recorrencia_versoes`: `vigente_desde`, valor, dia (1–31), conta, forma de pagamento (`conta`, `cartao`), cartão, categoria; `unique (recorrencia_id, vigente_desde) where not is_deleted`
  - `ocorrencias`: `recorrencia_id`, competência, situação (`confirmada`, `ignorada`) e o retrato (valor real, data, conta ou cartão, categoria, `lancamento_id` ou `compra_id`); **`unique (recorrencia_id, competencia) where not is_deleted`**
- Forma de pagamento "cartão" exige `cartao_id`; "conta" exige `conta_id` (`check`).
- Checklist de 12.2; incluir na lista de `gravar`; regenerar tipos.

## Fora do escopo

Disparo da confirmação automática (T03-06).

## Passos

1. Migração e testes.

## Critérios de aceite

- [ ] Duas ocorrências ativas para a mesma recorrência e competência são recusadas (código `23505`).
- [ ] Depois de excluir logicamente uma ocorrência, uma nova para a mesma competência é aceita.
- [ ] Dois clientes confirmando a mesma ocorrência ao mesmo tempo: um grava, o outro recebe `23505` (base para a idempotência de 3.8).
