import { describe, expect, it } from 'vitest';
import { competenciaDe, dataCivil, somarMeses, ultimaData } from '../datas';
import { periodoAnterior, periodoPreset } from '../periodos';
import { indicadoresDaBarra } from './barra';
import { derivar } from './derivar';
import { despesas, receitas, resultado, taxaDePoupanca, variacao } from './indicadores';
import { projetarFluxo } from './projecao';
import { gerarFatosVolumosos } from './sinteticos';

/** Relógio de alta resolução do Vitest; o core não tem os tipos de DOM nem de Node. */
declare const performance: { now(): number };
declare const process: { env: Record<string, string | undefined> };
/** A cobertura instrumenta o código e o deixa várias vezes mais lento: o tempo só vale sem ela. */
const comCobertura = process.env.COBERTURA === '1';

const HOJE = dataCivil('2026-11-04');
const fatos = gerarFatosVolumosos(10_000, HOJE);

/** Mediana de 5 execuções, em ms, para não falhar por ruído (T01-18). */
function mediana(f: () => unknown): number {
  const tempos: number[] = [];
  for (let k = 0; k < 5; k++) {
    const inicio = performance.now();
    f();
    tempos.push(performance.now() - inicio);
  }
  return tempos.sort((a, b) => a - b)[2] as number;
}

describe('9.3: desempenho com 10 mil lançamentos', () => {
  it('o gerador cria 10 mil lançamentos, 3 cartões, 2 dívidas e 8 recorrências', () => {
    expect([
      fatos.lancamentos.length,
      fatos.cartoes.length,
      fatos.dividas.length,
      fatos.recorrencias.length,
    ]).toEqual([10_000, 3, 2, 8]);
  });

  it.skipIf(comCobertura)('derivar em menos de 50 ms (D13)', () => {
    expect(mediana(() => derivar(fatos, HOJE))).toBeLessThan(50);
  });

  it.skipIf(comCobertura)('5 indicadores da Barra e KPIs da Visão geral em menos de 100 ms', () => {
    const p = periodoPreset('este-mes', HOJE);
    expect(
      mediana(() => {
        const d = derivar(fatos, HOJE);
        indicadoresDaBarra(d);
        const anterior = periodoAnterior(p);
        for (const indicador of [receitas, despesas, resultado])
          variacao(indicador(d, p), indicador(d, anterior));
        taxaDePoupanca(d, p);
      }),
    ).toBeLessThan(100);
  });

  it.skipIf(comCobertura)('projetarFluxo de 24 meses em menos de 200 ms', () => {
    const ate = ultimaData(somarMeses(competenciaDe(HOJE), 23));
    expect(
      mediana(() => {
        expect(projetarFluxo(derivar(fatos, HOJE), ate).meses).toHaveLength(24);
      }),
    ).toBeLessThan(200);
  });
});
