# T03-05 · Sem conexão

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Conexão | T03-04 | `feat/app-sem-conexao` |

**Referências:** PROMPT 9.3 (Conexão e privacidade) · DECISOES D18

## Objetivo

Deixar claro quando o app está sem internet e impedir gravações nesse estado.

## Escopo

- `useConexao()`: combina `navigator.onLine`, os eventos `online`/`offline` e falhas de rede das últimas chamadas ao Supabase (o `onLine` sozinho não é confiável).
- Banner fixo "Sem conexão" abaixo da top app bar, com texto explicando que os dados mostrados podem estar desatualizados e que nada pode ser salvo.
- `useComando` (T03-04) recusa executar sem conexão, com o erro "Sem conexão: tente de novo quando a internet voltar".
- Botões de salvar ficam desabilitados com tooltip enquanto o banner estiver visível.
- Ao reconectar: o banner some e o TanStack Query recarrega os fatos (`refetchOnReconnect`).

## Fora do escopo

Modo offline com gravação local (descartado em D18).

## Passos

1. Escrever o hook e o banner.
2. Teste Playwright com `context.setOffline(true)`.

## Critérios de aceite

- [ ] Offline: banner aparece e "Salvar" fica desabilitado.
- [ ] Ao voltar a conexão, o banner some e os dados recarregam.
- [ ] Nenhuma gravação é perdida em silêncio: toda tentativa offline mostra mensagem.
