import { describe, expect, it } from 'vitest';
import { dataCivil } from '../datas';
import {
  deslocar,
  granularidade,
  periodo,
  periodoAnterior,
  periodoDaUrl,
  periodoParaUrl,
  periodoPreset,
} from './index';

const hoje = dataCivil('2026-11-04');
const p = (de: string, ate: string) => periodo(dataCivil(de), dataCivil(ate));
const params = (o: { de?: string; ate?: string }) => ({
  get: (k: string) => o[k as keyof typeof o] ?? null,
});

describe('periodo', () => {
  it('aceita de ≤ ate e rejeita de > ate', () => {
    expect(p('2026-11-04', '2026-11-04')).toEqual({ de: '2026-11-04', ate: '2026-11-04' });
    expect(() => p('2026-11-05', '2026-11-04')).toThrow(RangeError);
  });
});

describe('periodoPreset (hoje = 04/11/2026, D37)', () => {
  it.each([
    ['este-mes', '2026-11-01', '2026-11-04'],
    ['mes-passado', '2026-10-01', '2026-10-31'],
    ['ultimos-3-meses', '2026-09-01', '2026-11-04'],
    ['ultimos-6-meses', '2026-06-01', '2026-11-04'],
    ['ultimos-12-meses', '2025-12-01', '2026-11-04'],
    ['este-ano', '2026-01-01', '2026-11-04'],
  ] as const)('%s = %s a %s', (preset, de, ate) => {
    expect(periodoPreset(preset, hoje)).toEqual({ de, ate });
  });

  it('mês passado em janeiro é dezembro do ano anterior', () => {
    expect(periodoPreset('mes-passado', dataCivil('2026-01-15'))).toEqual(
      p('2025-12-01', '2025-12-31'),
    );
  });
});

describe('periodoAnterior', () => {
  it('meses completos: ago–out/2026 → mai–jul/2026', () => {
    expect(periodoAnterior(p('2026-08-01', '2026-10-31'))).toEqual(p('2026-05-01', '2026-07-31'));
  });

  it('mês incompleto corta no mesmo dia: 01/09–04/11 → 01/06–04/08', () => {
    expect(periodoAnterior(p('2026-09-01', '2026-11-04'))).toEqual(p('2026-06-01', '2026-08-04'));
  });

  it('meses completos terminando em fevereiro vão até o último dia', () => {
    expect(periodoAnterior(p('2026-03-01', '2026-03-31'))).toEqual(p('2026-02-01', '2026-02-28'));
    expect(periodoAnterior(p('2026-02-01', '2026-02-28'))).toEqual(p('2026-01-01', '2026-01-31'));
  });

  it('"Este mês" no dia 1 compara com o dia 1 do mês anterior', () => {
    expect(periodoAnterior(p('2026-01-01', '2026-01-01'))).toEqual(p('2025-12-01', '2025-12-01'));
  });

  it('dia de corte inexistente vira o último dia do mês', () => {
    expect(periodoAnterior(p('2026-03-01', '2026-03-30'))).toEqual(p('2026-02-01', '2026-02-28'));
  });

  it('período que não começa no dia 1 recua a mesma quantidade de dias', () => {
    expect(periodoAnterior(p('2026-03-10', '2026-03-20'))).toEqual(p('2026-02-27', '2026-03-09'));
    expect(periodoAnterior(p('2026-01-02', '2026-01-02'))).toEqual(p('2026-01-01', '2026-01-01'));
  });
});

describe('deslocar', () => {
  it('◀ é o período anterior', () => {
    const atual = p('2026-09-01', '2026-11-04');
    expect(deslocar(atual, -1)).toEqual(periodoAnterior(atual));
  });

  it('▶ avança mantendo a duração em meses', () => {
    expect(deslocar(p('2026-05-01', '2026-07-31'), 1)).toEqual(p('2026-08-01', '2026-10-31'));
    expect(deslocar(p('2025-12-01', '2025-12-31'), 1)).toEqual(p('2026-01-01', '2026-01-31'));
    expect(deslocar(p('2026-06-01', '2026-08-04'), 1)).toEqual(p('2026-09-01', '2026-11-04'));
  });

  it('▶ em dias para período que não começa no dia 1', () => {
    expect(deslocar(p('2026-02-27', '2026-03-09'), 1)).toEqual(p('2026-03-10', '2026-03-20'));
  });
});

describe('granularidade', () => {
  it('até 31 dias → dia', () => {
    expect(granularidade(p('2026-11-04', '2026-11-04'))).toEqual({
      padrao: 'dia',
      trimestral: false,
    });
    expect(granularidade(p('2026-10-01', '2026-10-31'))).toEqual({
      padrao: 'dia',
      trimestral: false,
    });
  });

  it('até 12 meses → mes', () => {
    const mes = { padrao: 'mes', trimestral: false };
    expect(granularidade(p('2026-10-01', '2026-11-01'))).toEqual(mes); // 32 dias
    expect(granularidade(periodoPreset('ultimos-12-meses', hoje))).toEqual(mes);
    expect(granularidade(p('2026-01-01', '2026-12-31'))).toEqual(mes);
    expect(granularidade(p('2026-01-15', '2027-01-14'))).toEqual(mes);
  });

  it('acima de 12 meses → mes com opção trimestre', () => {
    expect(granularidade(p('2026-01-15', '2027-01-15'))).toEqual({
      padrao: 'mes',
      trimestral: true,
    });
    expect(granularidade(p('2025-01-01', '2026-11-04'))).toEqual({
      padrao: 'mes',
      trimestral: true,
    });
  });
});

describe('URL (8.2)', () => {
  it('lê e escreve de e ate em AAAA-MM-DD', () => {
    const atual = p('2026-09-01', '2026-11-04');
    expect(periodoParaUrl(atual)).toBe('de=2026-09-01&ate=2026-11-04');
    expect(periodoDaUrl(params({ de: '2026-09-01', ate: '2026-11-04' }))).toEqual(atual);
  });

  it.each([
    {},
    { de: '2026-09-01' },
    { ate: '2026-11-04' },
    { de: '2026-02-30', ate: '2026-11-04' },
    { de: '2026-09-01', ate: '04/11/2026' },
    { de: '2026-11-05', ate: '2026-11-04' },
  ])('rejeita %j com erro', (o) => {
    expect(() => periodoDaUrl(params(o))).toThrow(RangeError);
  });
});
