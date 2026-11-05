# T05-25 · Rendas fixas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Recorrências | T04-08, T01-13, T03-06 | `feat/rendas` |

**Referências:** PROMPT 3.8, 4.1 (item 5), 6.7, 8.1 (Composição da renda), 11.6 · `design/telas/Rendas.dc.html`

## Objetivo

`#/rendas`, como no design.

## Escopo

- `MonthSelector` e cabeçalho de contexto: previsto no mês, recebido, a receber, atrasado (`resumoRendas`, T01-13).
- Botão "Nova renda fixa" no cabeçalho (o FAB continua "+ Lançar", 6.7).
- Lista de fontes: descrição, valor da versão vigente, dia, conta, `StatusChip` do mês; ação principal "Confirmar recebimento" (diálogo com valor e data editáveis); menu com "Ignorar este mês", "Editar" e "Excluir".
- **Formulário** (nova ou editar): descrição, valor, dia, conta, categoria, competência de início e fim opcional, confirmação automática.
  - editar exige o campo "Aplicar a partir de" (padrão: primeira competência não confirmada, T01-13) e mostra o histórico de versões, como no design
  - editar nunca muda ocorrências já gravadas (3.8)
- Gráfico pequeno Composição da renda (rosca), mês corrente; clique abre a recorrência.
- A pendência "Confirmar" de renda atrasada no Painel (T05-16) abre o diálogo de confirmação.

## Fora do escopo

Confirmação automática (T03-06).

## Passos

1. Montar a tela, o formulário e os diálogos.
2. Testes Playwright de 11.6 (nova versão a partir de dezembro).

## Critérios de aceite

- [ ] Editar o salário para R$ 7.000,00 "a partir de dezembro": novembro continua R$ 6.500,00 e dezembro em diante usa R$ 7.000,00 (11.6).
- [ ] Confirmar com valor diferente do previsto atualiza a Barra pelo valor real (7.4).
- [ ] "Ignorar este mês" tira a renda da projeção daquele mês.
