# T01-04 · Períodos, granularidade e período anterior

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Fundamentos | T01-03 | `feat/core-periodos` |

**Referências:** PROMPT 3.10 (Variação), 8.2 · DESIGN-HANDOFF 6 (item 1)

## Objetivo

Criar `packages/core/src/periodos/` com as regras do seletor de período, para que a interface só exiba o resultado.

## Escopo

- Tipo `Periodo { de: DataCivil; ate: DataCivil }` com validação `de ≤ ate`.
- `periodoPreset(preset, hoje)` para: Este mês, Mês passado, Últimos 3 meses, Últimos 6 meses, Últimos 12 meses, Este ano.
- `deslocar(periodo, sentido)`: as setas ◀ ▶ movem o período inteiro, mantendo a duração em meses quando o período for de meses completos.
- `periodoAnterior(periodo)`: mesma duração, imediatamente antes (base da **Variação**, 3.10).
- `granularidade(periodo)`: até 31 dias → `dia`; até 12 meses → `mes`; acima → `mes` com opção `trimestre`.
- `periodoDaUrl(params)` e `periodoParaUrl(periodo)` com `de` e `ate` em `AAAA-MM-DD` (8.2), rejeitando valores inválidos.

## Fora do escopo

Componente `PeriodPicker` (T04-07).

## Passos

1. Testes primeiro, com `hoje = 2026-11-04`.
2. Implementar e exportar.

## Critérios de aceite

- [ ] Com hoje em 04/11/2026, os presets geram os períodos esperados, conforme a decisão D1.
- [ ] `periodoAnterior` de ago–out/2026 é mai–jul/2026 (igual ao design de `Main.dc.html`).
- [ ] `periodoDaUrl` com data inválida devolve erro, não um período quebrado.

## Decisões

**D1. "Últimos 3/6/12 meses" incluem o mês corrente?** (decisão de design 1 do handoff)

- **A)** Não: são os meses completos anteriores (com hoje em novembro, "Últimos 3 meses" = ago–out), como desenhado e como no exemplo de URL de 8.2. *(recomendado)*
- **B)** Sim: incluem o mês corrente até hoje (set–nov). Mostra dados mais recentes, mas compara um mês incompleto.
- **C)** Os meses completos anteriores mais o mês corrente até hoje (ago–nov). Período maior que o nome sugere.
