# T01-04 · Períodos, granularidade e período anterior

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Fundamentos | T01-03 | `feat/core-periodos` |

**Referências:** PROMPT 3.10 (Variação), 8.2 · DESIGN-HANDOFF 6 (item 1)

## Objetivo

Criar `packages/core/src/periodos/` com as regras do seletor de período, para que a interface só exiba o resultado.

## Escopo

- Tipo `Periodo { de: DataCivil; ate: DataCivil }` com validação `de ≤ ate`.
- `periodoPreset(preset, hoje)` para: Este mês, Mês passado, Últimos 3 meses, Últimos 6 meses, Últimos 12 meses, Este ano. "Últimos N meses" inclui o mês corrente até hoje (D37): com hoje = 04/11/2026, "Últimos 3 meses" = 01/09/2026 a 04/11/2026.
- `deslocar(periodo, sentido)`: as setas ◀ ▶ movem o período inteiro, mantendo a duração em meses quando o período for de meses completos.
- `periodoAnterior(periodo)`: mesma duração, imediatamente antes (base da **Variação**, 3.10). Para um período de meses que termina num dia do mês, o anterior recua o mesmo número de meses e corta no mesmo dia, para comparar mês incompleto com mês incompleto: 01/09–04/11/2026 → 01/06–04/08/2026.
- `granularidade(periodo)`: até 31 dias → `dia`; até 12 meses → `mes`; acima → `mes` com opção `trimestre`.
- `periodoDaUrl(params)` e `periodoParaUrl(periodo)` com `de` e `ate` em `AAAA-MM-DD` (8.2), rejeitando valores inválidos.

## Fora do escopo

Componente `PeriodPicker` (T04-07).

## Passos

1. Testes primeiro, com `hoje = 2026-11-04`.
2. Implementar e exportar.

## Critérios de aceite

- [ ] Com hoje em 04/11/2026, os presets geram: Últimos 3 meses = 01/09–04/11/2026, Últimos 12 meses = 01/12/2025–04/11/2026, Este ano = 01/01–04/11/2026.
- [ ] `periodoAnterior` de ago–out/2026 é mai–jul/2026, e o de 01/09–04/11/2026 é 01/06–04/08/2026.
- [ ] `periodoDaUrl` com data inválida devolve erro, não um período quebrado.

## Decisão tomada

**D1. "Últimos N meses"** (respondida pelo Saulo em 05/11/2026): incluem o mês corrente até hoje (opção B). Diverge do design (`Main.dc.html` mostra ago–out) e do exemplo de URL de PROMPT 8.2, que foi atualizado. Registrada em `DECISOES.md` D37.
