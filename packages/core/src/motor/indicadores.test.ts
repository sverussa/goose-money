import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { gerarParcelas } from '../cartoes';
import { competencia, dataCivil, primeiroDia, somarDias, ultimaData } from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import { fatosVazios, type Fatos, type Id, type Lancamento } from '../modelo';
import { periodo, periodoAnterior, periodoPreset, type Periodo } from '../periodos';
import { resumoGastos, resumoRendas } from '../recorrencias';
import { derivar } from './derivar';
import {
  aPagarNosCartoes,
  comprometimentoDaRenda,
  composicaoDoSaldo,
  despesas,
  despesasPorCategoria,
  evolucaoDoPatrimonio,
  fixosEVariaveis,
  gastoAcumulado,
  gastoPorCartao,
  limiteDisponivelDoCartao,
  maioresDespesas,
  obrigacoesDeCartao,
  patrimonioLiquido,
  type Razao,
  receitas,
  receitasEDespesasPorMes,
  resultado,
  saldoDevedorDeDividas,
  saldoEmContas,
  saldoEmTodasAsContas,
  taxaDePoupanca,
  variacao,
} from './indicadores';
import { estadoDoPrevisto, previstoAteOFimDoMes } from './projecao';
import { gerarFatosVolumosos } from './sinteticos';

const d = dataCivil;
const c = competencia;
const r$ = (reais: number) => centavos(Math.round(reais * 100));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  createdAt: '2026-11-04T12:00:00-03:00',
  updatedAt: '2026-11-04T12:00:00-03:00',
  createdBy: id(999),
  isDeleted: false,
};
const HOJE = d('2026-11-04');
const CORRENTE = id(1);
const RESERVA = id(2);
const ANTIGA = id(3);
const CARTAO = id(4);
const VELHO = id(5);
const CATS = Array.from({ length: 8 }, (_, k) => id(10 + k));
const [CASA, MERCADO, SALARIO] = CATS as [Id, Id, Id];
const mes = (m: string): Periodo => periodo(primeiroDia(c(m)), ultimaData(c(m)));
const novembro = periodo(d('2026-11-01'), HOJE);

let f: Fatos;
let seq = 100;
const dv = () => derivar(f, HOJE);
const valor = (x: Razao) => (x.tipo === 'valor' ? x.valor.toNumber() : x.tipo);

beforeEach(() => {
  f = fatosVazios();
  CATS.forEach((cat, k) =>
    f.categorias.push({
      ...controle,
      id: cat,
      nome: `Categoria ${String(k)}`,
      tipo: cat === SALARIO ? 'receita' : 'despesa',
      icone: 'tag',
      cor: 'cat',
      categoriaPaiId: null,
      sistema: null,
    }),
  );
  for (const [contaId, saldoInicial, incluirNoTotal, arquivada] of [
    [CORRENTE, 5000, true, false],
    [RESERVA, 10_000, false, false],
    [ANTIGA, 300, true, true],
  ] as const)
    f.contas.push({
      ...controle,
      id: contaId,
      nome: contaId,
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: r$(saldoInicial),
      dataSaldoInicial: d('2026-08-31'),
      cor: 'conta',
      incluirNoTotal,
      arquivada,
    });
  for (const [cartaoId, arquivado] of [
    [CARTAO, false],
    [VELHO, true],
  ] as const) {
    f.cartoes.push({
      ...controle,
      id: cartaoId,
      nome: cartaoId === CARTAO ? 'Cartão A' : 'Velho',
      instituicao: null,
      cor: 'cartao',
      limite: r$(10_000),
      contaPagamentoId: CORRENTE,
      competenciaInicial: c('2026-09'),
      arquivado,
    });
    f.cartaoCiclos.push({
      ...controle,
      id: id(seq++),
      cartaoId,
      vigenteDesde: c('2026-01'),
      diaFechamento: 3,
      diaVencimento: 10,
    });
  }
});

function lancar(
  tipo: Lancamento['tipo'],
  data: string,
  v: Centavos,
  extra: Partial<Lancamento> = {},
): Lancamento {
  const l: Lancamento = {
    ...controle,
    id: id(seq++),
    tipo,
    status: 'efetivado',
    data: d(data),
    valor: v,
    descricao: null,
    observacao: null,
    contaId: CORRENTE,
    contaDestinoId: null,
    categoriaId: tipo === 'receita' ? SALARIO : tipo === 'despesa' ? CASA : null,
    cartaoId: null,
    faturaCompetencia: null,
    dividaId: null,
    parcelaDividaId: null,
    ...extra,
  };
  f.lancamentos.push(l);
  return l;
}

