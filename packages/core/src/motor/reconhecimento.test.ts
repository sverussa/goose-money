import { beforeEach, describe, expect, it } from 'vitest';
import { gerarParcelas } from '../cartoes';
import {
  competencia,
  competenciaDe,
  dataCivil,
  primeiroDia,
  somarDias,
  ultimaData,
  type DataCivil,
} from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import {
  fatosVazios,
  type Categoria,
  type Compra,
  type Divida,
  type Fatos,
  type Id,
  type ItemFatura,
  type Lancamento,
  type ParcelaDivida,
} from '../modelo';
import { periodo, type Periodo } from '../periodos';
import { derivar } from './derivar';
import {
  despesasReconhecidas,
  type FiltrosDeReconhecimento,
  type ItemReconhecido,
  receitasReconhecidas,
  somarItens,
} from './reconhecimento';

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
const CONTA = id(1);
const POUPANCA = id(2);
const CARTAO = id(3);
const CARTAO_B = id(4);
const ALIM = id(10);
const MERCADO = id(11);
const ELETRO = id(12);
const SALARIO = id(13);
const JUROS = id(14);
const TARIFAS = id(15);
const VEICULO = id(16);
const STREAMING = id(17);
const AJUSTE = id(18);

const mes = (m: string): Periodo => periodo(primeiroDia(c(m)), ultimaData(c(m)));
const tudo = periodo(d('2026-01-01'), d('2028-12-31'));

let f: Fatos;
let seq = 100;

function categoria(
  idCat: Id,
  nome: string,
  tipo: Categoria['tipo'],
  extra: Partial<Categoria> = {},
): Categoria {
  return {
    ...controle,
    id: idCat,
    nome,
    tipo,
    icone: 'tag',
    cor: 'cat',
    categoriaPaiId: null,
    sistema: null,
    ...extra,
  };
}

beforeEach(() => {
  f = fatosVazios();
  f.categorias.push(
    categoria(ALIM, 'Alimentação', 'despesa'),
    categoria(MERCADO, 'Mercado', 'despesa', { categoriaPaiId: ALIM }),
    categoria(ELETRO, 'Eletrônicos', 'despesa'),
    categoria(SALARIO, 'Salário', 'receita'),
    categoria(JUROS, 'Juros e encargos', 'despesa', { sistema: 'juros_encargos', cor: null }),
    categoria(TARIFAS, 'Tarifas', 'despesa', { sistema: 'tarifas', cor: null }),
    categoria(VEICULO, 'Veículo', 'despesa'),
    categoria(STREAMING, 'Assinaturas', 'despesa'),
    categoria(AJUSTE, 'Ajuste de saldo', 'ambos', { sistema: 'ajuste_saldo', cor: null }),
  );
  for (const [contaId, nome] of [
    [CONTA, 'Conta corrente'],
    [POUPANCA, 'Poupança'],
  ] as const)
    f.contas.push({
      ...controle,
      id: contaId,
      nome,
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: r$(1000),
      dataSaldoInicial: d('2026-09-30'),
      cor: 'conta',
      incluirNoTotal: true,
      arquivada: false,
    });
  // Cartão A fecha 3 e vence 10; Cartão B fecha 25 e vence 5. Ambos controlados desde 2026-10.
  for (const [cartaoId, nome, fecha, vence] of [
    [CARTAO, 'Cartão A', 3, 10],
    [CARTAO_B, 'Cartão B', 25, 5],
  ] as const) {
    f.cartoes.push({
      ...controle,
      id: cartaoId,
      nome,
      instituicao: null,
      cor: 'cartao',
      limite: r$(10_000),
      contaPagamentoId: CONTA,
      competenciaInicial: c('2026-10'),
      arquivado: false,
    });
    f.cartaoCiclos.push({
      ...controle,
      id: id(seq++),
      cartaoId,
      vigenteDesde: c('2026-01'),
      diaFechamento: fecha,
      diaVencimento: vence,
    });
  }
});

