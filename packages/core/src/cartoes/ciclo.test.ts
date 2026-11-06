import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import type { Cartao, CartaoCiclo } from '../modelo';
import {
  cicloVigente,
  datasDaFatura,
  faturaAberta,
  faturaDaCompra,
  previaDoCadastro,
  primeiraFaturaNaoFechada,
} from './ciclo';

const c = competencia;
const d = dataCivil;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(99),
  isDeleted: false,
};
const cartao = (n: number): Cartao => ({
  ...controle,
  id: id(n),
  nome: `Cartão ${String(n)}`,
  instituicao: null,
  cor: 'cartao-a',
  limite: 1_000_000 as Cartao['limite'],
  contaPagamentoId: id(50),
  competenciaInicial: c('2026-01'),
  arquivado: false,
});
let seq = 100;
const ciclo = (
  cartaoId: string,
  vigenteDesde: string,
  diaFechamento: number,
  diaVencimento: number,
  extra: Partial<CartaoCiclo> = {},
): CartaoCiclo => ({
  ...controle,
  id: id(seq++),
  cartaoId,
  vigenteDesde: c(vigenteDesde),
  diaFechamento,
  diaVencimento,
  ...extra,
});

const A = cartao(1);
const B = cartao(2);
const ciclos = [ciclo(A.id, '2026-01', 3, 10), ciclo(B.id, '2026-01', 25, 5)];
const vence = (cartao: Cartao, data: string, cs = ciclos) =>
  datasDaFatura(cartao, cs, faturaDaCompra(cartao, cs, d(data))).vencimento;

describe('faturaDaCompra (11.3)', () => {
  it('Cartão A (fecha 3, vence 10): 02/11 → vence 10/11; 03/11 → 10/12', () => {
    expect(vence(A, '2026-11-02')).toBe('2026-11-10');
    expect(vence(A, '2026-11-03')).toBe('2026-12-10');
  });

  it('Cartão B (fecha 25, vence 5): 24/11 → vence 05/12; 25/11 → 05/01', () => {
    expect(vence(B, '2026-11-24')).toBe('2026-12-05');
    expect(vence(B, '2026-11-25')).toBe('2027-01-05');
  });

  it('compra em 28/12 no cartão que fecha 25 e vence 5 cai na fatura de fevereiro seguinte', () => {
    expect(faturaDaCompra(B, ciclos, d('2026-12-28'))).toBe('2027-02');
  });

  it('virada de ano com F < V: 31/12 no cartão A cai na fatura de janeiro', () => {
    expect(faturaDaCompra(A, ciclos, d('2026-12-31'))).toBe('2027-01');
    expect(faturaDaCompra(A, ciclos, d('2027-01-03'))).toBe('2027-02');
  });
});

