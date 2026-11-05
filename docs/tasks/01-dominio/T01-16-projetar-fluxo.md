# T01-16 · Projeção: `projetarFluxo`, simulador e quitação

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-15 | `feat/core-projecao` |

**Referências:** PROMPT 3.9, 3.10 (Previsto até o fim do mês), 6.2 (Projeções), 11.4

## Objetivo

Criar `packages/core/src/motor/projecao.ts`, a **única** função de previsão do sistema.

## Escopo

- `projetarFluxo(derivado, de, ate, hoje, hipoteticos?)` → por mês:
  - saldo inicial, os seis grupos de 3.9 (Rendas, Receitas avulsas previstas, Gastos fixos em conta, Faturas de cartão, Parcelas de dívidas, Despesas avulsas previstas) e saldo final
  - itens de cada grupo, para o detalhamento ao clicar no mês
  - mês corrente = hoje até o último dia; seguintes = dia 1 ao último dia
- Ponto de partida: **Saldo em contas** de hoje. Só itens pendentes e só contas incluídas no total.
- Regras de vencidos e atrasados da tabela 3.9: rendas atrasadas e receitas avulsas com data passada ficam fora e geram alerta; gastos fixos, faturas, parcelas e despesas avulsas vencidos entram no mês corrente; fatura paga contribui zero.
- Gasto fixo pago no cartão entra **só** dentro da fatura em que cai.
- `alertas`: meses negativos, meses abaixo do limite de alerta, rendas atrasadas não incluídas.
- `hipoteticos`: compra parcelada ou gasto fixo do simulador "E se?", devolvidos numa curva separada; nada é gravado.
- `previsaoDeQuitacao(derivado)`: data da última parcela de cada dívida e de cada compra parcelada no cartão.

## Fora do escopo

Tela de Projeções (T05-20, T05-21).

## Passos

1. Testes de 11.4 (sem dupla contagem) primeiro.
2. Implementar.

## Critérios de aceite

- [ ] Streaming de R$ 55,90 no Cartão A, não confirmado: aparece uma vez só, dentro da fatura que vence no dia 10 do mês seguinte, nunca em "Gastos fixos em conta" (11.4).
- [ ] Renda atrasada não entra e gera alerta; gasto fixo, fatura e parcela vencidos entram no mês corrente (11.4).
- [ ] O saldo final do primeiro mês é igual ao indicador **Previsto até o fim do mês** (T01-17), inclusive com receitas e despesas avulsas previstas (11.4).
- [ ] Projeção de 24 meses com 10 mil lançamentos em menos de 200 ms (9.3).
- [ ] O simulador não altera a curva principal.