function lancar(
  tipo: Lancamento['tipo'],
  data: string,
  valor: Centavos,
  extra: Partial<Lancamento> = {},
): Lancamento {
  const l: Lancamento = {
    ...controle,
    id: id(seq++),
    tipo,
    status: 'efetivado',
    data: d(data),
    valor,
    descricao: null,
    observacao: null,
    contaId: CONTA,
    contaDestinoId: null,
    categoriaId: null,
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
  categoriaId: Id = ELETRO,
  descricao: string | null = 'Notebook',
  cartaoId: Id = CARTAO,
): Compra {
  const compra: Compra = {
    ...controle,
    id: id(seq++),
    cartaoId,
    data: d(data),
    descricao,
    categoriaId,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  const cartao = f.cartoes.find((x) => x.id === cartaoId);
  if (!cartao) throw new Error('cartão');
  for (const p of gerarParcelas(compra, cartao, f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p });
  return compra;
}

function itemFatura(
  tipo: ItemFatura['tipo'],
  comp: string,
  valor: Centavos,
  extra: Partial<ItemFatura> = {},
): ItemFatura {
  const i: ItemFatura = {
    ...controle,
    id: id(seq++),
    cartaoId: CARTAO,
    competencia: c(comp),
    tipo,
    data: d(`${comp}-01`),
    valor,
    descricao: null,
    compraId: null,
    categoriaId: null,
    ...extra,
  };
  f.itensFatura.push(i);
  return i;
}

/** Dívida com parcelas mensais dadas por [vencimento, juros, amortização]. */
function divida(
  destino: Divida['destinoDoValor'],
  parcelas: [string, number, number][],
  extra: Partial<Divida> = {},
): { divida: Divida; parcelas: ParcelaDivida[] } {
  const dv: Divida = {
    ...controle,
    id: id(seq++),
    tipo: destino === 'creditado_em_conta' ? 'emprestimo' : 'financiamento',
    credor: destino === 'creditado_em_conta' ? 'Banco X' : 'Financeira Y',
    valorContratado: r$(parcelas.reduce((s, [, , a]) => s + a, 0)),
    dataContratacao: d('2026-08-15'),
    destinoDoValor: destino,
    sistemaAmortizacao: 'price',
    taxaMensal: '0.01',
    valorParcelaInformada: null,
    numeroParcelas: parcelas.length,
    dataPrimeiraParcela: d(parcelas[0]?.[0] ?? '2026-09-15'),
    contaDebitoId: CONTA,
    categoriaId: destino === 'pago_a_terceiro' ? VEICULO : null,
    ...extra,
  };
  f.dividas.push(dv);
  const ps = parcelas.map(([venc, juros, amort], k): ParcelaDivida => ({
    ...controle,
    id: id(seq++),
    dividaId: dv.id,
    numero: k + 1,
    vencimento: d(venc),
    valor: r$(juros + amort),
    juros: r$(juros),
    amortizacao: r$(amort),
    pagaAntesDoCadastro: false,
  }));
  f.parcelasDivida.push(...ps);
  return { divida: dv, parcelas: ps };
}

const despesas = (p: Periodo = tudo, filtros: FiltrosDeReconhecimento = {}) =>
  despesasReconhecidas(derivar(f, HOJE), p, filtros);
const receitas = (p: Periodo = tudo, filtros: FiltrosDeReconhecimento = {}) =>
  receitasReconhecidas(derivar(f, HOJE), p, filtros);
const totalDespesas = (p?: Periodo, filtros?: FiltrosDeReconhecimento) =>
  somarItens(despesas(p, filtros));
const totalReceitas = (p?: Periodo, filtros?: FiltrosDeReconhecimento) =>
  somarItens(receitas(p, filtros));

describe('tabela 3.3, uma linha por tipo de movimento', () => {
  it('receita em conta: receita na data', () => {
    const l = lancar('receita', '2026-11-05', r$(6500), {
      categoriaId: SALARIO,
      descricao: 'Salário',
    });
    expect(receitas()).toEqual([
      {
        tipo: 'receita',
        data: d('2026-11-05'),
        valor: r$(6500),
        categoriaId: SALARIO,
        categoriaPaiId: SALARIO,
        origem: 'manual',
        contaId: CONTA,
        cartaoId: null,
        registro: { entidade: 'lancamento', id: l.id },
        texto: 'Salário',
        estado: 'liquidado',
      },
    ]);
    expect(despesas()).toEqual([]);
  });

  it('despesa em conta: despesa na data; sem descrição, o texto é a categoria', () => {
    lancar('despesa', '2026-11-02', r$(120), { categoriaId: MERCADO, descricao: ' ' });
    const [item] = despesas();
    expect(item).toMatchObject({
      data: d('2026-11-02'),
      valor: r$(120),
      categoriaId: MERCADO,
      categoriaPaiId: ALIM,
      texto: 'Mercado',
    });
    expect(receitas()).toEqual([]);
  });

  it('despesa anterior ao saldo inicial também é reconhecida (3.4)', () => {
    lancar('despesa', '2026-09-10', r$(50), { categoriaId: ALIM });
    expect(totalDespesas(mes('2026-09'))).toBe(r$(50));
  });

  it('parcela de compra no cartão: despesa no vencimento da fatura, categoria da compra', () => {
    const compra = comprar('2026-10-12', r$(3000), 10);
    const itens = despesas();
    expect(itens).toHaveLength(10);
    expect(itens[0]).toMatchObject({
      data: d('2026-11-10'),
      valor: r$(300),
      categoriaId: ELETRO,
      origem: 'cartao',
      contaId: null,
      cartaoId: CARTAO,
      registro: { entidade: 'parcela' },
      texto: 'Notebook · 1/10 · Cartão A · comprado em 12/10',
      estado: 'a_pagar',
    });
    expect(itens[2]).toMatchObject({
      data: d('2027-01-10'),
      texto: 'Notebook · 3/10 · Cartão A · comprado em 12/10',
    });
    // À vista: sem "1/1"; sem descrição, o nome da categoria.
    comprar('2026-10-20', r$(40), 1, MERCADO, null);
    expect(despesas(mes('2026-11'), { categorias: [MERCADO] })[0]?.texto).toBe(
      'Mercado · Cartão A · comprado em 20/10',
    );
    expect(compra.numeroParcelas).toBe(10);
  });

  it('11.4: compra de outubro com fatura vencendo em novembro conta nas Despesas de novembro', () => {
    comprar('2026-10-12', r$(1000), 3);
    expect(totalDespesas(mes('2026-10'))).toBe(r$(0));
    expect(totalDespesas(mes('2026-11'))).toBe(r$(333.34));
    expect(totalDespesas(mes('2026-12'))).toBe(r$(333.33));
    expect(totalDespesas(mes('2027-01'))).toBe(r$(333.33));
  });

  it('estorno de R$ 89,90 reduz as despesas da categoria da compra original', () => {
    const compra = comprar('2026-10-12', r$(500), 1, ELETRO, 'Fone');
    comprar('2026-10-13', r$(100), 1, ALIM, 'Restaurante');
    itemFatura('estorno', '2026-11', r$(-89.9), { compraId: compra.id });
    expect(totalDespesas(mes('2026-11'), { categorias: [ELETRO] })).toBe(r$(410.1));
    expect(totalDespesas(mes('2026-11'), { categorias: [ALIM] })).toBe(r$(100));
    expect(despesas(mes('2026-11'), { categorias: [ELETRO] })[1]).toMatchObject({
      data: d('2026-11-10'),
      valor: r$(-89.9),
      registro: { entidade: 'itemFatura' },
      texto: 'Estorno · Fone · Cartão A',
    });
  });

  it('estorno sem compra usa a própria categoria; ajuste de compra usa a da compra', () => {
    const compra = comprar('2026-10-12', r$(500), 1, ELETRO, 'Fone');
    itemFatura('estorno', '2026-12', r$(-30), { categoriaId: ALIM, descricao: 'Devolução' });
    itemFatura('ajuste_compra', '2026-12', r$(-20), { compraId: compra.id });
    expect(despesas(mes('2026-12')).map((i) => [i.categoriaId, i.valor, i.texto])).toEqual([
      [ALIM, r$(-30), 'Devolução · Cartão A'],
      [ELETRO, r$(-20), 'Ajuste de compra · Fone · Cartão A'],
    ]);
  });

  it('encargo no cartão: despesa na competência, categoria do encargo', () => {
    itemFatura('encargo', '2026-11', r$(25), { categoriaId: JUROS });
    itemFatura('encargo', '2026-11', r$(15), { categoriaId: TARIFAS, descricao: 'Anuidade' });
    expect(despesas(mes('2026-11')).map((i) => [i.categoriaId, i.valor, i.texto])).toEqual([
      [JUROS, r$(25), 'Juros e encargos · Cartão A'],
      [TARIFAS, r$(15), 'Anuidade · Cartão A'],
    ]);
  });

  it('11.3: pagar uma fatura de R$ 800,00 não muda Receitas nem Despesas', () => {
    comprar('2026-10-12', r$(800));
    const antes = despesas();
    lancar('pagamento_fatura', '2026-11-04', r$(800), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-11'),
    });
    const depois = despesas();
    expect(somarItens(depois)).toBe(somarItens(antes));
    expect(totalReceitas()).toBe(r$(0));
    expect(antes[0]?.estado).toBe('a_pagar');
    expect(depois[0]?.estado).toBe('liquidado');
  });

  it('saldo anterior ao cadastro, saldo transportado e crédito de pagamento: nunca', () => {
    itemFatura('saldo_anterior_cadastro', '2026-10', r$(900));
    comprar('2026-09-20', r$(1000)); // fatura 2026-10, vencida em 10/10
    lancar('pagamento_fatura', '2026-10-10', r$(600), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-10'),
    }); // R$ 1.300,00 transportados para 2026-11
    comprar('2026-10-20', r$(500)); // fatura 2026-11
    lancar('pagamento_fatura', '2026-11-04', r$(2000), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-11'),
    }); // crédito de R$ 200,00 em 2026-12
    expect(despesas().map((i) => [i.data, i.valor, i.estado])).toEqual([
      [d('2026-10-10'), r$(1000), 'vencido'],
      [d('2026-11-10'), r$(500), 'liquidado'],
    ]);
  });

  it('parcela "Paga antes do cadastro" (cartão e dívida): nunca', () => {
    comprar('2026-06-15', r$(1200), 12); // faturas 2026-07 a 2027-06; controle desde 2026-10
    const { divida: dv, parcelas } = divida('pago_a_terceiro', [
      ['2026-08-15', 10, 90],
      ['2026-09-15', 9, 91],
    ]);
    (parcelas[0] as ParcelaDivida).pagaAntesDoCadastro = true;
    const itens = despesas();
    expect(itens.filter((i) => i.cartaoId === CARTAO)).toHaveLength(9);
    expect(itens[0]?.data).toBe(d('2026-09-15'));
    expect(totalDespesas(periodo(d('2026-01-01'), d('2026-09-30')))).toBe(r$(100));
    expect(dv.numeroParcelas).toBe(2);
  });

  it('captação, transferência e ajuste de saldo: nunca', () => {
    const { divida: dv } = divida('creditado_em_conta', [['2026-12-15', 0, 1000]]);
    lancar('captacao', '2026-08-15', r$(1000), { dividaId: dv.id });
    lancar('transferencia', '2026-11-01', r$(300), { contaDestinoId: POUPANCA });
    lancar('ajuste', '2026-11-02', r$(-45), { categoriaId: AJUSTE });
    lancar('ajuste', '2026-11-03', r$(45), { categoriaId: AJUSTE });
    expect(receitas()).toEqual([]);
    expect(despesas()).toEqual([]); // parcela sem juros: nada a reconhecer
  });

  it('empréstimo creditado em conta: só os juros, na competência, em "Juros e encargos"', () => {
    const { parcelas } = divida('creditado_em_conta', [
      ['2026-10-15', 40, 360],
      ['2026-11-15', 36.4, 363.6],
    ]);
    expect(despesas().map((i) => [i.data, i.valor, i.categoriaId, i.texto, i.estado])).toEqual([
      [d('2026-10-15'), r$(40), JUROS, 'Banco X · 1/2 · juros', 'vencido'],
      [d('2026-11-15'), r$(36.4), JUROS, 'Banco X · 2/2 · juros', 'a_pagar'],
    ]);
    // Pagamento de parcela (pagamento_divida): nunca; só muda o estado.
    const antes = totalDespesas();
    lancar('pagamento_divida', '2026-10-20', r$(400), {
      dividaId: (parcelas[0] as ParcelaDivida).dividaId,
      parcelaDividaId: (parcelas[0] as ParcelaDivida).id,
    });
    expect(totalDespesas()).toBe(antes);
    expect(despesas()[0]).toMatchObject({ estado: 'liquidado', contaId: CONTA, origem: 'divida' });
  });

  it('financiamento pago a terceiro: a parcela inteira, na competência, categoria da dívida', () => {
    divida('pago_a_terceiro', [['2026-11-20', 50, 450]]);
    expect(despesas()).toMatchObject([
      {
        data: d('2026-11-20'),
        valor: r$(500),
        categoriaId: VEICULO,
        texto: 'Financeira Y · 1/1',
        registro: { entidade: 'parcelaDivida' },
      },
    ]);
  });

  it('amortização extraordinária: nada se creditado em conta; despesa na data se pago a terceiro', () => {
    const emprestimo = divida('creditado_em_conta', [['2027-05-15', 0, 5000]]).divida;
    const financiamento = divida('pago_a_terceiro', [['2027-05-20', 0, 5000]]).divida;
    lancar('amortizacao', '2026-11-03', r$(1000), { dividaId: emprestimo.id });
    const l = lancar('amortizacao', '2026-11-04', r$(2000), { dividaId: financiamento.id });
    expect(despesas(mes('2026-11'))).toEqual([
      {
        tipo: 'despesa',
        data: d('2026-11-04'),
        valor: r$(2000),
        categoriaId: VEICULO,
        categoriaPaiId: VEICULO,
        origem: 'divida',
        contaId: CONTA,
        cartaoId: null,
        registro: { entidade: 'lancamento', id: l.id },
        texto: 'Amortização extraordinária · Financeira Y',
        estado: 'liquidado',
      },
    ]);
  });

  it('previstos: nunca (lançamento previsto e recorrência não confirmada)', () => {
    lancar('receita', '2026-11-20', r$(500), { categoriaId: SALARIO, status: 'previsto' });
    lancar('despesa', '2026-11-20', r$(80), { categoriaId: ALIM, status: 'previsto' });
    const rec = id(seq++);
    f.recorrencias.push({
      ...controle,
      id: rec,
      natureza: 'gasto',
      descricao: 'Streaming',
      competenciaInicio: c('2026-01'),
      competenciaFim: null,
      autoConfirmar: false,
      ativa: true,
    });
    f.recorrenciaVersoes.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: rec,
      vigenteDesde: c('2026-01'),
      valor: r$(55.9),
      dia: 12,
      formaPagamento: 'cartao',
      contaId: null,
      cartaoId: CARTAO,
      categoriaId: STREAMING,
    });
    expect(receitas()).toEqual([]);
    expect(despesas()).toEqual([]);
  });
});

