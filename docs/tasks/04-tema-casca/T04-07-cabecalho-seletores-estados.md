# T04-07 · Cabeçalho de contexto, seletores de mês e período, estados

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 4 · Tema e casca | Componentes do app | T04-05, T01-04 | `feat/cabecalho-seletores` |

**Referências:** PROMPT 4.1 (item 8), 4.2, 5.2, 8.2 · DESIGN-HANDOFF 4, 7 (estados)

## Objetivo

Criar os componentes compartilhados que toda tela de módulo usa no topo e nos estados sem dados.

## Escopo

- `ContextHeader`: faixa fixa logo abaixo da Barra ao rolar, recebendo uma lista de indicadores (rótulo + `MoneyText`) e ações à direita.
- `MonthSelector`: "◀ Novembro 2026 ▶" na top app bar; atalhos `←` e `→` (T04-09); mês na URL (`?mes=2026-11`).
- `PeriodPicker` (8.2): filter chips Este mês · Mês passado · Últimos 3 meses · Últimos 6 meses · Últimos 12 meses · Este ano · Personalizado; setas ◀ ▶; texto "01/08/2026 – 31/10/2026 · comparado a mai–jul"; período na URL e lembrado por aba (`sessionStorage`). Toda a lógica vem de `periodos` (T01-04).
- `EmptyState`: ilustração simples (ícone lucide grande), uma frase e um botão (4.1, item 8).
- `EstadoCarregando` (esqueleto com `Skeleton`) e `EstadoErro` (mensagem + "Tentar de novo"), usados por toda tela enquanto `useFatos` carrega ou falha.

## Fora do escopo

Gráficos (T04-08).

## Passos

1. Implementar os componentes.
2. Testes unitários do parse da URL; Playwright do `PeriodPicker` (clicar nos chips e nas setas muda a URL).

## Critérios de aceite

- [ ] O cabeçalho de contexto continua visível ao rolar uma lista longa (4.2).
- [ ] O período sobrevive a recarregar a página (está na URL).
- [ ] Período inválido na URL volta ao padrão sem quebrar a tela.
