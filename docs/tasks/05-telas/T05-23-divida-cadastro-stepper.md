# T05-23 · Cadastro de dívida em 5 etapas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 5 · Telas | Dívidas | T05-22, T01-11, T01-12 | `feat/divida-cadastro` |

**Referências:** PROMPT 3.3, 3.7, 4.1 (item 5), 6.6 (Cadastro em stepper), 11.5 · DESIGN-HANDOFF 7 (stepper não desenhado)

## Objetivo

O cadastro de empréstimos e financiamentos com prévia da tabela antes de salvar.

## Escopo

Stepper (não desenhado; seguir o vocabulário dos diálogos existentes), uma etapa por vez, com "Voltar" e "Continuar":

1. **Contrato**: tipo (empréstimo, financiamento), credor, valor contratado, data da contratação.
2. **Destino do valor**: "Creditado em conta" ou "Pago a terceiro", com explicação curta de como cada um afeta as despesas (3.3); conta de crédito se creditado; opção "Registrar a entrada do valor na conta" (padrão ligado para dívida nova, desligado para dívida antiga); categoria para "pago a terceiro".
3. **Condições**: sistema (Price, SAC, Parcela informada), taxa mensal ou valor da parcela, número de parcelas, data da 1ª parcela, conta de débito.
4. **Parcelas já pagas antes do cadastro**: quantas (ficam "Paga antes do cadastro", sem movimento nem despesa).
5. **Prévia e confirmação**: tabela completa (T01-11, T01-12), taxa implícita quando for parcela informada, diferença da última parcela, total de juros; botão "Salvar dívida".

- Erros inline em cada etapa (por exemplo, "As parcelas somam menos que o valor contratado").
- Gravação da dívida + parcelas (+ captação, se marcada) num único comando.

## Fora do escopo

Editar contrato depois de salvo (não previsto na spec; só "Amortizar").

## Passos

1. Implementar o stepper com um schema de formulário por etapa.
2. Testes Playwright com os dois exemplos do seed e o caso rejeitado de 11.5.

## Critérios de aceite

- [ ] R$ 300,00 × 12 com valor de R$ 4.800,00 é rejeitado na etapa 3 com a mensagem; R$ 450,00 × 12 mostra taxa implícita perto de 1,86% a.m. (11.5).
- [ ] Price R$ 40.000,00, 1,49%, 48x mostra saldo final R$ 0,00 na prévia (11.5).
- [ ] Empréstimo creditado em conta com "Registrar a entrada" marcado aumenta o Saldo em contas e não muda o Resultado.
