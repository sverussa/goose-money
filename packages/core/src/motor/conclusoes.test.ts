import { describe, expect, it } from 'vitest';
import { competencia, dataCivil } from '../datas';
import { centavos } from '../dinheiro';
import { periodoPreset } from '../periodos';
import { gerarSeed } from '../seed';
import {
  conclusaoComprometimento,
  conclusaoDespesasPorCategoria,
  conclusaoFixosEVariaveis,
  conclusaoGastoAcumulado,
  conclusaoReceitasDespesas,
} from './conclusoes';
import { derivar } from './derivar';
import {
  comprometimentoDaRenda,
  despesasPorCategoria,
  fixosEVariaveis,
  gastoAcumulado,
  receitasEDespesasPorMes,
  variacao,
} from './indicadores';

const c = competencia;
/** Decimal do core como texto ("0.7"), para comparar sem depender da instância do decimal.js. */
const texto = (o: unknown): unknown =>
  o && typeof o === 'object'
    ? 'toFixed' in o
      ? (o as { toFixed: () => string }).toFixed()
      : Object.fromEntries(Object.entries(o).map(([k, v]) => [k, texto(v)]))
    : o;
const r$ = (reais: number) => centavos(Math.round(reais * 100));
const mes = (m: string, receitas: number, despesas: number) => ({
  competencia: c(m),
  receitas: r$(receitas),
  despesas: r$(despesas),
  resultado: r$(receitas - despesas),
});

describe('conclusaoReceitasDespesas', () => {
  it('sobrou em todos, faltou em todos, em alguns e sem movimento (meses vazios não contam)', () => {
    const a = mes('2026-09', 100, 80);
    const b = mes('2026-10', 100, 120);
    const vazio = mes('2026-11', 0, 0);
    expect(conclusaoReceitasDespesas([a, mes('2026-10', 50, 50), vazio])).toEqual({
      tipo: 'sobrouEmTodos',
      meses: 2,
    });
    expect(conclusaoReceitasDespesas([b, vazio])).toEqual({ tipo: 'faltouEmTodos', meses: 1 });
    expect(conclusaoReceitasDespesas([a, b])).toEqual({
      tipo: 'sobrouEmAlguns',
      sobrou: 1,
      meses: 2,
    });
    expect(conclusaoReceitasDespesas([vazio])).toEqual({ tipo: 'semMovimento' });
  });
});

describe('conclusaoDespesasPorCategoria', () => {
  it('a maior categoria e a fatia dela; sem despesas', () => {
    const serie = {
      fatias: [],
      outras: null,
      ranking: [
        { categoriaId: 'a', valor: r$(300) },
        { categoriaId: 'b', valor: r$(700) },
      ].sort((x, y) => y.valor - x.valor),
    };
    expect(texto(conclusaoDespesasPorCategoria(serie))).toEqual({
      tipo: 'maior',
      categoriaId: 'b',
      valor: r$(700),
      fatia: { tipo: 'valor', valor: '0.7' },
    });
    expect(conclusaoDespesasPorCategoria({ fatias: [], outras: null, ranking: [] })).toEqual({
      tipo: 'semDespesas',
    });
  });
});