function comprar(
  data: string,
  total: Centavos,
  n = 1,
  categoriaId: Id = MERCADO,
  cartaoId = CARTAO,
) {
  const compra = {
    ...controle,
    id: id(seq++),
    cartaoId,
    data: d(data),
    descricao: 'Compra',
    categoriaId,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  const cartao = f.cartoes.find((x) => x.id === cartaoId) as Fatos['cartoes'][number];
  for (const p of gerarParcelas(compra, cartao, f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p });
  return compra;
}

/** Dívida de R$ 1.000,00 contratada em 01/09, parcelas de R$ 500,00 em 15/10 e 15/11, sem juros. */
function divida(): { id: Id; parcelas: Id[] } {
  const did = id(seq++);
  f.dividas.push({
    ...controle,
    id: did,
    tipo: 'emprestimo',
    credor: 'Banco X',
    valorContratado: r$(1000),
    dataContratacao: d('2026-09-01'),
    destinoDoValor: 'creditado_em_conta',
    sistemaAmortizacao: 'price',
    taxaMensal: '0',
    valorParcelaInformada: null,
    numeroParcelas: 2,
    dataPrimeiraParcela: d('2026-10-15'),
    contaDebitoId: CORRENTE,
    categoriaId: null,
  });
  const parcelas = ['2026-10-15', '2026-11-15'].map((venc, k) => {
    const pid = id(seq++);
    f.parcelasDivida.push({
      ...controle,
      id: pid,
      dividaId: did,
      numero: k + 1,
      vencimento: d(venc),
      valor: r$(500),
      juros: r$(0),
      amortizacao: r$(500),
      pagaAntesDoCadastro: false,
    });
    return pid;
  });
  return { id: did, parcelas };
}

function recorrencia(
  natureza: 'renda' | 'gasto',
  valorR: Centavos,
  dia: number,
  cartao = false,
): Id {
  const rid = id(seq++);
  f.recorrencias.push({
    ...controle,
    id: rid,
    natureza,
    descricao: `Recorrência ${rid.slice(-3)}`,
    competenciaInicio: c('2026-11'),
    competenciaFim: null,
    autoConfirmar: false,
    ativa: true,
  });
  f.recorrenciaVersoes.push({
    ...controle,
    id: id(seq++),
    recorrenciaId: rid,
    vigenteDesde: c('2026-11'),
    valor: valorR,
    dia,
    formaPagamento: cartao ? 'cartao' : 'conta',
    contaId: cartao ? null : CORRENTE,
    cartaoId: cartao ? CARTAO : null,
    categoriaId: natureza === 'renda' ? SALARIO : CASA,
  });
  return rid;
}

describe('saldos de hoje', () => {
  it('Saldo em contas (incluídas, não arquivadas) e Saldo em todas as contas (não arquivadas)', () => {
    lancar('despesa', '2026-11-02', r$(200));
    expect(saldoEmContas(dv())).toBe(r$(4800));
    expect(saldoEmTodasAsContas(dv())).toBe(r$(14_800));
    expect(composicaoDoSaldo(dv())).toEqual([
      { contaId: CORRENTE, incluirNoTotal: true, saldo: r$(4800) },
      { contaId: RESERVA, incluirNoTotal: false, saldo: r$(10_000) },
    ]);
  });

  it('11.2: transferência de R$ 500,00 de incluída para excluída', () => {
    recorrencia('renda', r$(1000), 20);
    const antes = dv();
    lancar('transferencia', '2026-11-04', r$(500), { contaDestinoId: RESERVA });
    const depois = dv();
    expect(saldoEmContas(depois)).toBe(saldoEmContas(antes) - r$(500));
    expect(previstoAteOFimDoMes(depois)).toBe(previstoAteOFimDoMes(antes) - r$(500));
    expect(previstoAteOFimDoMes(depois)).toBe(r$(5000 - 500 + 1000));
    expect(resultado(depois, novembro)).toBe(resultado(antes, novembro));
    expect(patrimonioLiquido(depois)).toBe(patrimonioLiquido(antes));
  });
});

describe('cartões e dívidas', () => {
  it('11.3: compra de R$ 1.200,00 em 12x muda Obrigações em 1.200 e A pagar em 100', () => {
    comprar('2026-11-04', r$(1200), 12); // fatura aberta 2026-12
    comprar('2026-10-10', r$(999), 1, MERCADO, VELHO); // cartão arquivado: fora
    expect(obrigacoesDeCartao(dv())).toBe(r$(1200));
    expect(aPagarNosCartoes(dv())).toBe(r$(100));
    expect(limiteDisponivelDoCartao(dv(), CARTAO)).toBe(r$(8800));
    expect(() => limiteDisponivelDoCartao(dv(), id(4242))).toThrow(RangeError);
  });

  it('Saldo devedor e Patrimônio líquido = todas as contas − obrigações − saldo devedor', () => {
    const { id: did, parcelas } = divida();
    lancar('pagamento_divida', '2026-10-15', r$(500), {
      dividaId: did,
      parcelaDividaId: parcelas[0] as Id,
    });
    comprar('2026-11-04', r$(300));
    expect(saldoDevedorDeDividas(dv())).toBe(r$(500));
    expect(patrimonioLiquido(dv())).toBe(r$(15_000 - 500 - 300 - 500));
  });
});

describe('receitas, despesas, resultado, taxa de poupança e variação', () => {
  it('11.7: período sem receitas tem Taxa de poupança "—"', () => {
    lancar('despesa', '2026-11-02', r$(100));
    expect(valor(taxaDePoupanca(dv(), novembro))).toBe('indisponivel');
  });

  it('valores do período, com filtros', () => {
    lancar('receita', '2026-11-01', r$(1000));
    lancar('despesa', '2026-11-02', r$(200));
    comprar('2026-10-05', r$(50)); // fatura de 10/11, depois de hoje
    expect(receitas(dv(), mes('2026-11'))).toBe(r$(1000));
    expect(despesas(dv(), mes('2026-11'))).toBe(r$(250));
    expect(despesas(dv(), mes('2026-11'), { cartaoId: CARTAO })).toBe(r$(50));
    expect(resultado(dv(), mes('2026-11'))).toBe(r$(750));
    expect(valor(taxaDePoupanca(dv(), mes('2026-11')))).toBe(0.75);
  });

  it('11.7: Variação "Novo" com anterior zero, "—" com ambos zero, sobre o módulo do anterior', () => {
    expect(valor(variacao(r$(500), r$(0)))).toBe('novo');
    expect(valor(variacao(r$(0), r$(0)))).toBe('indisponivel');
    expect(valor(variacao(r$(150), r$(100)))).toBe(0.5);
    expect(valor(variacao(r$(50), r$(-100)))).toBe(1.5);
    lancar('despesa', '2026-10-02', r$(100));
    lancar('despesa', '2026-11-02', r$(150));
    const atual = periodoPreset('este-mes', HOJE);
    expect(valor(variacao(despesas(dv(), atual), despesas(dv(), periodoAnterior(atual))))).toBe(
      0.5,
    );
  });
});

describe('Comprometimento da renda', () => {
  it('fixos + parcelas de compras n > 1 sem recorrência + parcelas de dívida, ÷ rendas', () => {
    const salario = recorrencia('renda', r$(6500), 5);
    recorrencia('gasto', r$(1800), 10);
    recorrencia('gasto', r$(55.9), 12, true);
    const ignorada = recorrencia('gasto', r$(999), 15);
    f.ocorrencias.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: ignorada,
      competencia: c('2026-11'),
      situacao: 'ignorada',
      valor: null,
      data: null,
      contaId: null,
      cartaoId: null,
      categoriaId: null,
      lancamentoId: null,
      compraId: null,
    });
    const confirmado = lancar('receita', '2026-11-03', r$(6400));
    f.ocorrencias.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: salario,
      competencia: c('2026-11'),
      situacao: 'confirmada',
      valor: r$(6400),
      data: d('2026-11-03'),
      contaId: CORRENTE,
      cartaoId: null,
      categoriaId: SALARIO,
      lancamentoId: confirmado.id,
      compraId: null,
    });
    comprar('2026-10-10', r$(1200), 12); // fatura 2026-11: 100
    comprar('2026-10-11', r$(80)); // à vista: fora
    divida();
    const x = comprometimentoDaRenda(dv(), c('2026-11'));
    expect(x).toMatchObject({
      fixos: r$(1855.9),
      parcelasCartao: r$(100),
      dividas: r$(500),
      rendas: r$(6400),
      livre: r$(6400 - 1855.9 - 100 - 500),
    });
    expect(valor(x.razao)).toBe(new Decimal(245_590).div(640_000).toNumber());
    expect(x.fixos).toBe(resumoGastos(f, c('2026-11'), HOJE).previsto);
    expect(x.rendas).toBe(resumoRendas(f, c('2026-11'), HOJE).previsto);
    // Outro mês que não o corrente; sem rendas, "—".
    const dez = comprometimentoDaRenda(dv(), c('2026-12'));
    expect(dez.rendas).toBe(r$(6500));
    expect(valor(comprometimentoDaRenda(dv(), c('2026-09')).razao)).toBe('indisponivel');
  });
});

