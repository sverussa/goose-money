import { beforeEach, describe, expect, it } from 'vitest';
import { gerarParcelas } from '../cartoes';
import { competencia, dataCivil } from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import { fatosVazios, type Fatos, type Id, type Lancamento } from '../modelo';
import { derivar } from './derivar';
import { type ItemProjetado, previsaoDeQuitacao, projetarFluxo } from './projecao';

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
const CARTAO = id(3);
const CAT = id(10);

let f: Fatos;
let seq = 100;

beforeEach(() => {
  f = fatosVazios();
  f.categorias.push({
    ...controle,
    id: CAT,
    nome: 'Casa',
    tipo: 'despesa',
    icone: 'home',
    cor: 'cat',
    categoriaPaiId: null,
    sistema: null,
  });
  for (const [contaId, nome, saldoInicial, incluirNoTotal] of [
    [CORRENTE, 'Corrente', 5000, true],
    [RESERVA, 'Reserva', 10_000, false],
  ] as const)
    f.contas.push({
      ...controle,
      id: contaId,
      nome,
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: r$(saldoInicial),
      dataSaldoInicial: d('2026-10-31'),
      cor: 'conta',
      incluirNoTotal,
      arquivada: false,
    });
  // Cartão A: fecha 3, vence 10, controlado desde 2026-10.
  f.cartoes.push({
    ...controle,
    id: CARTAO,
    nome: 'Cartão A',
    instituicao: null,
    cor: 'cartao',
    limite: r$(10_000),
    contaPagamentoId: CORRENTE,
    competenciaInicial: c('2026-10'),
    arquivado: false,
  });
  f.cartaoCiclos.push({
    ...controle,
    id: id(seq++),
    cartaoId: CARTAO,
    vigenteDesde: c('2026-01'),
    diaFechamento: 3,
    diaVencimento: 10,
  });
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
    contaId: CORRENTE,
    contaDestinoId: null,
    categoriaId: tipo === 'receita' || tipo === 'despesa' ? CAT : null,
    cartaoId: null,
    faturaCompetencia: null,
    dividaId: null,
    parcelaDividaId: null,
    ...extra,
  };
  f.lancamentos.push(l);
  return l;
}

