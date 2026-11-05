# Decisões da revisão

Os 14 pontos e as 8 lacunas da revisão foram resolvidos com uma mudança estrutural: a seção 3 de `PROMPT.md` passou a ser a única fonte de definições, e as demais seções só referenciam os indicadores pelo nome.

## Pontos da revisão

| # | Problema | Decisão na v2 | Seções |
| --- | --- | --- | --- |
| 1 | Gasto fixo no cartão contado duas vezes na projeção | Cada item entra em exatamente um grupo; gasto fixo no cartão só aparece dentro da fatura em que cairá | 3.9, 11.4 |
| 2 | Duas definições de "quanto vai sobrar"; fatura paga descontada de novo | Função única `projetarFluxo`, só com itens pendentes e regra explícita para vencidos e atrasados; a Barra usa o mês 1 dessa função | 3.9, 3.10, 11.4 |
| 3 | Patrimônio líquido ignora parcelas futuras | Separação entre "A pagar nos cartões" (curto prazo) e "Obrigações de cartão" (inclui futuras); o patrimônio usa as obrigações | 3.5, 3.10 |
| 4 | Pagamento de fatura afetando o Resultado | Tipo de movimento próprio (`pagamento_fatura`) e regra única de reconhecimento para Resultado, KPIs e gráficos | 3.3 |
| 5 | "Previsto" e "efetivado" ambíguos no cartão | Vocabulário de cinco estados e três datas (evento, competência, caixa); parcelas são "A pagar", nunca "Previstas" | 3.1, 3.2 |
| 6 | Clique no gráfico abre lista que não bate | Lançamentos ganhou a visão "Receitas e despesas" por competência, destino de todos os cliques, com invariante de soma | 6.3, 8 |
| 7 | Pagamento parcial sem alocação | Pagamentos alocados à fatura, não a itens; saldo transportado no fechamento seguinte; excedente vira crédito; estorno definido | 3.5 |
| 8 | Editar parcela quebra a compra | Quatro invariantes e tabela de operações permitidas; não existe edição de valor de parcela isolada | 3.6 |
| 9 | Recorrência sem histórico | Versões com vigência; ocorrência com chave única (recorrência + competência) e retrato dos valores | 3.8 |
| 10 | Saldo ignora a data do saldo inicial | Saldo inicial = fim do dia informado; movimentos anteriores não alteram saldo; consulta anterior mostra "—" | 3.4 |
| 11 | Transferência muda o total consolidado | Efeito condicional ao `incluirNoTotal`; patrimônio líquido nunca muda com transferência | 3.10, 7.4 |
| 12 | Três interações incompatíveis com o fluxo | Formulário abre direto no tipo padrão; regra de contagem e obrigatoriedade de campos definidas | 7.2 |
| 13 | "Sempre visíveis" contradiz o celular | Dois indicadores sempre visíveis no compact, os demais a 1 toque e exibidos temporariamente quando mudam | 4.2, 5.3 |
| 14 | Critério genérico para todos os gráficos | Período aplicável e destino do clique definidos gráfico a gráfico | 8.1 |

## Lacunas

| Lacuna | Decisão na v2 | Seções |
| --- | --- | --- |
| Cálculo de dívidas | `Decimal` nos intermediários, arredondamento por etapa, taxa zero sem fórmula, última parcela zera o saldo, taxa implícita por bisseção | 2.2, 3.7 |
| Confirmação automática | Ao abrir e a cada hora; retroativa com a data original; idempotente | 3.8 |
| Dias 29–31 e mudança de ciclo | Último dia do mês; ciclo de cartão versionado sem mover parcelas existentes | 3.5, 3.11 |
| Divisão por zero | Coluna própria na tabela de indicadores ("—" ou "Novo") | 3.10 |
| Backup | Três camadas de schema; modos Substituir e Mesclar; integridade referencial; relatório prévio | 9 |
| Dados de exemplo | Valor contratado de R$ 4.800,00 e casos de borda incluídos | 10 |
| Diagrama ausente na exportação | Fluxo descrito em lista numerada, sem depender de imagem | 7.1 |
| Navegação "5 itens" | "5 itens no total, incluindo Mais" | 5.1 |

## Escolhas que merecem sua validação

- **Postura conservadora na projeção:** rendas atrasadas ficam fora; obrigações vencidas entram no mês corrente.
- **Empréstimo creditado em conta × financiamento pago a terceiro:** no primeiro, só os juros viram despesa (o principal já foi gasto em despesas registradas); no segundo, a parcela inteira vira despesa.
- **Regime único:** removida a opção de contar compras no cartão pela data da compra; a data da compra continua visível em cada item.
- **Dívidas antigas:** parcelas pagas antes do cadastro não geram histórico de despesas.
