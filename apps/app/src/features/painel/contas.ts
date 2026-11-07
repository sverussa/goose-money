import {
  type Centavos,
  competenciaDe,
  type Conta,
  type Derivado,
  extratoMensal,
  menos,
  saldo,
  somarDias,
} from '@goose-money/core';

// Aba Saldos (6.2): os números de cada card de conta, do core.

/** Variação no mês: entradas − saídas do extrato do mês corrente (3.4); `null` sem saldo. */
export function variacaoNoMes(d: Derivado, conta: Conta): Centavos | null {
  const e = extratoMensal(d.fatos, conta.id, competenciaDe(d.hoje));
  return e.abertura === null ? null : menos(e.entradas, e.saidas);
}

/** Saldo no fim de cada um dos últimos 30 dias, até hoje; dias antes do saldo inicial ficam de fora. */
export const sparklineDe30Dias = (d: Derivado, conta: Conta): Centavos[] =>
  Array.from({ length: 30 }, (_, i) => saldo(d.fatos, conta.id, somarDias(d.hoje, i - 29))).filter(
    (v): v is Centavos => v !== null,
  );
