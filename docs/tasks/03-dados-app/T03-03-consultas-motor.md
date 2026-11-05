# T03-03 · Consultas, "hoje" e Motor no app

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 3 · Dados no app | Leitura | T03-02, T01-17 | `feat/app-consultas` |

**Referências:** PROMPT 1.4, 2.1, 3.11 ("hoje" local) · DECISOES D12, D13, D18, D20

## Objetivo

Ligar os fatos do banco ao Motor do core, com recarga automática e "hoje" sempre correto.

## Escopo

- Dependência: `@tanstack/react-query` 5.
- `apps/app/src/queries/cliente.ts`: `QueryClient` com `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `retry: 1`, `staleTime: 30_000`.
- `useFatos()`: consulta `['fatos', usuarioId]` com `carregarTudo` (T03-02).
- `useHoje()`: data civil local (fuso do dispositivo), atualizada na virada do dia (timer até a meia-noite seguinte) e ao voltar o foco. É o **único** lugar do app que lê o relógio.
- `useDerivado()`: `useMemo(() => derivar(fatos, hoje), [fatos, hoje])`.
- Hooks finos por indicador ou grupo: `useBarraDeTotais()`, `useIndicadoresDoPeriodo(periodo)`, `useFaturas(cartaoId)` etc. Cada um só chama funções do core sobre `useDerivado()`; nenhum faz conta.
- Estados de carregamento e erro padronizados para as telas (usados por T04-07).

## Fora do escopo

Mutações (T03-04).

## Passos

1. Configurar o `QueryClientProvider` no `main.tsx`.
2. Escrever os hooks.
3. Teste unitário de `useHoje` com relógio falso (virada do dia).

## Critérios de aceite

- [ ] Voltar o foco à janela recarrega os fatos.
- [ ] Às 00:00 o "hoje" muda sem recarregar a página.
- [ ] Nenhum componente importa `derivar` ou chama `new Date()`: checar com busca no código na revisão.