describe('estado do Previsto até o fim do mês (5.3)', () => {
  it('error negativo, warning abaixo do limite, normal no resto', () => {
    expect(estadoDoPrevisto(r$(-0.01), r$(500))).toBe('error');
    expect(estadoDoPrevisto(r$(499.99), r$(500))).toBe('warning');
    expect(estadoDoPrevisto(r$(500), r$(500))).toBe('normal');
  });
});

describe('séries dos gráficos (8.1)', () => {
  beforeEach(() => {
    lancar('receita', '2026-09-05', r$(6000));
    lancar('receita', '2026-11-01', r$(6500));
    CATS.filter((x) => x !== SALARIO).forEach((cat, k) => {
      lancar('despesa', '2026-10-0' + String(k + 1), r$(100 * (k + 1)), { categoriaId: cat });
    });
    lancar('despesa', '2026-11-02', r$(40));
    comprar('2026-10-02', r$(900), 3); // faturas 10/10, 10/11 e 10/12
  });
  const tri = periodo(d('2026-09-01'), HOJE);

  it('Receitas × Despesas por mês e Fixos × variáveis', () => {
    const serie = receitasEDespesasPorMes(dv(), tri);
    expect(serie.map((m) => m.competencia)).toEqual([c('2026-09'), c('2026-10'), c('2026-11')]);
    for (const m of serie) {
      const p = periodo(
        primeiroDia(m.competencia),
        m.competencia === c('2026-11') ? HOJE : ultimaData(m.competencia),
      );
      expect([m.receitas, m.despesas, m.resultado]).toEqual([
        receitas(dv(), p),
        despesas(dv(), p),
        resultado(dv(), p),
      ]);
    }
    expect(serie[1]?.despesas).toBe(r$(2800 + 300));
    expect(fixosEVariaveis(dv(), tri).map((m) => m.variaveis)).toEqual(
      serie.map((m) => m.despesas),
    );
    expect(fixosEVariaveis(dv(), tri).every((m) => m.fixos === 0)).toBe(true);
  });

  it('Despesas por categoria: 6 fatias e "Outras" soma exatamente as agrupadas', () => {
    const { fatias, outras, ranking } = despesasPorCategoria(dv(), tri);
    expect(fatias).toHaveLength(6);
    expect(ranking).toHaveLength(7);
    expect(fatias[0]).toEqual({ categoriaId: CATS[7], valor: r$(700) });
    expect(outras?.valor).toBe(despesas(dv(), tri, { categorias: outras?.categorias ?? [] }));
    expect(outras?.valor).toBe(ranking.slice(6).reduce((s, x) => s + x.valor, 0));
    expect(despesasPorCategoria(dv(), mes('2026-09')).outras).toBeNull();
  });

  it('Gasto acumulado: último mês do período e o anterior, do dia 1 ao dia', () => {
    const { mes: m, anterior, dias } = gastoAcumulado(dv(), tri);
    expect([m, anterior, dias.length]).toEqual([c('2026-11'), c('2026-10'), 31]);
    for (const { dia, atual, anterior: ant } of dias) {
      const diaNov = somarDias(d('2026-10-31'), dia);
      expect(atual).toBe(dia <= 4 ? despesas(dv(), periodo(d('2026-11-01'), diaNov)) : null);
      expect(ant).toBe(despesas(dv(), periodo(d('2026-10-01'), somarDias(d('2026-09-30'), dia))));
    }
    expect(dias[30]?.anterior).toBe(r$(3100));
  });

  it('Gasto por cartão e Maiores despesas', () => {
    expect(gastoPorCartao(dv(), tri)).toEqual([{ cartaoId: CARTAO, valor: r$(300) }]);
    expect(maioresDespesas(dv(), tri).map((i) => i.valor)).toEqual(
      [700, 600, 500, 400, 300].map(r$),
    );
  });
});

