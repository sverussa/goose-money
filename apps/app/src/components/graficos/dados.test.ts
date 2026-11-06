import { centavos } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  corDoTema,
  gerarCsv,
  type Linha,
  participacao,
  resumirSeries,
  semDados,
  type Serie,
  valorDe,
} from './dados';

// O Intl separa "R$" do número com espaço não separável.
const nb = (s: string) => s.replace(/R\$ /g, 'R$\u00a0');
const series: Serie[] = [
  { chave: 'receitas', rotulo: 'Receitas', cor: 'income' },
  { chave: 'despesas', rotulo: 'Despesas', cor: 'expense' },
];
const dados: Linha[] = [
  { mes: 'set/2026', receitas: 650000, despesas: 512345 },
  { mes: 'out/2026', receitas: 700000, despesas: 498010 },
  { mes: 'nov/2026', receitas: 120000, despesas: 89990 },
];

describe('resumirSeries', () => {
  it('total e maior valor de cada série', () => {
    expect(resumirSeries(dados, 'mes', series)).toBe(
      `${nb('Receitas: total R$ 14.700,00; maior valor R$ 7.000,00 em out/2026.')} ` +
        nb('Despesas: total R$ 11.003,45; maior valor R$ 5.123,45 em set/2026.'),
    );
  });
  it('sem pontos ou tudo zero vira "Sem dados neste período"', () => {
    expect(resumirSeries([], 'mes', series)).toBe('Sem dados neste período');
    expect(resumirSeries([{ mes: 'nov', receitas: 0, despesas: 0 }], 'mes', series)).toBe(
      'Sem dados neste período',
    );
  });
  it('no modo privacidade não diz valores', () => {
    const r = resumirSeries(dados, 'mes', series, true);
    expect(r).toBe('Valores ocultos. Séries: Receitas, Despesas.');
    expect(r).not.toMatch(/R\$/);
  });
});

describe('valores que não são números', () => {
  it('NaN, Infinity e texto contam como zero', () => {
    expect(valorDe({ v: Number.NaN }, 'v')).toBe(0);
    expect(valorDe({ v: Number.POSITIVE_INFINITY }, 'v')).toBe(0);
    expect(valorDe({ v: 'x' }, 'v')).toBe(0);
    expect(
      semDados([{ m: 'nov', v: Number.NaN }], [{ chave: 'v', rotulo: 'V', cor: 'income' }]),
    ).toBe(true);
  });
  it('participação com total zero é "—", nunca NaN', () => {
    expect(participacao(centavos(0), centavos(0))).toBe('—');
    expect(participacao(centavos(2500), centavos(10000))).toBe('25,0%');
  });
});

describe('gerarCsv', () => {
  it('cabeçalho em português e uma linha por ponto', () => {
    const csv = gerarCsv(dados, { chave: 'mes', rotulo: 'Mês' }, series);
    expect(csv.trimEnd().split('\n')).toEqual([
      'Mês;Receitas;Despesas',
      'set/2026;6500,00;5123,45',
      'out/2026;7000,00;4980,10',
      'nov/2026;1200,00;899,90',
    ]);
  });
  it('negativos com hífen e campos com ; entre aspas', () => {
    const csv = gerarCsv([{ c: 'Casa; aluguel', v: -8990 }], { chave: 'c', rotulo: 'Categoria' }, [
      { chave: 'v', rotulo: 'Valor "líquido"', cor: 'expense' },
    ]);
    expect(csv).toBe('Categoria;"Valor ""líquido"""\n"Casa; aluguel";-89,90\n');
  });
});

describe('corDoTema', () => {
  it.each([
    ['income', 'var(--color-income)'],
    ['categorica-3', 'var(--color-cat-3)'],
    ['cartao-a', 'var(--color-cartao-a)'],
    [null, 'var(--color-cat-sistema)'],
  ])('%s → %s', (chave, cor) => {
    expect(corDoTema(chave)).toBe(cor);
  });
});
