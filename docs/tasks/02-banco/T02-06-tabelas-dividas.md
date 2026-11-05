# T02-06 · Tabelas de dívidas

| Etapa | Contexto | Depende de | Branch |
| --- | --- | --- | --- |
| 2 · Banco | Dívidas | T02-04 | `feat/db-dividas` |

**Referências:** `docs/MODELO-DADOS.md` · PROMPT 3.7, 6.6, 9.4 · DECISOES D3

## Objetivo

Criar `dividas` e `parcelas_divida`, com as parcelas gravadas (D3).

## Escopo

- `V009__dividas.sql`:
  - `dividas`: tipo, credor, `valor_contratado`, `destino_do_valor` (`creditado_em_conta`, `pago_a_terceiro`), `sistema` (`price`, `sac`, `parcela_informada`), taxa mensal (`numeric(12,8)`, nula para parcela informada até ser calculada), número de parcelas, data da 1ª, conta de débito, categoria
  - `parcelas_divida`: número, vencimento, valor, juros, amortização, saldo devedor após, status pago, `paga_antes_do_cadastro`, lançamento de pagamento (opcional)
- Invariantes adiadas (como em T02-05): soma das amortizações das parcelas ativas = valor contratado e saldo devedor da última = 0.
- Parcela paga não pode ter valor, juros ou amortização alterados (trigger).
- Checklist de 12.2; incluir na lista de `gravar`; regenerar tipos.

## Fora do escopo

Cálculo das tabelas (core, T01-11, T01-12).

## Passos

1. Migração e testes.

## Critérios de aceite

- [ ] Gravar a tabela Price do seed passa nas invariantes.
- [ ] Alterar o valor de uma parcela paga é recusado.
- [ ] Amortização que deixa saldo final diferente de zero é recusada no fim da transação.