describe('conclusaoGastoAcumulado', () => {
  const dias = (atual: (number | null)[], anterior: (number | null)[]) =>
    atual.map((x, k) => ({
      dia: k + 1,
      atual: x === null ? null : r$(x),
      anterior: anterior[k] === null || anterior[k] === undefined ? null : r$(anterior[k]),
    }));
  it('compara até o mesmo dia; o mês incompleto diz o dia', () => {
    const serie = {
      mes: c('2026-11'),
      anterior: c('2026-10'),
      dias: dias([10, 30, null], [5, 20, 40]),
    };
    expect(texto(conclusaoGastoAcumulado(serie))).toEqual({
      tipo: 'mais',
      mes: c('2026-11'),
      anterior: c('2026-10'),
      dia: 2,
      mesCompleto: false,
      atual: r$(30),
      noAnterior: r$(20),
      variacao: { tipo: 'valor', valor: '0.5' },
    });
  });
  it('menos, igual, anterior mais curto e sem gastos', () => {
    const fev = { mes: c('2027-03'), anterior: c('2027-02') };
    const longo = dias([...Array<number>(30).fill(1), 2], [...Array<number>(28).fill(4)]);
    expect(conclusaoGastoAcumulado({ ...fev, dias: longo })).toMatchObject({
      tipo: 'menos',
      dia: 31,
      mesCompleto: true,
      noAnterior: r$(4),
    });
    expect(texto(conclusaoGastoAcumulado({ ...fev, dias: dias([5], [5]) }))).toMatchObject({
      tipo: 'igual',
      variacao: { tipo: 'valor', valor: '0' },
    });
    expect(conclusaoGastoAcumulado({ ...fev, dias: dias([null], [1]) })).toEqual({
      tipo: 'semGastos',
      mes: c('2027-03'),
      anterior: c('2027-02'),
    });
    expect(conclusaoGastoAcumulado({ ...fev, dias: dias([0], [0]) }).tipo).toBe('semGastos');
  });
});

describe('conclusaoFixosEVariaveis', () => {
  it('a parte que pesa mais e a fatia dos fixos; sem despesas', () => {
    const serie = [
      { competencia: c('2026-10'), fixos: r$(60), variaveis: r$(20) },
      { competencia: c('2026-11'), fixos: r$(0), variaveis: r$(20) },
    ];
    expect(texto(conclusaoFixosEVariaveis(serie))).toEqual({
      tipo: 'fixos',
      fixos: r$(60),
      variaveis: r$(40),
      fatiaDosFixos: { tipo: 'valor', valor: '0.6' },
    });
    expect(
      conclusaoFixosEVariaveis([{ competencia: c('2026-10'), fixos: r$(1), variaveis: r$(3) }])
        .tipo,
    ).toBe('variaveis');
    expect(conclusaoFixosEVariaveis([])).toEqual({ tipo: 'semDespesas' });
  });
});

describe('conclusaoComprometimento', () => {
  const base = { fixos: r$(50), parcelasCartao: r$(0), dividas: r$(0) };
  it('comprometida, acima da renda e sem renda', () => {
    // Uma razão do próprio core: 50 ÷ 100.
    const metade = variacao(r$(150), r$(100));
    expect(
      texto(conclusaoComprometimento({ ...base, livre: r$(50), rendas: r$(100), razao: metade })),
    ).toEqual({
      tipo: 'comprometida',
      razao: { tipo: 'valor', valor: '0.5' },
      rendas: r$(100),
    });
    expect(
      conclusaoComprometimento({
        ...base,
        livre: r$(-10),
        rendas: r$(40),
        razao: metade,
      }).tipo,
    ).toBe('acimaDaRenda');
    expect(
      conclusaoComprometimento({
        ...base,
        livre: r$(-50),
        rendas: r$(0),
        razao: { tipo: 'indisponivel' },
      }),
    ).toEqual({ tipo: 'semRenda' });
  });
});

describe('sobre o seed (04/11/2026)', () => {
  it('as conclusões leem as séries do core sem erro', () => {
    const hoje = dataCivil('2026-11-04');
    const d = derivar(gerarSeed(hoje, '00000000-0000-4000-8000-000000000001'), hoje);
    const p = periodoPreset('ultimos-3-meses', hoje);
    expect(conclusaoReceitasDespesas(receitasEDespesasPorMes(d, p)).tipo).not.toBe('semMovimento');
    expect(conclusaoDespesasPorCategoria(despesasPorCategoria(d, p)).tipo).toBe('maior');
    expect(conclusaoGastoAcumulado(gastoAcumulado(d, p))).toMatchObject({
      dia: 4,
      mesCompleto: false,
    });
    expect(conclusaoFixosEVariaveis(fixosEVariaveis(d, p)).tipo).not.toBe('semDespesas');
    expect(conclusaoComprometimento(comprometimentoDaRenda(d, c('2026-11'))).tipo).not.toBe(
      'semRenda',
    );
  });
});
