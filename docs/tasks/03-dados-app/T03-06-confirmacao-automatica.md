# T03-06 · Confirmação automática de recorrências

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Recorrências | T03-04, T01-13, T02-07 | `feat/app-confirmacao-automatica` |

**Referências:** PROMPT 3.8 (Confirmação automática), 11.6

## Objetivo

Rodar a confirmação automática ao abrir o app e a cada hora, sem duplicar nada mesmo com dois aparelhos abertos.

## Escopo

- `useConfirmacaoAutomatica()` montado uma vez no `AppShell`:
  - roda depois do primeiro carregamento dos fatos e a cada 60 minutos com o app aberto
  - usa `pendentesParaConfirmar(fatos, hoje)` (T01-13) e o construtor "confirmar em lote" (T01-22)
  - grava em ordem cronológica, **uma ocorrência por chamada**, para que um conflito de chave única (`23505`, outro aparelho já confirmou) só pule aquela ocorrência
  - ao final, se N > 0, snackbar "N lançamentos automáticos registrados · Revisar"; "Revisar" abre Lançamentos filtrado por origem "recorrência" e data de criação de hoje
- Não roda sem conexão (T03-05).
- Uma trava em memória impede duas execuções simultâneas no mesmo aparelho.

## Fora do escopo

Confirmação manual (telas Rendas e Gastos fixos).

## Passos

1. Escrever o hook.
2. Teste de integração: dois clientes rodando ao mesmo tempo contra o banco local criam um lançamento só.
3. Teste do cenário de 11.6 (app fechado de 01/11 a 10/11).

## Critérios de aceite

- [ ] Abrir em 10/11 cria um lançamento datado de 05/11; abrir de novo não duplica (11.6).
- [ ] Dois aparelhos ao mesmo tempo não duplicam e nenhum mostra erro.
- [ ] O snackbar mostra a quantidade certa.