describe('Evolução do saldo e do patrimônio', () => {
  it('fim de cada mês até hoje; no mês corrente, igual aos indicadores de hoje', () => {
    comprar('2026-09-10', r$(600), 3); // faturas 2026-10 a 2026-12
    lancar('pagamento_fatura', '2026-10-10', r$(200), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-10'),
    });
    const { id: did, parcelas } = divida();
    lancar('pagamento_divida', '2026-10-15', r$(500), {
      dividaId: did,
      parcelaDividaId: parcelas[0] as Id,
    });
    f.itensFatura.push({
      ...controle,
      id: id(seq++),
      cartaoId: CARTAO,
      competencia: c('2026-12'),
      tipo: 'encargo',
      data: d('2026-11-03'),
      valor: r$(10),
      descricao: null,
      compraId: null,
      categoriaId: CASA,
    });
    const serie = evolucaoDoPatrimonio(dv(), periodo(d('2026-07-01'), d('2027-02-28')));
    expect(
      serie.map((p) => [
        p.competencia,
        p.saldoEmTodasAsContas,
        p.obrigacoesDeCartao,
        p.saldoDevedor,
        p.patrimonio,
      ]),
    ).toEqual([
      [c('2026-08'), r$(15_000), r$(0), r$(0), r$(15_000)],
      [c('2026-09'), r$(15_000), r$(600), r$(1000), r$(13_400)],
      [c('2026-10'), r$(14_300), r$(400), r$(500), r$(13_400)],
      [c('2026-11'), r$(14_300), r$(410), r$(500), r$(13_390)],
    ]);
    const hoje = serie.at(-1);
    expect(hoje?.data).toBe(HOJE);
    expect(hoje?.saldoEmContas).toBe(saldoEmContas(dv()));
    expect(hoje?.obrigacoesDeCartao).toBe(obrigacoesDeCartao(dv()));
    expect(hoje?.saldoDevedor).toBe(saldoDevedorDeDividas(dv()));
    expect(hoje?.patrimonio).toBe(patrimonioLiquido(dv()));
  });
});

