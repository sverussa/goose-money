import { describe, expect, it } from 'vitest';
import { dataCivil } from '../datas';
import { centavos, D, somar } from '../dinheiro';
import { type LinhaTabela, tabelaPrice, tabelaSac } from './tabelas';

const c = centavos;
const d = dataCivil;
const zero = new D(0);

/** Invariantes de D3 e da linha: soma das amortizações = PV, SD final = 0, parcela = juros + amortização. */
function conferir(linhas: LinhaTabela[], pv: number) {
  expect(somar(linhas.map((l) => l.amortizacao))).toBe(pv);
  expect(linhas.at(-1)?.saldoDevedor).toBe(0);
  let sd = pv;
  linhas.forEach((l, k) => {
    expect(l.numero).toBe(k + 1);
    expect(l.valor).toBe(l.juros + l.amortizacao);
    sd -= l.amortizacao;
    expect(l.saldoDevedor).toBe(sd);
  });
}

describe('tabelaPrice', () => {
  const linhas = tabelaPrice(c(4_000_000), new D('0.0149'), 48, d('2026-12-10'));

  it('R$ 40.000,00 a 1,49% a.m. em 48x zera o saldo (11.5)', () => {
    expect(linhas).toHaveLength(48);
    conferir(linhas, 4_000_000);
  });

  it('parcela de R$ 1.172,49 até a 47ª e última de R$ 1.172,71 (handoff 6, item 6)', () => {
    linhas.slice(0, 47).forEach((l) => {
      expect(l.valor).toBe(117_249);
    });
    expect(linhas[46]?.saldoDevedor).toBe(115_549);
    expect(linhas[47]).toMatchObject({ juros: 1_722, amortizacao: 115_549, valor: 117_271 });
    expect(linhas[0]).toMatchObject({ juros: 59_600, amortizacao: 57_649 });
  });

  it('vence mês a mês a partir da 1ª', () => {
    expect(linhas[0]?.vencimento).toBe('2026-12-10');
    expect(linhas[1]?.vencimento).toBe('2027-01-10');
    expect(linhas[47]?.vencimento).toBe('2030-11-10');
  });

  it('taxa zero: R$ 1.200,00 em 12x dá 12 × R$ 100,00, sem juros (11.5)', () => {
    const t = tabelaPrice(c(120_000), zero, 12, d('2027-01-05'));
    expect(t.map((l) => l.valor)).toEqual(Array(12).fill(10_000));
    expect(t.every((l) => l.juros === 0)).toBe(true);
    conferir(t, 120_000);
  });

  it('taxa zero: R$ 1.000,00 em 3x dá 333,33 + 333,33 + 333,34 (11.5)', () => {
    const t = tabelaPrice(c(100_000), zero, 3, d('2027-01-05'));
    expect(t.map((l) => l.valor)).toEqual([33_333, 33_333, 33_334]);
    conferir(t, 100_000);
  });

  it('parcela única quita tudo com um mês de juros', () => {
    const t = tabelaPrice(c(100_000), new D('0.01'), 1, d('2027-01-05'));
    expect(t).toEqual([
      {
        numero: 1,
        vencimento: '2027-01-05',
        valor: 101_000,
        juros: 1_000,
        amortizacao: 100_000,
        saldoDevedor: 0,
      },
    ]);
  });

  it('aceita taxa em Decimal de outra configuração', async () => {
    const { default: Decimal } = await import('decimal.js');
    expect(tabelaPrice(c(4_000_000), new Decimal('0.0149'), 48, d('2026-12-10'))).toEqual(linhas);
  });
});

describe('tabelaSac', () => {
  it('amortiza a parte inteira de PV ÷ n e a última leva o resto', () => {
    const t = tabelaSac(c(100_000), new D('0.01'), 3, d('2027-01-05'));
    expect(t.map((l) => l.amortizacao)).toEqual([33_333, 33_333, 33_334]);
    // J = round(SD × i): 1000; 666,67 → 667; 333,34 → 333
    expect(t.map((l) => l.juros)).toEqual([1_000, 667, 333]);
    conferir(t, 100_000);
  });

  it('R$ 40.000,00 a 1,49% a.m. em 48x mantém os invariantes', () => {
    const t = tabelaSac(c(4_000_000), new D('0.0149'), 48, d('2026-12-10'));
    expect(t[0]).toMatchObject({ amortizacao: 83_333, juros: 59_600, valor: 142_933 });
    conferir(t, 4_000_000);
  });

  it('taxa zero: rateio com resto na última e juros zero', () => {
    const t = tabelaSac(c(100_000), zero, 3, d('2027-01-05'));
    expect(t.map((l) => [l.valor, l.juros])).toEqual([
      [33_333, 0],
      [33_333, 0],
      [33_334, 0],
    ]);
  });
});

describe('vencimentos', () => {
  it('dia 31 vira o último dia dos meses curtos (3.11)', () => {
    const t = tabelaSac(c(400), zero, 4, d('2027-01-31'));
    expect(t.map((l) => l.vencimento)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
  });
});

describe('entradas inválidas', () => {
  it.each([0, -1, 1.5])('rejeita n = %j', (n) => {
    expect(() => tabelaPrice(c(100), new D('0.01'), n, d('2027-01-05'))).toThrow(RangeError);
    expect(() => tabelaSac(c(100), new D('0.01'), n, d('2027-01-05'))).toThrow(RangeError);
  });

  it('rejeita taxa negativa e valor não positivo', () => {
    expect(() => tabelaPrice(c(100), new D('-0.01'), 2, d('2027-01-05'))).toThrow(RangeError);
    expect(() => tabelaSac(c(0), zero, 2, d('2027-01-05'))).toThrow(RangeError);
    expect(() => tabelaPrice(c(-100), zero, 2, d('2027-01-05'))).toThrow(RangeError);
  });
});