function comprar(data: string, total: Centavos, n = 1) {
  const compra = {
    ...controle,
    id: id(seq++),
    cartaoId: CARTAO,
    data: d(data),
    descricao: 'Compra',
    categoriaId: CAT,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  for (const p of gerarParcelas(compra, f.cartoes[0] as Fatos['cartoes'][number], f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p });
  return compra;
}

/** Recorrência desde `inicio`, dia `dia`, em conta ou no Cartão A. */
function recorrencia(
  natureza: 'renda' | 'gasto',
  descricao: string,
  valor: Centavos,
  dia: number,
  { inicio = '2026-11', cartao = false, contaId = CORRENTE } = {},
): Id {
  const rid = id(seq++);
  f.recorrencias.push({
    ...controle,
    id: rid,
    natureza,
    descricao,
    competenciaInicio: c(inicio),
    competenciaFim: null,
    autoConfirmar: false,
    ativa: true,
  });
  f.recorrenciaVersoes.push({
    ...controle,
    id: id(seq++),
    recorrenciaId: rid,
    vigenteDesde: c(inicio),
    valor,
    dia,
    formaPagamento: cartao ? 'cartao' : 'conta',
    contaId: cartao ? null : contaId,
    cartaoId: cartao ? CARTAO : null,
    categoriaId: CAT,
  });
  return rid;
}

function divida(parcelas: [string, number][], contaDebitoId: Id = CORRENTE): Id {
  const did = id(seq++);
  f.dividas.push({
    ...controle,
    id: did,
    tipo: 'emprestimo',
    credor: 'Banco X',
    valorContratado: r$(parcelas.reduce((s, [, v]) => s + v, 0)),
    dataContratacao: d('2026-08-01'),
    destinoDoValor: 'creditado_em_conta',
    sistemaAmortizacao: 'price',
    taxaMensal: '0',
    valorParcelaInformada: null,
    numeroParcelas: parcelas.length,
    dataPrimeiraParcela: d(parcelas[0]?.[0] ?? '2026-09-15'),
    contaDebitoId,
    categoriaId: null,
  });
  parcelas.forEach(([venc, valor], k) =>
    f.parcelasDivida.push({
      ...controle,
      id: id(seq++),
      dividaId: did,
      numero: k + 1,
      vencimento: d(venc),
      valor: r$(valor),
      juros: r$(0),
      amortizacao: r$(valor),
      pagaAntesDoCadastro: false,
    }),
  );
  return did;
}

const projetar = (ate: string, ...h: Parameters<typeof projetarFluxo>[2][]) =>
  projetarFluxo(derivar(f, HOJE), d(ate), h[0]);
const todos = (p: ReturnType<typeof projetarFluxo>) => p.meses.flatMap((m) => m.itens);

describe('projetarFluxo: meses e ponto de partida', () => {
  it('parte do Saldo em contas de hoje (só incluídas); mês corrente de hoje ao fim do mês', () => {
    lancar('despesa', '2026-11-02', r$(300));
    lancar('despesa', '2026-11-02', r$(999), { contaId: RESERVA });
    const p = projetar('2027-01-15');
    expect(p.meses.map((m) => [m.competencia, m.de, m.ate, m.saldoInicial, m.saldoFinal])).toEqual([
      [c('2026-11'), HOJE, d('2026-11-30'), r$(4700), r$(4700)],
      [c('2026-12'), d('2026-12-01'), d('2026-12-31'), r$(4700), r$(4700)],
      [c('2027-01'), d('2027-01-01'), d('2027-01-15'), r$(4700), r$(4700)],
    ]);
    expect(p.alertas).toEqual([]);
    expect(p.simulacao).toBeNull();
  });

  it('termina antes de hoje: erro', () => {
    expect(() => projetar('2026-11-03')).toThrow(RangeError);
  });
});

describe('11.4: sem dupla contagem', () => {
  it('streaming de R$ 55,90 no Cartão A, não confirmado: uma vez, na fatura que vence em 10/12', () => {
    const rid = recorrencia('gasto', 'Streaming', r$(55.9), 12, { cartao: true });
    const p = projetar('2026-12-31');
    const itens = todos(p).filter((i) => i.ref.entidade === 'ocorrencia');
    expect(itens).toEqual([
      {
        grupo: 'faturas',
        data: d('2026-12-10'),
        valor: r$(55.9),
        texto: 'Streaming · Cartão A',
        ref: { entidade: 'ocorrencia', recorrenciaId: rid, competencia: c('2026-11') },
        fatura: { cartaoId: CARTAO, competencia: c('2026-12') },
      },
    ]);
    expect(p.meses.map((m) => m.grupos.gastosFixosConta)).toEqual([r$(0), r$(0)]);
    expect(p.meses[1]?.grupos.faturas).toBe(r$(55.9));
    // Num horizonte maior, cada ocorrência continua aparecendo uma vez só.
    const longo = todos(projetar('2027-06-30')).filter((i) => i.ref.entidade === 'ocorrencia');
    const chaves = longo.map((i) => (i.ref.entidade === 'ocorrencia' ? i.ref.competencia : ''));
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('streaming confirmado vira compra na fatura: conta pela fatura, não pela recorrência', () => {
    const rid = recorrencia('gasto', 'Streaming', r$(55.9), 2, { cartao: true });
    const compra = comprar('2026-11-02', r$(55.9)); // fecha 03/11: fatura 2026-11
    f.ocorrencias.push({
      ...controle,
      id: id(seq++),
      recorrenciaId: rid,
      competencia: c('2026-11'),
      situacao: 'confirmada',
      valor: r$(55.9),
      data: d('2026-11-02'),
      contaId: null,
      cartaoId: CARTAO,
      categoriaId: CAT,
      lancamentoId: null,
      compraId: compra.id,
    });
    const nov = projetar('2026-11-30').meses[0];
    expect(nov?.itens.map((i) => [i.ref.entidade, i.valor])).toEqual([['fatura', r$(55.9)]]);
  });

  it('renda atrasada não entra e gera alerta; vencidos entram no mês corrente', () => {
    recorrencia('renda', 'Salário', r$(6500), 3); // 03/11: atrasada
    recorrencia('renda', 'Freelance', r$(800), 20); // 20/11: prevista
    recorrencia('gasto', 'Aluguel', r$(1800), 1); // 01/11: vencido
    comprar('2026-09-20', r$(700)); // fatura 2026-10, vencida em 10/10
    divida([
      ['2026-10-15', 400],
      ['2026-12-15', 400],
    ]);
    lancar('despesa', '2026-11-01', r$(90), { status: 'previsto', descricao: 'Luz' });
    lancar('receita', '2026-11-02', r$(250), { status: 'previsto', descricao: 'Reembolso' });
    const p = projetar('2026-12-31');
    const [nov, dez] = p.meses;
    expect(nov?.grupos).toEqual({
      rendas: r$(800),
      receitasAvulsas: r$(0),
      gastosFixosConta: r$(1800),
      faturas: r$(700),
      parcelasDividas: r$(400),
      despesasAvulsas: r$(90),
    });
    expect(nov?.saldoFinal).toBe(r$(5000 + 800 - 1800 - 700 - 400 - 90));
    expect(dez?.grupos.rendas).toBe(r$(6500 + 800));
    expect(dez?.grupos.parcelasDividas).toBe(r$(400));
    expect(
      p.alertas.map((a) => (a.tipo === 'naoIncluido' ? [a.item.grupo, a.item.texto] : a.tipo)),
    ).toEqual([
      ['receitasAvulsas', 'Reembolso'],
      ['rendas', 'Salário'],
    ]);
  });

  it('gasto fixo de meses anteriores não confirmado também entra vencido', () => {
    recorrencia('gasto', 'Academia', r$(100), 10, { inicio: '2026-09' });
    const [nov] = projetar('2026-11-30').meses;
    expect(nov?.itens.map((i) => i.data)).toEqual([
      d('2026-09-10'),
      d('2026-10-10'),
      d('2026-11-10'),
    ]);
    expect(nov?.grupos.gastosFixosConta).toBe(r$(300));
  });

  it('fatura paga contribui zero; paga parcialmente, o saldo', () => {
    comprar('2026-10-05', r$(800)); // fatura 2026-11
    comprar('2026-11-05', r$(1000)); // fatura 2026-12
    lancar('pagamento_fatura', '2026-11-04', r$(800), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-11'),
    });
    lancar('pagamento_fatura', '2026-11-04', r$(600), {
      cartaoId: CARTAO,
      faturaCompetencia: c('2026-12'),
    });
    const p = projetar('2026-12-31');
    expect(p.meses.map((m) => m.grupos.faturas)).toEqual([r$(0), r$(400)]);
    expect(p.meses[1]?.itens[0]?.texto).toBe('Fatura Cartão A · vence 10/12');
  });

  it('só fluxos de contas incluídas no total', () => {
    recorrencia('renda', 'Aluguel recebido', r$(1000), 20, { contaId: RESERVA });
    recorrencia('gasto', 'Condomínio', r$(500), 20, { contaId: RESERVA });
    lancar('despesa', '2026-11-20', r$(70), { status: 'previsto', contaId: RESERVA });
    divida([['2026-11-15', 300]], RESERVA);
    expect(todos(projetar('2026-12-31'))).toEqual([]);
  });

  it('Previsto até o fim do mês = saldo final do mês corrente na projeção longa', () => {
    recorrencia('renda', 'Freelance', r$(800), 20);
    comprar('2026-10-10', r$(1200), 12);
    lancar('despesa', '2026-11-25', r$(150), { status: 'previsto' });
    lancar('receita', '2026-11-28', r$(400), { status: 'previsto' });
    const curto = projetar('2026-11-30');
    const longo = projetar('2028-10-31');
    expect(longo.meses).toHaveLength(24);
    expect(curto.meses).toHaveLength(1);
    expect(curto.meses[0]?.saldoFinal).toBe(longo.meses[0]?.saldoFinal);
    expect(curto.meses[0]?.saldoFinal).toBe(r$(5000 + 800 + 400 - 100 - 150));
  });
});

describe('alertas', () => {
  it('mês negativo e mês abaixo do limite de alerta', () => {
    f.preferencias = {
      ...controle,
      id: id(seq++),
      limiteAlerta: r$(1000),
      horizontePadrao: 12,
      ocultarValoresAoAbrir: false,
    };
    lancar('despesa', '2026-11-20', r$(4500), { status: 'previsto' });
    lancar('despesa', '2026-12-20', r$(1000), { status: 'previsto' });
    expect(projetar('2026-12-31').alertas).toEqual([
      { tipo: 'abaixoDoLimite', competencia: c('2026-11'), saldoFinal: r$(500) },
      { tipo: 'negativo', competencia: c('2026-12'), saldoFinal: r$(-500) },
    ]);
  });
});

describe('simulador "E se?"', () => {
  it('compra parcelada e gasto fixo hipotéticos numa curva separada', () => {
    recorrencia('renda', 'Freelance', r$(800), 20);
    const sem = projetar('2027-01-31');
    const com = projetar('2027-01-31', [
      {
        tipo: 'compra',
        descricao: 'TV',
        cartaoId: CARTAO,
        data: HOJE,
        valorTotal: r$(1000),
        numeroParcelas: 3,
      },
      {
        tipo: 'gastoFixo',
        descricao: 'Academia',
        valor: r$(100),
        dia: 2,
        desde: c('2026-11'),
        cartaoId: null,
      },
      {
        tipo: 'gastoFixo',
        descricao: 'Música',
        valor: r$(20),
        dia: 15,
        desde: c('2026-12'),
        cartaoId: CARTAO,
      },
    ]);
    expect(com.meses).toEqual(sem.meses);
    expect(com.alertas).toEqual(sem.alertas);
    const simulados = (com.simulacao ?? []).flatMap((m) =>
      m.itens
        .filter((i) => i.ref.entidade === 'hipotetico')
        .map((i): [string, ItemProjetado['data'], Centavos] => [i.texto, i.data, i.valor]),
    );
    // Hoje (04/11) cai na fatura de 10/12; Academia de novembro (02/11) já passou.
    expect(simulados).toEqual(
      [
        ['TV · 1/3 · Cartão A', d('2026-12-10'), r$(333.34)],
        ['Academia', d('2026-12-02'), r$(100)],
        ['TV · 2/3 · Cartão A', d('2027-01-10'), r$(333.33)],
        ['Música · Cartão A', d('2027-01-10'), r$(20)],
        ['Academia', d('2027-01-02'), r$(100)],
      ].sort((a, b) => (a[1] as string).localeCompare(b[1] as string)),
    );
    expect(com.simulacao?.at(-1)?.saldoFinal).toBe(
      centavos((sem.meses.at(-1)?.saldoFinal ?? 0) - r$(333.34 + 333.33 + 20 + 200)),
    );
  });

  it('compra à vista sem "1/1"', () => {
    const p = projetar('2026-12-31', [
      {
        tipo: 'compra',
        descricao: 'Fone',
        cartaoId: CARTAO,
        data: HOJE,
        valorTotal: r$(200),
        numeroParcelas: 1,
      },
    ]);
    expect(p.simulacao?.[1]?.itens.map((i) => i.texto)).toEqual(['Fone · Cartão A']);
  });

  it('cartão inexistente: erro', () => {
    expect(() =>
      projetar('2026-12-31', [
        {
          tipo: 'gastoFixo',
          descricao: 'X',
          valor: r$(1),
          dia: 10,
          desde: c('2026-11'),
          cartaoId: id(4242),
        },
      ]),
    ).toThrow(RangeError);
  });
});

describe('previsaoDeQuitacao', () => {
  it('última parcela de cada dívida em aberto e de cada compra parcelada a pagar', () => {
    const aberta = divida([
      ['2026-10-15', 100],
      ['2027-03-15', 100],
    ]);
    const quitada = divida([['2026-10-20', 50]]);
    lancar('pagamento_divida', '2026-10-20', r$(50), {
      dividaId: quitada,
      parcelaDividaId: f.parcelasDivida.at(-1)?.id as Id,
    });
    const parcelada = comprar('2026-10-10', r$(1200), 12);
    comprar('2026-10-11', r$(50)); // à vista: fora
    const paga = comprar('2026-08-10', r$(300), 2); // faturas 2026-09 e 2026-10, antes do controle
    expect(previsaoDeQuitacao(derivar(f, HOJE))).toEqual({
      dividas: [{ dividaId: aberta, data: d('2027-03-15') }],
      compras: [{ compraId: parcelada.id, cartaoId: CARTAO, data: d('2027-10-10') }],
    });
    expect(paga.numeroParcelas).toBe(2);
  });
});
