# T01-15 · Derivação única dos fatos

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Motor | T01-06, T01-10, T01-12, T01-13 | `feat/core-derivacao` |

**Referências:** DECISOES D13 · PROMPT 9.3 (desempenho)

## Objetivo

Criar `derivar(fatos, hoje)` em `packages/core/src/motor/derivar.ts`: uma passada que calcula o que vários indicadores compartilham, para nada ser recalculado duas vezes.

## Escopo

- Resultado `Derivado` com:
  - índices por id e por relação (parcelas por compra, versões por recorrência, ciclos por cartão)
  - faturas montadas por cartão (T01-09)
  - saldo atual por conta e saldo por fim de mês para os gráficos de evolução
  - tabelas de dívida com status (T01-12)
  - ocorrências do mês corrente e pendentes (T01-13)
- Todas as funções de indicador (T01-16, T01-17) recebem `Derivado`, não `Fatos`.
- Função pura: mesma entrada, mesmo resultado; sem cache interno (quem memoriza é o app, T03-03).

## Fora do escopo

Os indicadores em si.

## Passos

1. Definir o tipo `Derivado`.
2. Implementar reaproveitando as funções de contexto.
3. Teste de desempenho com 10 mil lançamentos gerados.

## Critérios de aceite

- [ ] `derivar` com 10 mil lançamentos, 3 cartões, 2 dívidas e 8 recorrências roda em menos de 50 ms numa máquina de desenvolvimento (metade do orçamento de 9.3).
- [ ] Chamar `derivar` duas vezes com os mesmos fatos dá resultados iguais (`toEqual`).
- [ ] Nenhuma função de indicador recebe `Fatos` diretamente (checado na revisão).
