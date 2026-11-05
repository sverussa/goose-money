# T01-17 · Indicadores canônicos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-14, T01-16 | `feat/core-indicadores` |

**Referências:** PROMPT 3.10, 5.3, 6.2, 8.1, 11.7

## Objetivo

Criar `packages/core/src/motor/indicadores.ts`: uma função por indicador da tabela 3.10, com o tratamento de denominador zero.

## Escopo

- Uma função exportada por linha de 3.10:
  - `saldoEmContas`, `saldoEmTodasAsContas` (só contas não arquivadas)
  - `aPagarNosCartoes`, `obrigacoesDeCartao` (só cartões ativos), `limiteDisponivel` por cartão
  - `saldoDevedorDeDividas`, `patrimonioLiquido`
  - `receitas`, `despesas`, `resultado` (usam T01-14)
  - `taxaDePoupanca`, `comprometimentoDaRenda`
  - `previstoAteOFimDoMes` (usa T01-16)
  - `variacao(atual, anterior)`
- Resultado de razão é uma união discriminada: `{ tipo: 'valor', valor }`, `{ tipo: 'indisponivel' }` ("—") ou `{ tipo: 'novo' }` ("Novo"). Nunca `NaN` nem `Infinity`.
- `comprometimentoDaRenda` com a decomposição do gráfico (fixos, parcelas de cartão de compras com n > 1 que não vieram de recorrência, dívidas, livre).
- `estadoDoPrevisto(valor, limiteAlerta)`: normal, `warning` abaixo do limite, `error` negativo (5.3).
- Séries dos gráficos de 8.1 que são indicadores no tempo: Receitas × Despesas por mês, Despesas por categoria (até 6 fatias + "Outras"), Gasto acumulado vs. mês anterior, Fixos × variáveis, Composição do saldo por conta, Evolução do saldo e do patrimônio, Gasto por cartão, Maiores despesas (top 5).

## Fora do escopo

Componentes de gráfico (etapa 5).

## Passos

1. Testes de 11.7 e das transferências de 11.2.
2. Implementar.

## Critérios de aceite

- [ ] Período sem receitas: Taxa de poupança "indisponível"; anterior zero e atual R$ 500,00: Variação "novo" (11.7).
- [ ] Transferência de R$ 500,00 de conta incluída para excluída: Saldo em contas −500 e Previsto −500; Resultado e Patrimônio inalterados (11.2).
- [ ] Teste de propriedade: nenhuma função devolve `NaN` ou `Infinity` para fatos aleatórios.
- [ ] "Outras" na rosca soma exatamente as categorias agrupadas.
