# T05-21 · Projeções: simulador "E se?" e previsão de quitação

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T05-20 | `feat/projecoes-simulador` |

**Referências:** PROMPT 6.2 (Simulador, Previsão de quitação) · `design/telas/PainelProjecoes.dc.html` ("E se?", "Quando cada compromisso termina")

## Objetivo

Os dois blocos finais da aba Projeções.

## Escopo

- **Simulador "E se?"**: escolher compra parcelada hipotética (valor, parcelas, cartão, data) ou gasto fixo hipotético (valor, dia, a partir de qual mês, conta ou cartão).
  - curva tracejada sobreposta no gráfico e coluna extra na tabela (`hipoteticos`, T01-16)
  - **nada é gravado**: o estado fica só na tela; botão "Limpar simulação"
  - frase-conclusão: "Com essa compra, o saldo fica abaixo do limite em março"
- **Quando cada compromisso termina**: lista com a última parcela de cada dívida e de cada compra parcelada no cartão (`previsaoDeQuitacao`, T01-16), ordenada por data.

## Fora do escopo

Gravar uma simulação como compra de verdade (pode virar evolução futura).

## Passos

1. Implementar os dois blocos.
2. Teste Playwright: simular e conferir que a Barra e os fatos não mudam.

## Critérios de aceite

- [ ] Simular uma compra não altera nenhum indicador da Barra nem grava nada.
- [ ] A curva simulada difere da principal exatamente pelas parcelas simuladas.
- [ ] A lista de quitação mostra a data da última parcela de cada dívida do seed.
