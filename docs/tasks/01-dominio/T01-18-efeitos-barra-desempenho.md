# T01-18 · Efeitos na Barra de Totais e desempenho

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-17 | `feat/core-efeitos-barra` |

**Referências:** PROMPT 7.4, 9.3, 11.2–11.4

## Objetivo

Transformar a tabela 7.4 em testes automatizados do core, e medir o desempenho exigido em 9.3.

## Escopo

- `packages/core/src/motor/efeitos.test.ts`: um teste por linha da tabela 7.4. Cada teste:
  1. monta fatos base (uma conta incluída, uma excluída, um cartão, uma dívida, uma renda e um gasto fixo)
  2. calcula os 5 indicadores da Barra
  3. aplica a ação (como fato novo ou alterado)
  4. confere a diferença esperada em **Saldo em contas**, **A pagar nos cartões**, **Resultado do mês**, **Previsto até o fim do mês** e **Patrimônio líquido**
- Gerador de volume `gerarFatosVolumosos(n, hoje)` para testes de desempenho (10 mil lançamentos).
- `packages/core/src/motor/desempenho.test.ts`:
  - 5 indicadores da Barra + KPIs da Visão geral em menos de 100 ms
  - `projetarFluxo` de 24 meses em menos de 200 ms
  - rodar 5 vezes e usar a mediana, para não falhar por ruído

## Fora do escopo

Testes de interface da Barra (T04-06).

## Passos

1. Escrever os 13 testes da tabela 7.4.
2. Escrever o gerador e os testes de desempenho.

## Critérios de aceite

- [ ] As 13 linhas da tabela 7.4 passam.
- [ ] Os limites de 9.3 passam no CI e localmente.
