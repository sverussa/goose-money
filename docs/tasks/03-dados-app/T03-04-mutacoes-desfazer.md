# T03-04 · Mutações, "Salvando…" e Desfazer

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Escrita | T03-03, T01-22, T02-02 | `feat/app-mutacoes` |

**Referências:** PROMPT 4.1 (feedback), 7.1, 9.4 · DECISOES D14, D15

## Objetivo

Executar os comandos do core no banco e refletir o resultado na tela, com Desfazer.

## Escopo

- `apps/app/src/data/gravar.ts`: `executar(mudancas)` → converte `Mudanca[]` do core em `ops` (T02-02) com o mapeamento de T03-02, chama `gravar` e devolve as linhas gravadas já como entidades do domínio.
- `apps/app/src/queries/useComando.ts`: `useComando()` → `useMutation` que:
  1. recebe um `Comando` do core
  2. chama `executar(comando.mudancas)`
  3. aplica as linhas devolvidas no cache com `setQueryData` (sem recarregar tudo)
  4. mostra o snackbar (Sonner) com `comando.descricao` e o botão "Desfazer"
  5. "Desfazer" executa `comando.inversas` da mesma forma
- Erros traduzidos para mensagens (unicidade, referência, check, sem conexão, sessão expirada) e mostrados em snackbar de erro; nada muda na tela (D14).
- Estado `salvando` exposto para os botões mostrarem "Salvando…".
- Snapshot do valor anterior de cada indicador da Barra antes da mutação, para a animação e o chip de variação (T04-06).

## Fora do escopo

Componentes de formulário.

## Passos

1. Escrever `executar` e `useComando`.
2. Teste de integração contra o banco local: criar despesa, desfazer, conferir os fatos.

## Critérios de aceite

- [ ] Criar e desfazer uma despesa devolve os fatos e todos os indicadores aos valores anteriores (11.7).
- [ ] Erro de gravação não altera o cache e mostra mensagem.
- [ ] O botão fica em "Salvando…" enquanto a chamada não termina.
