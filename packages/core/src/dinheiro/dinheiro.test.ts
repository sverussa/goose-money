import { describe, expect, it } from 'vitest';
import {
  centavos,
  comparar,
  D,
  deMascara,
  mais,
  menos,
  negar,
  paraCentavos,
  percentual,
  ratear,
  somar,
} from './index';

const c = centavos;

describe('centavos', () => {
  it('aceita inteiros seguros', () => {
    expect(c(1590)).toBe(1590);
    expect(c(-3)).toBe(-3);
  });

  it.each([1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejeita %s', (n) => {
    expect(() => c(n)).toThrow();
  });
});

describe('operações', () => {
  it('soma, subtrai, nega e compara', () => {
    expect(mais(c(100), c(250))).toBe(350);
    expect(menos(c(100), c(250))).toBe(-150);
    expect(negar(c(100))).toBe(-100);
    expect(negar(c(0))).toBe(0);
    expect(Object.is(negar(c(0)), -0)).toBe(false);
    expect(comparar(c(1), c(2))).toBe(-1);
    expect(comparar(c(2), c(2))).toBe(0);
    expect(comparar(c(3), c(2))).toBe(1);
  });

  it('somar uma lista, inclusive vazia', () => {
    expect(somar([c(1), c(2), c(3)])).toBe(6);
    expect(somar([])).toBe(0);
  });

  it('erra quando a soma sai do inteiro seguro', () => {
    expect(() => mais(c(Number.MAX_SAFE_INTEGER), c(1))).toThrow();
  });
});

describe('D e paraCentavos', () => {
  it('arredonda meio para cima, longe do zero', () => {
    expect(paraCentavos(D('0.5'))).toBe(1);
    expect(paraCentavos(D('-0.5'))).toBe(-1);
    expect(paraCentavos(D('1.49'))).toBe(1);
    expect(paraCentavos(D('2.5'))).toBe(3);
  });

  it('não devolve -0', () => {
    expect(Object.is(paraCentavos(D('-0.4')), -0)).toBe(false);
  });

  it('usa 34 dígitos significativos', () => {
    expect(D.precision).toBe(34);
    expect(D(1).div(3).toString()).toBe('0.' + '3'.repeat(34));
  });
});

describe('ratear', () => {
  it('resto na primeira parcela (cartão, 11.3)', () => {
    expect(ratear(c(100000), 3, 'primeira')).toEqual([33334, 33333, 33333]);
  });

  it('resto na última parcela (dívida com taxa zero, 11.5)', () => {
    expect(ratear(c(100000), 3, 'ultima')).toEqual([33333, 33333, 33334]);
    expect(ratear(c(120000), 12, 'ultima')).toEqual(Array(12).fill(10000));
  });

  it('total menor que n deixa parcelas zeradas', () => {
    expect(ratear(c(2), 3, 'primeira')).toEqual([2, 0, 0]);
    expect(ratear(c(0), 2, 'ultima')).toEqual([0, 0]);
  });

  it('a soma é sempre igual ao total', () => {
    for (let i = 0; i < 2000; i++) {
      const total = c(Math.floor(Math.random() * 10_000_000_000));
      const n = 1 + Math.floor(Math.random() * 480);
      for (const resto of ['primeira', 'ultima'] as const) {
        const parcelas = ratear(total, n, resto);
        expect(parcelas).toHaveLength(n);
        expect(somar(parcelas), `${String(total)} em ${String(n)}x`).toBe(total);
      }
    }
  });

  it('é exato perto do maior inteiro seguro', () => {
    const total = c(Number.MAX_SAFE_INTEGER);
    expect(somar(ratear(total, 7, 'primeira'))).toBe(total);
  });

  it.each([0, -1, 1.5])('rejeita n = %s', (n) => {
    expect(() => ratear(c(100), n, 'primeira')).toThrow();
  });

  it('rejeita total negativo', () => {
    expect(() => ratear(c(-1), 2, 'ultima')).toThrow();
  });
});

describe('percentual', () => {
  it('devolve a fração em Decimal', () => {
    expect(percentual(c(25), c(100))?.toString()).toBe('0.25');
    expect(percentual(c(1), c(3))?.toString()).toBe('0.' + '3'.repeat(34));
  });

  it('devolve null quando o todo é zero (3.10)', () => {
    expect(percentual(c(10), c(0))).toBeNull();
  });
});

describe('deMascara', () => {
  it('preenche da direita (7.3)', () => {
    expect(deMascara('1590')).toBe(1590);
    expect(deMascara('5')).toBe(5);
    expect(deMascara('007')).toBe(7);
    expect(deMascara('')).toBe(0);
  });

  it('ignora o que não é dígito', () => {
    expect(deMascara('R$ 1.234,56')).toBe(123456);
  });

  it('rejeita valores além do inteiro seguro', () => {
    expect(() => deMascara('9'.repeat(17))).toThrow();
  });
});
