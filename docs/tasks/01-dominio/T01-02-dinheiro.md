# T01-02 · Dinheiro: centavos, Decimal e rateios

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 1 · Domínio | Fundamentos | T00-02 | `feat/core-dinheiro` |

**Referências:** PROMPT 2.2, 3.6 (rateio), 3.7 (taxa zero), 7.3 (máscara)

## Objetivo

Criar `packages/core/src/dinheiro/`, a base de todo cálculo monetário.

## Escopo

- Tipo `Centavos` (número inteiro com marca de tipo, `number & { readonly __centavos: true }`) e a função `centavos(n)`, que lança erro se `n` não for inteiro seguro.
- Soma, subtração, negação, comparação e `somar(lista)` sobre `Centavos`.
- `Decimal` configurado uma vez: `Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_UP })`, exportado como `D`.
- `paraCentavos(d: Decimal)`: arredonda meio para cima e devolve `Centavos` (o único ponto de conversão).
- `ratear(total, n, resto: 'primeira' | 'ultima')`:
  - parcela base = parte inteira de total ÷ n; o resto vai para a 1ª (cartão, 3.6) ou para a última (dívida com taxa zero, 3.7)
  - erro se `n < 1` ou `total < 0`
- `percentual(parte, todo)`: `Decimal` ou `null` quando `todo = 0` (quem exibe mostra "—", 3.10).
- `deMascara(digitos: string)`: converte o que o usuário digita da direita para a esquerda (`"1590"` → 1590 centavos = R$ 15,90, 7.3).
- **Sem formatação de moeda**: ela é da interface (`MoneyText`, T04-04).

## Fora do escopo

Juros e tabelas de dívida (T01-11).

## Passos

1. Escrever os módulos com testes antes (TDD).
2. Exportar pelo `src/index.ts`.

## Critérios de aceite

- [ ] `ratear(100000, 3, 'primeira')` = [33334, 33333, 33333] (11.3).
- [ ] `ratear(100000, 3, 'ultima')` = [33333, 33333, 33334] e `ratear(120000, 12, 'ultima')` = 12 × 10000 (11.5).
- [ ] A soma do rateio é sempre igual ao total (teste com valores aleatórios).
- [ ] `paraCentavos(D('0.5'))` = 1 e `paraCentavos(D('-0.5'))` = −1 (meio para cima, longe do zero).
- [ ] `centavos(1.5)` lança erro.
- [ ] Nenhum `number` de ponto flutuante em cálculo intermediário.
