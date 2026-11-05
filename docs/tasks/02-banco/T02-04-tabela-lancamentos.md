# T02-04 · Tabela de lançamentos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Lançamentos | T02-03 | `feat/db-lancamentos` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 3.2, 3.3, 3.4, 9.4 · T01-01 (D1, transferência)

## Objetivo

Criar `lancamentos`, que guarda todo movimento de caixa e todo lançamento previsto.

## Escopo

- `V005__lancamentos.sql` com os campos do modelo, incluindo:
  - `tipo` com `check` nos valores de T01-01
  - `status` (`previsto`, `efetivado`)
  - `valor bigint` com `check (valor > 0)`, exceto em `ajuste`, que pode ser negativo
  - `data date`, `conta_id`, e os campos de transferência conforme a decisão de T01-01
  - referências opcionais de origem (recorrência, ocorrência, dívida, parcela de dívida, fatura) para o filtro "origem" de 6.3
  - `categoria_id` obrigatória para receita e despesa (`check` condicional)
- Índices para as consultas do Motor: `(created_by, data) where not is_deleted`, `(conta_id) where not is_deleted`.
- Checklist de PROMPT 12.2.
- Incluir na lista de `gravar` e regenerar tipos.

## Fora do escopo

Lançamentos criados por recorrências e dívidas: a tabela aceita, mas os comandos são de outras tarefas.

## Passos

1. Migração e testes.

## Critérios de aceite

- [ ] Checklist de 12.2 com testes.
- [ ] Despesa sem categoria é recusada; ajuste negativo é aceito; despesa com valor zero é recusada.
- [ ] Transferência sem destino (ou com destino igual à origem) é recusada.
- [ ] Lançamento apontando para conta de outro usuário é recusado.
