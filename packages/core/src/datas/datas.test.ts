import { describe, expect, it } from 'vitest';
import {
  compararDatas,
  competencia,
  competenciaDe,
  dataCivil,
  diaNoMes,
  maxData,
  mesesEntre,
  minData,
  primeiroDia,
  somarDias,
  somarMeses,
  ultimaData,
  ultimoDiaDoMes,
} from './index';

const d = dataCivil;
const c = competencia;

describe('dataCivil', () => {
  it('aceita datas reais', () => {
    expect(d('2026-11-04')).toBe('2026-11-04');
    expect(d('2028-02-29')).toBe('2028-02-29');
  });

  it.each(['2026-02-30', '2026-02-29', '1900-02-29', '2026-13-01', '2026-1-01', '26-01-01', ''])(
    'rejeita %j',
    (s) => {
      expect(() => d(s)).toThrow();
    },
  );

  it('aceita 29/02 de 2000 (bissexto por 400)', () => {
    expect(d('2000-02-29')).toBe('2000-02-29');
  });
});

describe('competencia', () => {
  it('valida e extrai de uma data', () => {
    expect(c('2026-11')).toBe('2026-11');
    expect(competenciaDe(d('2026-11-04'))).toBe('2026-11');
    expect(() => c('2026-00')).toThrow();
    expect(() => c('2026-13')).toThrow();
  });
});

describe('comparação', () => {
  it('compara como texto', () => {
    expect(compararDatas(d('2026-01-31'), d('2026-02-01'))).toBe(-1);
    expect(compararDatas(d('2026-02-01'), d('2026-02-01'))).toBe(0);
    expect(compararDatas(d('2027-01-01'), d('2026-12-31'))).toBe(1);
    expect(maxData(d('2026-01-31'), d('2026-02-01'))).toBe('2026-02-01');
    expect(minData(d('2026-01-31'), d('2026-02-01'))).toBe('2026-01-31');
  });
});

describe('somarDias', () => {
  it('vira mês, ano e passa por 29/02', () => {
    expect(somarDias(d('2026-01-31'), 1)).toBe('2026-02-01');
    expect(somarDias(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(somarDias(d('2028-02-28'), 1)).toBe('2028-02-29');
    expect(somarDias(d('2026-03-01'), -1)).toBe('2026-02-28');
    expect(somarDias(d('2026-11-04'), 0)).toBe('2026-11-04');
  });

  it('não sofre com horário de verão', () => {
    expect(somarDias(d('2018-11-03'), 1)).toBe('2018-11-04');
  });
});

describe('competências', () => {
  it('somarMeses vira o ano nos dois sentidos', () => {
    expect(somarMeses(c('2026-12'), 1)).toBe('2027-01');
    expect(somarMeses(c('2026-01'), -1)).toBe('2025-12');
    expect(somarMeses(c('2026-11'), 26)).toBe('2029-01');
  });

  it('mesesEntre', () => {
    expect(mesesEntre(c('2026-11'), c('2027-02'))).toBe(3);
    expect(mesesEntre(c('2027-02'), c('2026-11'))).toBe(-3);
    expect(mesesEntre(c('2026-11'), c('2026-11'))).toBe(0);
  });

  it('ultimoDiaDoMes considera ano bissexto', () => {
    expect(ultimoDiaDoMes(c('2026-02'))).toBe(28);
    expect(ultimoDiaDoMes(c('2028-02'))).toBe(29);
    expect(ultimoDiaDoMes(c('2100-02'))).toBe(28);
    expect(ultimoDiaDoMes(c('2000-02'))).toBe(29);
    expect(ultimoDiaDoMes(c('2026-04'))).toBe(30);
    expect(ultimoDiaDoMes(c('2026-12'))).toBe(31);
  });

  it('diaNoMes: dia inexistente vira o último dia (3.11)', () => {
    expect(diaNoMes(c('2026-02'), 31)).toBe('2026-02-28');
    expect(diaNoMes(c('2028-02'), 31)).toBe('2028-02-29');
    expect(diaNoMes(c('2026-11'), 31)).toBe('2026-11-30');
    expect(diaNoMes(c('2026-11'), 5)).toBe('2026-11-05');
  });

  it.each([0, 32, 1.5])('diaNoMes rejeita dia %s', (dia) => {
    expect(() => diaNoMes(c('2026-11'), dia)).toThrow();
  });

  it('primeiroDia e ultimaData', () => {
    expect(primeiroDia(c('2026-11'))).toBe('2026-11-01');
    expect(ultimaData(c('2026-11'))).toBe('2026-11-30');
  });
});
