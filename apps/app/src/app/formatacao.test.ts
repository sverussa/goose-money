import { centavos, competencia, D, dataCivil, type Razao } from '@goose-money/core';
import { describe, expect, it } from 'vitest';

import {
  formatarData,
  formatarMes,
  formatarMesCurto,
  formatarMoeda,
  formatarMoedaCurta,
  formatarPercentual,
  formatarTaxa,
} from './formatacao';

// O Intl separa "R$" do número com espaço não separável.
const nb = (s: string) => s.replace(/ /g, ' ');

describe('formatarMoeda', () => {
  it.each([
    [-8990, '−R$ 89,90'],
    [8990, 'R$ 89,90'],
    [0, 'R$ 0,00'],
    [-0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [-5, '−R$ 0,05'],
    [123456789, 'R$ 1.234.567,89'],
    [-123456789, '−R$ 1.234.567,89'],
    [900719925474099, 'R$ 9.007.199.254.740,99'],
  ])('%d centavos → %s', (c, texto) => {
    expect(formatarMoeda(centavos(c))).toBe(nb(texto));
  });

  it('nunca usa hífen nem parênteses', () => {
    const t = formatarMoeda(centavos(-8990));
    expect(t).not.toMatch(/[-()]/);
    expect(t.startsWith('−')).toBe(true);
  });
});

describe('formatarMoedaCurta', () => {
  it.each([
    [123456, 'R$ 1,2 mil'],
    [-123456, '−R$ 1,2 mil'],
    [345000000, 'R$ 3,5 mi'],
    [9990, 'R$ 99,9'],
    [0, 'R$ 0'],
  ])('%d centavos → %s', (c, texto) => {
    expect(formatarMoedaCurta(centavos(c))).toBe(nb(texto));
  });
});

describe('formatarPercentual', () => {
  const valor = (v: string): Razao => ({ tipo: 'valor', valor: new D(v) });
  it.each<[Razao, string]>([
    [valor('0.25'), '25,0%'],
    [valor('0.12345'), '12,3%'],
    [valor('-0.0789'), '−7,9%'],
    [valor('0'), '0,0%'],
    [valor('12.5'), '1.250,0%'],
    [{ tipo: 'indisponivel' }, '—'],
    [{ tipo: 'novo' }, 'Novo'],
  ])('%o → %s', (r, texto) => {
    expect(formatarPercentual(r)).toBe(texto);
  });
});

describe('formatarTaxa', () => {
  it.each([
    ['0.0149', '1,49%'],
    ['0.01', '1,00%'],
    ['0.0149235', '1,4924%'],
    ['0', '0,00%'],
  ])('%s → %s', (i, texto) => {
    expect(formatarTaxa(i)).toBe(texto);
    expect(formatarTaxa(new D(i))).toBe(texto);
  });
});

describe('datas e meses', () => {
  it('data civil em dd/mm/aaaa', () => {
    expect(formatarData(dataCivil('2026-11-04'))).toBe('04/11/2026');
  });
  it.each([
    ['2026-11', 'Novembro 2026', 'nov/2026'],
    ['2027-01', 'Janeiro 2027', 'jan/2027'],
    ['2026-03', 'Março 2026', 'mar/2026'],
  ])('%s → %s e %s', (c, longo, curto) => {
    expect(formatarMes(competencia(c))).toBe(longo);
    expect(formatarMesCurto(competencia(c))).toBe(curto);
  });
});
