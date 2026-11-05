# T03-02 · Mapeamento banco ↔ domínio e `carregarTudo`

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Leitura | T02-09, T01-05 | `feat/app-carregar` |

**Referências:** PROMPT 9.4 (nomes) · DECISOES D15, D25

## Objetivo

Transformar as linhas do banco nos `Fatos` do core, num lugar só.

## Escopo

- `apps/app/src/data/mapeamento.ts`: para cada tabela, `deBanco(linha)` (`snake_case` → `camelCase`, `bigint` → `Centavos`, `date` → `DataCivil`) e `paraBanco(entidade)` (o inverso, sem colunas de controle preenchidas pelo banco).
- Mapeamento tipado com os tipos gerados (`database.types.ts`) de um lado e os tipos do core do outro: uma coluna nova no banco sem mapeamento quebra a checagem de tipos.
- `apps/app/src/data/carregar.ts`: `carregarTudo()` chama `carregar_tudo()` (T02-09), mapeia e valida com os schemas de domínio do core.
  - Validação com os schemas Zod do domínio sempre, também em produção (D42); dado inválido mostra o estado de erro da carga e não chega ao Motor.
- `bigint`: o PostgREST devolve número; conferir que todo valor cabe em inteiro seguro e lançar erro claro se não couber.

## Fora do escopo

Cache e hooks (T03-03).

## Passos

1. Escrever o mapeamento por tabela, com testes de ida e volta (`paraBanco(deBanco(x))`).
2. Escrever `carregarTudo` e testá-lo contra o banco local com o seed.

## Critérios de aceite

- [ ] Ida e volta de cada tabela preserva todos os campos.
- [ ] `carregarTudo` com o seed devolve fatos que passam nos schemas.
- [ ] Nenhum outro arquivo do app conhece nomes de colunas `snake_case`.

## Decisão tomada

**D1. Validação** (respondida pelo Saulo em 05/11/2026): sempre, com Zod (opção A). Registrada em `DECISOES.md` D42.