describe('datasDaFatura', () => {
  it('F < V fecha no mesmo mês; F ≥ V fecha no mês anterior', () => {
    expect(datasDaFatura(A, ciclos, c('2026-11'))).toEqual({
      fechamento: '2026-11-03',
      vencimento: '2026-11-10',
    });
    expect(datasDaFatura(B, ciclos, c('2027-01'))).toEqual({
      fechamento: '2026-12-25',
      vencimento: '2027-01-05',
    });
  });

  it('fechamento no dia 31: em fevereiro fecha no 28, ou 29 em ano bissexto (11.3)', () => {
    const C = cartao(3);
    const cs = [ciclo(C.id, '2026-01', 31, 10)];
    expect(datasDaFatura(C, cs, c('2027-03')).fechamento).toBe('2027-02-28');
    expect(datasDaFatura(C, cs, c('2028-03')).fechamento).toBe('2028-02-29');
    expect(faturaDaCompra(C, cs, d('2028-02-28'))).toBe('2028-03');
    expect(faturaDaCompra(C, cs, d('2028-02-29'))).toBe('2028-04');
  });

  it('vencimento no dia 31 vira o último dia do mês (3.11)', () => {
    const C = cartao(3);
    const cs = [ciclo(C.id, '2026-01', 20, 31)];
    expect(datasDaFatura(C, cs, c('2027-02')).vencimento).toBe('2027-02-28');
  });

  it('nova versão vigente desde 2027-01: faturas de 2026 mantêm as datas antigas', () => {
    const cs = [...ciclos, ciclo(A.id, '2027-01', 20, 28)];
    expect(datasDaFatura(A, cs, c('2026-12'))).toEqual({
      fechamento: '2026-12-03',
      vencimento: '2026-12-10',
    });
    expect(datasDaFatura(A, cs, c('2027-01'))).toEqual({
      fechamento: '2027-01-20',
      vencimento: '2027-01-28',
    });
    expect(faturaDaCompra(A, cs, d('2026-12-02'))).toBe('2026-12');
    expect(faturaDaCompra(A, cs, d('2026-12-03'))).toBe('2027-01');
    expect(faturaDaCompra(A, cs, d('2027-01-20'))).toBe('2027-02');
  });

  it('mudança que antecipa o fechamento: a compra cai na primeira fatura que fecha depois dela', () => {
    // velho: fecha 3 de M; novo (desde 2027-01): fecha 1 de M−1, antes do fechamento de 2026-12
    const cs = [ciclo(A.id, '2026-01', 3, 10), ciclo(A.id, '2027-01', 1, 1)];
    expect(datasDaFatura(A, cs, c('2027-01')).fechamento).toBe('2026-12-01');
    expect(faturaDaCompra(A, cs, d('2026-12-02'))).toBe('2026-12');
    expect(faturaDaCompra(A, cs, d('2026-12-03'))).toBe('2027-02');
  });
});

describe('cicloVigente', () => {
  const cs = [ciclo(A.id, '2027-01', 20, 28), ciclo(A.id, '2026-05', 3, 10)];

  it('pega a versão com maior vigenteDesde ≤ competência', () => {
    expect(cicloVigente(cs, c('2026-12')).vigenteDesde).toBe('2026-05');
    expect(cicloVigente(cs, c('2027-01')).vigenteDesde).toBe('2027-01');
    expect(cicloVigente(cs, c('2030-06')).vigenteDesde).toBe('2027-01');
  });

  it('antes da primeira versão usa a mais antiga (compras anteriores ao cadastro)', () => {
    expect(cicloVigente(cs, c('2025-01')).vigenteDesde).toBe('2026-05');
  });

  it('sem versão falha', () => {
    expect(() => cicloVigente([], c('2026-01'))).toThrow(RangeError);
  });

  it('datasDaFatura ignora ciclos de outros cartões e excluídos', () => {
    const cs2 = [...ciclos, ciclo(A.id, '2026-06', 20, 28, { isDeleted: true })];
    expect(datasDaFatura(A, cs2, c('2026-11')).vencimento).toBe('2026-11-10');
    expect(() => datasDaFatura(cartao(9), cs2, c('2026-11'))).toThrow(RangeError);
  });
});

describe('faturaAberta e primeiraFaturaNaoFechada', () => {
  it('a aberta recebe as compras de hoje; no dia do fechamento já é a seguinte', () => {
    expect(faturaAberta(A, ciclos, d('2026-11-04'))).toBe('2026-12');
    expect(faturaAberta(B, ciclos, d('2026-11-04'))).toBe('2026-12');
    expect(faturaAberta(B, ciclos, d('2026-11-25'))).toBe('2027-01');
  });

  it('a mudança de ciclo vale a partir da aberta', () => {
    expect(primeiraFaturaNaoFechada(A, ciclos, d('2026-11-02'))).toBe('2026-11');
    expect(primeiraFaturaNaoFechada(A, ciclos, d('2026-11-03'))).toBe('2026-12');
  });
});

describe('previaDoCadastro (6.5)', () => {
  it('fatura em que caem as compras de hoje, com fechamento e vencimento', () => {
    expect(previaDoCadastro(25, 5, d('2026-11-04'))).toEqual({
      competencia: '2026-12',
      fechamento: '2026-11-25',
      vencimento: '2026-12-05',
    });
    expect(previaDoCadastro(3, 10, d('2026-11-04'))).toEqual({
      competencia: '2026-12',
      fechamento: '2026-12-03',
      vencimento: '2026-12-10',
    });
  });
});
