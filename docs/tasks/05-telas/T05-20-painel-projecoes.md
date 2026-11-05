# T05-20 · Painel › Projeções

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Painel | T05-16, T01-16 | `feat/painel-projecoes` |

**Referências:** PROMPT 3.9, 6.2 (Projeções), 8.1, 11.4 · `design/telas/PainelProjecoes.dc.html` · DESIGN-HANDOFF 6 (item 3)

## Objetivo

A aba Projeções (também em `#/projecoes`): gráfico, tabela mês a mês e detalhamento.

## Escopo

- Segmented de horizonte: 3, 6, 12 ou 24 meses; padrão da preferência "horizonte padrão" (6.9).
- Banner quando algum mês fica negativo ou abaixo do limite de alerta, e alerta de rendas atrasadas não incluídas (`alertas`, T01-16).
- Gráfico Saldo projetado (linha) com uma **faixa colorida** (`ReferenceArea` do Recharts, cor de alerta com transparência do tema) entre zero e o limite de alerta configurado, no lugar das duas linhas do design (D48); a faixa tem rótulo acessível "Abaixo do limite de alerta" e aparece também no `ChartCard` como legenda; clique num mês abre o detalhamento (não Lançamentos, 8.1).
- Tabela mês a mês com as colunas dos 6 grupos de 3.9 e o saldo final. A primeira linha é o mês corrente e seu saldo final é igual ao **Previsto até o fim do mês** da Barra.
- Detalhamento do mês selecionado: lista de cada item pendente que compôs aquele mês, por grupo (o clique no mês troca o detalhamento, como no design).
- `#/projecoes` abre esta aba com o mês corrente detalhado (destino do clique no Previsto da Barra, 5.3).

## Fora do escopo

Simulador "E se?" e previsão de quitação (T05-21).

## Passos

1. Montar a aba.
2. Testes Playwright de 11.4 pela interface.

## Critérios de aceite

- [ ] Saldo final do mês corrente na tabela = Previsto até o fim do mês na Barra (11.4).
- [ ] O Streaming no cartão aparece só dentro da fatura, nunca em "Gastos fixos em conta" (11.4).
- [ ] Clique em outro mês troca o detalhamento.
- [ ] Mudar o limite de alerta em Configurações muda a altura da faixa.

## Decisão tomada

**D1. Limite de alerta no gráfico** (respondida pelo Saulo em 05/11/2026): faixa colorida entre zero e o limite (opção C). Diverge do design, que mostra duas linhas. Registrada em `DECISOES.md` D48.
