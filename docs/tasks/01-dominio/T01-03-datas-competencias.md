# T01-03 · Datas civis e competências

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Fundamentos | T00-02 | `feat/core-datas` |

**Referências:** PROMPT 2 (datas), 3.2, 3.11 · DECISOES D6, D12

## Objetivo

Criar `packages/core/src/datas/`, que substitui o date-fns (D6) com só o que o domínio usa.

## Escopo

- Tipo `DataCivil` (texto `AAAA-MM-DD` com marca de tipo) e `dataCivil(s)`, que valida formato e data real (rejeita `2026-02-30`).
- Tipo `Competencia` (texto `AAAA-MM`) e `competenciaDe(d)`.
- Funções:
  - `compararDatas`, `maxData`, `minData` (as datas `AAAA-MM-DD` podem ser comparadas como texto; documentar isso)
  - `somarDias(d, n)`, `somarMeses(c, n)` para competência, `mesesEntre(c1, c2)`
  - `ultimoDiaDoMes(c)`, considerando ano bissexto
  - `diaNoMes(c, dia)`: dia inexistente vira o último dia do mês (3.11)
  - `primeiroDia(c)`, `ultimaData(c)`
  - `diaDaSemana(d)` só se algum gráfico precisar (não criar antes)
- Implementação com `Date.UTC` internamente, para não sofrer com fuso e horário de verão. O core **nunca** chama `new Date()` sem argumentos: "hoje" sempre chega como parâmetro (D12).

## Fora do escopo

Formatação `dd/mm/aaaa` e nomes de meses para a tela (ficam no app, T04-04). Cálculo de "hoje" no fuso local (T03-03).

## Passos

1. Testes primeiro, com os casos de borda abaixo.
2. Implementar e exportar.

## Critérios de aceite

- [ ] `diaNoMes('2026-02', 31)` = `2026-02-28`; `diaNoMes('2028-02', 31)` = `2028-02-29`; `diaNoMes('2026-11', 31)` = `2026-11-30` (11.3, 11.6).
- [ ] `somarMeses('2026-12', 1)` = `2027-01` (virada de ano).
- [ ] `dataCivil('2026-02-30')` lança erro.
- [ ] Uma busca no código do core por `new Date()` sem argumentos não encontra nada (teste automatizado lendo os arquivos, ou regra de lint).