describe('origem (D69)', () => {
  it('lançamento ou compra de ocorrência confirmada é recorrência; o resto, manual ou cartão', () => {
    const salario = lancar('receita', '2026-11-05', r$(6500), { categoriaId: SALARIO });
    const streaming = comprar('2026-10-12', r$(55.9), 1, STREAMING, 'Streaming');
    comprar('2026-10-13', r$(100), 1, ALIM, 'Mercado');
    lancar('despesa', '2026-11-01', r$(30), { categoriaId: ALIM });
    const ocorrencia = {
      ...controle,
      recorrenciaId: id(seq++),
      competencia: c('2026-11'),
      situacao: 'confirmada' as const,
      data: d('2026-11-05'),
      valor: r$(6500),
      categoriaId: SALARIO,
    };
    f.ocorrencias.push(
      {
        ...ocorrencia,
        id: id(seq++),
        contaId: CONTA,
        lancamentoId: salario.id,
        cartaoId: null,
        compraId: null,
      },
      {
        ...ocorrencia,
        id: id(seq++),
        contaId: null,
        lancamentoId: null,
        cartaoId: CARTAO,
        compraId: streaming.id,
      },
    );
    expect(receitas()[0]?.origem).toBe('recorrencia');
    expect(despesas().map((i) => [i.texto.split(' · ')[0], i.origem])).toEqual([
      ['Alimentação', 'manual'],
      ['Streaming', 'recorrencia'],
      ['Mercado', 'cartao'],
    ]);
  });
});

