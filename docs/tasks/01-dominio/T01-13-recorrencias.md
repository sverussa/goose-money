# T01-13 · Recorrências: versões, previsão, status e pendentes

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Recorrências | T01-05, T01-07 | `feat/core-recorrencias` |

**Referências:** PROMPT 3.8, 3.11, 6.7, 6.8, 11.6

## Objetivo

Criar `packages/core/src/recorrencias/`: o que cada renda ou gasto fixo prevê em cada mês, o status do mês e o que falta confirmar.

## Escopo

- `versaoVigente(versoes, competencia)`: maior `vigenteDesde` ≤ competência.
- `previsao(recorrencia, versoes, competencia)`: valor, data (dia ajustado por 3.11), conta ou cartão, categoria. Sem previsão fora de [início, fim].
- `ocorrenciasDoMes(fatos, competencia, hoje)`: para cada recorrência ativa, a ocorrência gravada (retrato) ou a prevista, com status: confirmada, ignorada, prevista (data ≥ hoje), atrasada (renda com data < hoje), vencida (gasto com data < hoje).
- `pendentesParaConfirmar(fatos, hoje)`: todas as ocorrências de recorrências com `autoConfirmar`, data ≤ hoje e sem ocorrência gravada, **desde o início** da recorrência, em ordem cronológica. Para cada uma, o lançamento ou a compra à vista que deve ser criado, com a data prevista original (o comando é T01-22, a gravação T03-04 e o disparo T03-06).
- `faturaDoGastoNoCartao(...)`: em qual fatura um gasto fixo no cartão vai cair (usa T01-07).
- `primeiraCompetenciaNaoConfirmada(...)`: padrão do campo "Aplicar a partir de".
- `resumoRendas(...)` e `resumoGastos(...)`: previsto, recebido ou pago, a receber ou a pagar, atrasado ou vencido no mês (cabeçalhos de 6.7 e 6.8).

## Fora do escopo

Comprometimento da renda (T01-17) e projeção (T01-16).

## Passos

1. Testes com 11.6 e com as duas versões do Freelance do seed.
2. Implementar.

## Critérios de aceite

- [ ] Salário R$ 6.500,00 confirmado em novembro e nova versão de R$ 7.000,00 a partir de dezembro: novembro continua R$ 6.500,00, dezembro em diante R$ 7.000,00 (11.6).
- [ ] App fechado de 01/11 a 10/11 com salário no dia 5 e confirmação automática: `pendentesParaConfirmar` em 10/11 devolve um lançamento datado de 05/11; com a ocorrência gravada, devolve nada (11.6).
- [ ] Gasto no dia 31 aparece no dia 30 em novembro e no dia 28 ou 29 em fevereiro (11.6).
- [ ] Ocorrência gravada não muda quando uma versão nova é criada.
