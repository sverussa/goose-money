# T02-03 · Tabelas de cadastros: categorias, contas e preferências

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Cadastros | T02-02, T01-01 | `feat/db-cadastros` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 6.4, 6.9, 9.4, 12.2 · DECISOES D21, D22

## Objetivo

Criar as tabelas `categorias`, `contas` e `preferencias` seguindo a checklist de PROMPT 12.2.

## Escopo

- `V002__categorias.sql`: campos do modelo, `categoria_pai_id` opcional, um nível só (D35; `check` impede apontar para uma categoria que já é filha), `sistema boolean`, `tipo` com `check`.
- `V003__contas.sql`: campos do modelo, `tipo` com `check` (corrente, poupanca, investimento, dinheiro, outra), `saldo_inicial bigint`, `data_saldo_inicial date`, `incluir_no_total`, `arquivada`.
- `V004__preferencias.sql`: uma linha por usuário (`unique (created_by) where not is_deleted`).
- Em cada tabela, a checklist de 12.2:
  1. colunas de controle e trigger `set_updated_at`
  2. RLS e políticas `select`, `insert`, `update` com `created_by = auth.uid()`
  3. `revoke delete` de `authenticated` e `anon`; `revoke all` de `anon`
  4. índices parciais `where not is_deleted` e chaves estrangeiras `on delete restrict`
- Unicidade: nome de conta entre contas ativas `unique (created_by, lower(nome)) where not is_deleted and not arquivada`; mesma regra para categorias irmãs.
- Categorias de sistema não podem ser alteradas nem excluídas: trigger que recusa `update` quando `sistema = true` (exceto pela inicialização, T02-08).
- Incluir as tabelas na lista de `gravar` (T02-02).
- `make db-types` e commit dos tipos gerados.

## Fora do escopo

Regras de arquivar e excluir conta com vínculos (ficam no core, T01-22).

## Passos

1. Escrever as migrações.
2. `make db-reset` (recria do zero) e `make db-migrate`.
3. Testes de banco para cada item da checklist.

## Critérios de aceite

- [ ] Checklist de 12.2 coberta por teste em cada tabela.
- [ ] Duas contas ativas com o mesmo nome são recusadas; uma excluída e uma ativa com o mesmo nome são aceitas (11.8).
- [ ] Alterar uma categoria de sistema é recusado pelo banco.