describe('11.7: nenhum NaN ou Infinity', () => {
  /** Todo número (e todo Decimal) dentro de `x` é finito. */
  function finitos(x: unknown): boolean {
    if (typeof x === 'number') return Number.isFinite(x);
    if (x instanceof Decimal) return x.isFinite();
    if (x instanceof Map) return [...x.values()].every(finitos);
    if (x && typeof x === 'object') return Object.values(x).every(finitos);
    return true;
  }

  it('para fatos gerados e vazios, em datas e períodos variados', () => {
    const casos: [Fatos, string][] = [
      [gerarFatosVolumosos(300, HOJE), '2026-11-04'],
      [gerarFatosVolumosos(300, HOJE), '2025-03-31'],
      [gerarFatosVolumosos(300, d('2025-03-31')), '2025-03-31'],
      [fatosVazios(), '2026-02-28'],
    ];
    for (const [fatos, hoje] of casos) {
      const derivado = derivar(fatos, d(hoje));
      const p = periodoPreset('ultimos-12-meses', d(hoje));
      const resultados = [
        saldoEmContas(derivado),
        saldoEmTodasAsContas(derivado),
        aPagarNosCartoes(derivado),
        obrigacoesDeCartao(derivado),
        saldoDevedorDeDividas(derivado),
        patrimonioLiquido(derivado),
        taxaDePoupanca(derivado, p),
        taxaDePoupanca(derivado, periodo(d(hoje), d(hoje))),
        variacao(resultado(derivado, p), resultado(derivado, periodoAnterior(p))),
        comprometimentoDaRenda(derivado, c(hoje.slice(0, 7))),
        previstoAteOFimDoMes(derivado),
        receitasEDespesasPorMes(derivado, p),
        despesasPorCategoria(derivado, p),
        gastoAcumulado(derivado, p),
        fixosEVariaveis(derivado, p),
        composicaoDoSaldo(derivado),
        evolucaoDoPatrimonio(derivado, p),
        gastoPorCartao(derivado, p),
        maioresDespesas(derivado, p),
        fatos.cartoes.map((x) => limiteDisponivelDoCartao(derivado, x.id)),
      ];
      expect(resultados.every(finitos)).toBe(true);
    }
  });
});