describe('filtros de 6.3', () => {
  beforeEach(() => {
    lancar('receita', '2026-11-05', r$(6500), { categoriaId: SALARIO, descricao: 'Salário' });
    lancar('despesa', '2026-11-02', r$(120), { categoriaId: MERCADO, descricao: 'Feira' });
    lancar('despesa', '2026-11-03', r$(80), {
      categoriaId: ALIM,
      descricao: 'Padaria',
      contaId: POUPANCA,
    });
    comprar('2026-10-12', r$(300), 1, ELETRO, 'Fone de ouvido');
    comprar('2026-10-20', r$(200), 1, ALIM, 'Açougue', CARTAO_B); // fatura de 05/11
  });

  it('tipo', () => {
    expect(receitas(mes('2026-11'), { tipo: 'despesa' })).toEqual([]);
    expect(despesas(mes('2026-11'), { tipo: 'receita' })).toEqual([]);
    expect(totalReceitas(mes('2026-11'), { tipo: 'receita' })).toBe(r$(6500));
  });

  it('conta e cartão', () => {
    expect(totalDespesas(mes('2026-11'), { contaId: POUPANCA })).toBe(r$(80));
    expect(totalDespesas(mes('2026-11'), { cartaoId: CARTAO })).toBe(r$(300));
    expect(totalDespesas(mes('2026-11'), { cartaoId: CARTAO_B })).toBe(r$(200));
  });

  it('categoria inclui as subcategorias', () => {
    expect(totalDespesas(mes('2026-11'), { categorias: [ALIM] })).toBe(r$(400));
    expect(totalDespesas(mes('2026-11'), { categorias: [MERCADO] })).toBe(r$(120));
    expect(totalDespesas(mes('2026-11'), { categorias: [MERCADO, ELETRO] })).toBe(r$(420));
  });

  it('origem', () => {
    expect(totalDespesas(mes('2026-11'), { origens: ['cartao'] })).toBe(r$(500));
    expect(totalDespesas(mes('2026-11'), { origens: ['manual', 'divida'] })).toBe(r$(200));
  });

  it('busca na descrição, sem diferenciar maiúsculas e acentos', () => {
    expect(despesas(mes('2026-11'), { busca: ' ACOUGUE ' }).map((i) => i.valor)).toEqual([r$(200)]);
    expect(despesas(mes('2026-11'), { busca: 'cartão a' }).map((i) => i.valor)).toEqual([r$(300)]);
    expect(despesas(mes('2026-11'), { busca: '' })).toHaveLength(4);
  });

  it('ordem de data de competência', () => {
    expect(despesas(mes('2026-11')).map((i) => i.data)).toEqual([
      d('2026-11-02'),
      d('2026-11-03'),
      d('2026-11-05'),
      d('2026-11-10'),
    ]);
  });
});

