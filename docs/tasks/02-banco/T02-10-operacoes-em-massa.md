# T02-10 · Operações em massa: apagar tudo, importar e dados de exemplo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Backup | T02-09, T01-19, T01-20 | `feat/db-massa` |

**Referências:** PROMPT 6.9 (Dados), 9.2, 9.4, 10, 11.7

## Objetivo

Garantir no banco as operações que mexem em muitos registros de uma vez.

## Escopo

- `R__apagar_tudo.sql`: `public.apagar_tudo() returns void`, marca `is_deleted = true` em todos os registros do usuário, exceto categorias de sistema e preferências, numa transação.
- Importação de backup usando `gravar(ops)` (T02-02) com o plano de T01-20:
  - **Substituir**: um único lote que marca os atuais como excluídos e grava os do arquivo por id (registro excluído com o mesmo id volta com os dados do arquivo)
  - **Mesclar**: um lote com as inserções e alterações do plano
  - teste de limite: um backup com 10 mil lançamentos cabe numa chamada (ajustar o limite de corpo da API local se preciso e documentar)
- Dados de exemplo: o app gera com `gerarSeed` (T01-19) e grava por `gravar(ops)`, conforme a regra decidida em T05-29.
- `gravar` precisa aceitar `alterar` de registros com `is_deleted = true` (para o Substituir e o Desfazer).

## Fora do escopo

Tela e relatório prévio (T05-29).

## Passos

1. Escrever `apagar_tudo` e os testes.
2. Testar os dois modos de importação ponta a ponta com o seed.

## Critérios de aceite

- [ ] Exportar, apagar tudo e importar em Substituir reproduz os mesmos indicadores (11.7, testado com o core sobre o resultado de `carregar_tudo`).
- [ ] Importar o mesmo arquivo em Mesclar não cria duplicatas (11.7).
- [ ] Erro no meio da importação não grava nada (11.7).
- [ ] Depois de `apagar_tudo`, as linhas continuam no banco com `is_deleted = true`.
