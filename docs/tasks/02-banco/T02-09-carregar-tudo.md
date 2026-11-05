# T02-09 · Leitura: carregar todos os fatos do usuário

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Leitura | T02-06, T02-07 | `feat/db-carregar-tudo` |

**Referências:** PROMPT 2.1, 9.3, 9.4 · DECISOES D18

## Objetivo

Definir como o app busca, de uma vez, todos os registros não excluídos do usuário.

## Escopo (conforme a decisão D1, opção A)

- `R__carregar_tudo.sql`: `public.carregar_tudo() returns jsonb`, `security invoker`, `stable`:
  - um objeto com uma chave por tabela de negócio e a lista de linhas `where not is_deleted`
  - o RLS garante que só vêm linhas do usuário
- Teste de volume: 10 mil lançamentos e o seed completo voltam em menos de 1 segundo no banco local.
- Teste: linha excluída logicamente nunca aparece.

## Fora do escopo

Mapeamento para os tipos do core (T03-02).

## Passos

1. Escrever a função e os testes.

## Critérios de aceite

- [ ] Uma única chamada traz todas as tabelas.
- [ ] Registros excluídos e de outros usuários não aparecem.
- [ ] 10 mil lançamentos em menos de 1 s localmente.

## Decisões

**D1. Como buscar os fatos?**

- **A)** Uma função `carregar_tudo()` que devolve um único JSON com todas as tabelas: uma requisição, sem o limite de 1.000 linhas por página do PostgREST. *(recomendado)*
- **B)** Um `select` por tabela pela API, paginando de 1.000 em 1.000. Sem função nova, mas são 12 ou mais requisições e o filtro `is_deleted` repetido em cada uma.
- **C)** Views por tabela já filtrando `is_deleted`, lidas com paginação. O filtro fica num lugar só, mas continua com várias requisições.