describe('invariante de 6.3: a lista aberta por um ponto de gráfico soma o valor do ponto', () => {
  const periodoDosGraficos = periodo(d('2026-09-01'), d('2026-12-31'));
  const meses = ['2026-09', '2026-10', '2026-11', '2026-12'];

  beforeEach(() => {
    lancar('receita', '2026-09-05', r$(6500), { categoriaId: SALARIO });
    lancar('receita', '2026-10-05', r$(6500), { categoriaId: SALARIO });
    lancar('receita', '2026-11-05', r$(7000), { categoriaId: SALARIO });
    lancar('despesa', '2026-09-12', r$(210.5), { categoriaId: MERCADO });
    lancar('despesa', '2026-10-30', r$(99.99), { categoriaId: ALIM });
    lancar('despesa', '2026-11-01', r$(45), { categoriaId: ALIM });
    const aluguel = lancar('despesa', '2026-11-10', r$(1800), { categoriaId: VEICULO });
    lancar('despesa', '2026-11-20', r$(15), { categoriaId: STREAMING, status: 'previsto' });
    const compra = comprar('2026-09-02', r$(2400), 4, ELETRO, 'TV');
    comprar('2026-10-02', r$(1000), 3, ALIM, 'Mercado do mês');
    comprar('2026-11-10', r$(150), 2, STREAMING, 'Streaming', CARTAO_B);
    itemFatura('estorno', '2026-11', r$(-89.9), { compraId: compra.id });
    itemFatura('encargo', '2026-12', r$(12.34), { categoriaId: TARIFAS });
    divida('creditado_em_conta', [
      ['2026-10-15', 40, 360],
      ['2026-11-15', 36.4, 363.6],
      ['2026-12-15', 32.76, 367.24],
    ]);
    divida('pago_a_terceiro', [['2026-12-20', 50, 450]]);
    f.ocorrencias.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: id(seq++),
      competencia: c('2026-11'),
      situacao: 'confirmada',
      valor: aluguel.valor,
      data: aluguel.data,
      categoriaId: VEICULO,
      contaId: CONTA,
      lancamentoId: aluguel.id,
      cartaoId: null,
      compraId: null,
    });
  });

  /** Soma dos itens do período agrupados por `chave`: o valor de cada ponto do gráfico. */
  function pontos(itens: readonly ItemReconhecido[], chave: (i: ItemReconhecido) => string) {
    const soma = new Map<string, Centavos>();
    for (const i of itens) soma.set(chave(i), centavos((soma.get(chave(i)) ?? 0) + i.valor));
    return soma;
  }

  it('Receitas × Despesas por mês', () => {
    for (const lista of [receitas, despesas]) {
      const porMes = pontos(lista(periodoDosGraficos), (i) => competenciaDe(i.data));
      expect([...porMes.keys()].length).toBeGreaterThan(1);
      for (const m of meses) expect(somarItens(lista(mes(m)))).toBe(porMes.get(m) ?? 0);
    }
  });

  it('Despesas por categoria, inclusive "Outras" como lista de categorias', () => {
    const porCategoria = pontos(despesas(periodoDosGraficos), (i) => i.categoriaPaiId);
    expect(porCategoria.size).toBeGreaterThan(3);
    for (const [cat, valor] of porCategoria)
      expect(totalDespesas(periodoDosGraficos, { categorias: [cat] })).toBe(valor);
    const outras = [...porCategoria].sort((a, b) => b[1] - a[1]).slice(2);
    expect(totalDespesas(periodoDosGraficos, { categorias: outras.map(([k]) => k) })).toBe(
      outras.reduce((s, [, v]) => s + v, 0),
    );
  });

  it('Gasto acumulado vs. mês anterior: do dia 1 ao dia clicado', () => {
    for (const m of ['2026-10', '2026-11']) {
      const porDia = pontos(despesas(mes(m)), (i) => i.data);
      let acumulado = 0;
      for (let dia = primeiroDia(c(m)); dia <= ultimaData(c(m)); dia = somarDias(dia, 1)) {
        acumulado += porDia.get(dia) ?? 0;
        expect(totalDespesas(periodo(primeiroDia(c(m)), dia))).toBe(acumulado);
      }
    }
  });

  it('Fixos × variáveis: mês e origem (recorrência ou não)', () => {
    const naoRecorrencia = ['manual', 'cartao', 'divida'] as const;
    const porMes = pontos(
      despesas(periodoDosGraficos),
      (i) => `${competenciaDe(i.data)} ${i.origem === 'recorrencia' ? 'fixo' : 'variavel'}`,
    );
    expect(porMes.get('2026-11 fixo')).toBe(r$(1800));
    for (const m of meses) {
      expect(totalDespesas(mes(m), { origens: ['recorrencia'] })).toBe(
        porMes.get(`${m} fixo`) ?? 0,
      );
      expect(totalDespesas(mes(m), { origens: naoRecorrencia })).toBe(
        porMes.get(`${m} variavel`) ?? 0,
      );
    }
  });

  it('Gasto por cartão', () => {
    const itens = despesas(periodoDosGraficos).filter((i) => i.cartaoId !== null);
    const porCartao = pontos(itens, (i) => i.cartaoId as string);
    expect(porCartao.size).toBe(2);
    for (const [cartaoId, valor] of porCartao)
      expect(totalDespesas(periodoDosGraficos, { cartaoId })).toBe(valor);
  });

  it('Resultado do período = receitas − despesas, sem previstos', () => {
    const p: Periodo = mes('2026-11');
    const datas: DataCivil[] = despesas(p).map((i) => i.data);
    expect(datas).not.toContain(d('2026-11-20'));
    expect(totalReceitas(p)).toBe(r$(7000));
  });
});

describe('dados inconsistentes', () => {
  it('categoria ou "Juros e encargos" inexistentes lançam erro', () => {
    lancar('despesa', '2026-11-02', r$(1), { categoriaId: id(12345) });
    expect(() => despesas()).toThrow(RangeError);
    f.lancamentos = [];
    f.categorias = f.categorias.filter((x) => x.sistema !== 'juros_encargos');
    divida('creditado_em_conta', [['2026-11-15', 1, 99]]);
    expect(() => despesas()).toThrow('Juros e encargos');
  });
});
