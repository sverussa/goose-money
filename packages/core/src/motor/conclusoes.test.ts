import { describe, expect, it } from 'vitest';
import { competencia, competenciaDe, dataCivil, ultimaData } from '../datas';
import { centavos, D, percentual } from '../dinheiro';
import { tabelaParcelaInformada, tabelaPrice, tabelaSac } from '../dividas';
import { periodoPreset } from '../periodos';
import { gerarSeed } from '../seed';
import {
  conclusaoComprometimento,
  conclusaoDespesasPorCategoria,
  conclusaoFixosEVariaveis,
  conclusaoGastoAcumulado,
  conclusaoJurosAmortizacao,
  conclusaoReceitasDespesas,
  conclusaoSaldoDevedor,
  conclusaoSimulacao,
} from './conclusoes';
import { derivar } from './derivar';
import { type MesProjetado, type Projecao, projetarFluxo } from './projecao';
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
const somarJuros = (ls: readonly { juros: number }[]) =>
  centavos(ls.reduce((a, l) => a + l.juros, 0));
const somarValor = (ls: readonly { valor: number }[]) =>
  centavos(ls.reduce((a, l) => a + l.valor, 0));
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

describe('conclusaoSimulacao', () => {
  const curva = (finais: number[]): MesProjetado[] =>
    finais.map(
      (f, k) => ({ competencia: c(`2027-0${String(k + 1)}`), saldoFinal: r$(f) }) as MesProjetado,
    );
  const projecao = (principal: number[], simulada: number[] | null): Projecao => ({
    meses: curva(principal),
    alertas: [],
    simulacao: simulada && curva(simulada),
  });
  const limite = r$(500);

  it('sem simulação, null', () => {
    expect(conclusaoSimulacao(projecao([1000], null), limite)).toBeNull();
  });

  it('o primeiro mês abaixo do limite com o hipotético e a diferença no último mês', () => {
    expect(conclusaoSimulacao(projecao([900, 800, 700], [900, 400, -100]), limite)).toEqual({
      tipo: 'abaixoDoLimite',
      competencia: c('2027-02'),
      saldoFinal: r$(400),
      jaSemSimulacao: false,
      ultimo: c('2027-03'),
      diferenca: r$(-800),
    });
  });

  it('negativo, e já abaixo sem a simulação', () => {
    expect(conclusaoSimulacao(projecao([300, 200], [-10, -50]), limite)).toEqual({
      tipo: 'negativo',
      competencia: c('2027-01'),
      saldoFinal: r$(-10),
      jaSemSimulacao: true,
      ultimo: c('2027-02'),
      diferenca: r$(-250),
    });
  });

  it('nenhum mês abaixo do limite: só a diferença', () => {
    expect(conclusaoSimulacao(projecao([2000, 3000], [2000, 2700]), limite)).toEqual({
      tipo: 'semAlerta',
      ultimo: c('2027-02'),
      diferenca: r$(-300),
    });
  });
});

describe('conclusaoSaldoDevedor', () => {
  it('em aberto: saldo, mês da última parcela e parcelas restantes; quitada', () => {
    const resumo = { saldoDevedor: r$(31098.91), pagas: 14, total: 48 };
    expect(conclusaoSaldoDevedor({ ...resumo, quitacaoPrevista: dataCivil('2029-08-15') })).toEqual(
      {
        tipo: 'emAberto',
        saldoDevedor: r$(31098.91),
        quitacao: c('2029-08'),
        restantes: 34,
      },
    );
    expect(
      conclusaoSaldoDevedor({ saldoDevedor: r$(0), pagas: 48, total: 48, quitacaoPrevista: null }),
    ).toEqual({ tipo: 'quitada', total: 48 });
  });
});

describe('conclusaoJurosAmortizacao', () => {
  const primeira = dataCivil('2026-01-10');
  it('Price e parcela informada: menos juros e mais amortização', () => {
    const price = tabelaPrice(r$(40000), new D('0.0149'), 48, primeira);
    expect(texto(conclusaoJurosAmortizacao(price))).toMatchObject({ tipo: 'amortizacaoCresce' });
    const informada = tabelaParcelaInformada(r$(4800), r$(450), 12, primeira).linhas;
    expect(conclusaoJurosAmortizacao(informada).tipo).toBe('amortizacaoCresce');
  });
  it('SAC: amortização igual até a penúltima; juros e a fatia deles nas parcelas', () => {
    const sac = tabelaSac(r$(1000), new D('0.01'), 3, primeira);
    const juros = somarJuros(sac);
    expect(texto(conclusaoJurosAmortizacao(sac))).toEqual({
      tipo: 'amortizacaoConstante',
      juros,
      fatiaDosJuros: { tipo: 'valor', valor: texto(percentual(juros, somarValor(sac))) },
    });
  });
  it('taxa zero e sem parcelas: sem juros; uma parcela: outra', () => {
    expect(conclusaoJurosAmortizacao(tabelaPrice(r$(1200), new D(0), 12, primeira))).toEqual({
      tipo: 'semJuros',
    });
    expect(conclusaoJurosAmortizacao([])).toEqual({ tipo: 'semJuros' });
    expect(conclusaoJurosAmortizacao(tabelaPrice(r$(100), new D('0.01'), 1, primeira)).tipo).toBe(
      'outra',
    );
    // Juros caem e a amortização cai: tabela refeita com "reduzir valor".
    const refeita = [
      { valor: r$(110), juros: r$(10), amortizacao: r$(100) },
      { valor: r$(55), juros: r$(5), amortizacao: r$(50) },
    ];
    expect(conclusaoJurosAmortizacao(refeita).tipo).toBe('outra');
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
    // Financiamento Price: 12 parcelas pagas antes do cadastro e as seguintes até hoje.
    const financiamento = [...d.dividas.values()].find(
      (t) => t.divida.sistemaAmortizacao === 'price',
    );
    if (!financiamento) throw new Error('seed sem financiamento');
    expect(conclusaoSaldoDevedor(financiamento.resumo)).toEqual({
      tipo: 'emAberto',
      saldoDevedor: financiamento.resumo.saldoDevedor,
      quitacao: competenciaDe(financiamento.parcelas.at(-1)?.vencimento ?? hoje),
      restantes: financiamento.parcelas.filter((p) => p.status === 'a_vencer').length,
    });
    expect(conclusaoJurosAmortizacao(financiamento.parcelas).tipo).toBe('amortizacaoCresce');
  });

  it('a simulação de uma compra parcelada no seed', () => {
    const hoje = dataCivil('2026-11-04');
    const d = derivar(gerarSeed(hoje, '00000000-0000-4000-8000-000000000001'), hoje);
    const [cartao] = d.fatos.cartoes;
    if (!cartao) throw new Error('seed sem cartão');
    const p = projetarFluxo(d, ultimaData(c('2027-04')), [
      {
        tipo: 'compra',
        descricao: 'Notebook',
        cartaoId: cartao.id,
        data: hoje,
        valorTotal: r$(3000),
        numeroParcelas: 10,
      },
    ]);
    // Cinco parcelas de R$ 300,00 (dez a abr) no horizonte; o seed não chega ao limite.
    expect(conclusaoSimulacao(p, r$(500))).toEqual({
      tipo: 'semAlerta',
      ultimo: c('2027-04'),
      diferenca: r$(-1500),
    });
  });
});
