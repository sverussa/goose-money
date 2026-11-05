# T01-19 · Gerador de dados de exemplo

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Seed | T01-17 | `feat/core-seed` |

**Referências:** PROMPT 10 · DESIGN-HANDOFF 2 (valores ilustrativos)

## Objetivo

Criar `gerarSeed(hoje, criadoPor)` em `packages/core/src/seed/`: os dados de exemplo da seção 10, com datas relativas a "hoje".

## Escopo

- Tudo da seção 10, com M0 = mês de `hoje`:
  - 4 contas (Investimentos fora do total), saldo inicial no último dia de M−4
  - rendas: Salário (dia 5, auto), Freelance com duas versões, 13º previsto
  - gastos fixos: Aluguel, Internet, Academia, Energia no dia 31 (M−1 confirmada com R$ 212,40), Streaming no Cartão A; IPVA previsto
  - Cartão A (3/10) e Cartão B (25/5), conta de pagamento = conta corrente
  - Notebook 10x, Geladeira 6x, Fone 3x, 15 a 25 compras à vista por mês (uma no dia exato do fechamento), estorno de R$ 89,90
  - fatura do Cartão B de M−1 paga em 60%, com transporte e encargo de R$ 38,70; fatura do Cartão A de M−2 paga com R$ 50,00 a mais
  - financiamento Price pago a terceiro (12 pagas antes do cadastro) e empréstimo de parcela informada creditado em conta (3 pagas antes do cadastro)
  - histórico de M−3 até hoje, duas transferências, um lançamento anterior ao saldo inicial, dois "A classificar", Freelance atrasado se o dia 20 já passou
- Categorias padrão e de sistema (conforme T02-08).
- Valores aleatórios com **semente fixa** derivada de `hoje`: o mesmo dia gera os mesmos dados.
- O resultado passa nos schemas de T01-05 e nas invariantes de cada contexto.

## Fora do escopo

Gravar no banco (T02-10) e o botão em Configurações (T05-29).

## Passos

1. Implementar por blocos (contas, cartões, recorrências, dívidas, histórico).
2. Testes de que cada caso de borda da seção 10 existe no resultado.

## Critérios de aceite

- [ ] `gerarSeed('2026-11-04', id)` produz os 4 casos de borda de cartão (dia do fechamento, estorno, pagamento parcial, pagamento a mais).
- [ ] Com hoje = 04/11/2026, os indicadores da Barra ficam próximos dos valores ilustrativos de `TotalsBar.dc.html` (diferenças são esperadas por causa da aleatoriedade; registrar os valores obtidos).
- [ ] Gerar duas vezes no mesmo dia dá resultados idênticos.
- [ ] Todos os registros passam nos schemas e invariantes.
