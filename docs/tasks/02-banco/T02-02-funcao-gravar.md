# T02-02 · Função `gravar(ops)` e convenções de escrita

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Escrita | T02-01, T01-22 | `feat/db-gravar` |

**Referências:** PROMPT 2.1, 7.1, 9.4, 12.2 · DECISOES D14, D15, D18, D22

## Objetivo

Definir como o app grava no banco. As tarefas T02-03 a T02-07 criam as tabelas que esta função aceita.

## Escopo

- `supabase/flyway/sql/R__gravar.sql` com `public.gravar(ops jsonb) returns jsonb`, `security invoker` (respeita o RLS), `set search_path = public`:
  - `ops` é uma lista de `{ tabela, acao: 'inserir' | 'alterar', id, dados }`; não existe ação de apagar
  - `tabela` precisa estar numa lista fixa (as tabelas de negócio); qualquer outra gera erro
  - aplica tudo numa transação; se uma operação falhar, nada é gravado
  - ignora `created_at`, `created_by` e `updated_at` vindos do app (o banco preenche)
  - devolve as linhas gravadas, por tabela, para o app atualizar o cache (D14)
  - erros de restrição viram mensagens com código (`23505` unicidade, `23503` referência, `23514` check) para o app traduzir
- `grant execute on function public.gravar(jsonb) to authenticated` e `revoke` de `anon`.
- Testes: gravação com várias tabelas, falha no meio desfaz tudo, tabela fora da lista é recusada, `created_by` de outro usuário é ignorado.

## Fora do escopo

Tabelas (T02-03 em diante) e a chamada no app (T03-04).

## Passos

1. Escrever a função com uma tabela de teste temporária criada só no teste.
2. Testar os casos acima.

## Critérios de aceite

- [ ] Um lote de 11 inserções (compra + 10 parcelas) é gravado de uma vez ou não é gravado.
- [ ] Usuário A não consegue alterar registro do usuário B pela função (o RLS bloqueia).
- [ ] A função nunca apaga linhas.

## Decisões tomadas

**D1. Regras das gravações compostas** (D36, respondida pelo Saulo em 05/11/2026, opção A): ficam no core (T01-22). O banco recebe a lista de mudanças já validadas e só garante atomicidade, dono do registro e as restrições simples (unicidade, referências, checks, soma das parcelas).
