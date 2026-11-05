# T02-11 · Testes de segurança e regras do banco

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Segurança | T02-10 | `feat/db-seguranca` |

**Referências:** PROMPT 9.4, 11.8, 12.2 · DECISOES D22, D25 · CLAUDE.md (Database rules)

## Objetivo

Uma suíte que percorre **todas** as tabelas de negócio e confere as regras de segurança, para que uma tabela nova sem RLS ou sem `revoke` faça o teste falhar.

## Escopo

- O teste lista as tabelas do schema `public` pelo catálogo (`information_schema.tables`) e, para cada uma, confere:
  1. RLS ligado (`pg_class.relrowsecurity`)
  2. colunas de controle presentes com os tipos e padrões de 9.4
  3. trigger `set_updated_at` presente
  4. `delete` negado para `authenticated` e `anon` (`has_table_privilege`)
  5. nenhum privilégio para `anon`
- Testes de comportamento com dois usuários:
  - A não lê nem altera registros de B, inclusive excluídos (11.8)
  - inserir com `created_by` de B é recusado ou corrigido para A (11.8)
  - `updated_at` muda a cada alteração e `created_at` nunca muda (11.8)
  - `delete` direto pela API é negado (11.8)
- Teste de que o schema `flyway` não é acessível pela API.
- Teste de que `make db-reset` seguido de `make db-validate` passa (11.8), rodado como script.

## Fora do escopo

Auditoria externa de segurança.

## Passos

1. Escrever a suíte genérica.
2. Criar de propósito uma tabela sem RLS numa migração temporária e confirmar que o teste falha; desfazer.

## Critérios de aceite

- [ ] Todos os critérios de 11.8 têm teste.
- [ ] Uma tabela nova que não siga a checklist de 12.2 faz a suíte falhar sem precisar editar o teste.
