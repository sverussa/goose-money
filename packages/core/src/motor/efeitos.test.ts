import { beforeEach, describe, expect, it } from 'vitest';
import { gerarParcelas } from '../cartoes';
import { competencia, dataCivil } from '../datas';
import { type Centavos, centavos } from '../dinheiro';
import { fatosVazios, type Fatos, type Id, type Lancamento } from '../modelo';
import { type IndicadoresDaBarra, indicadoresDaBarra } from './barra';
import { derivar } from './derivar';

/**
 * PROMPT 7.4: um teste por linha da tabela. Cada um mede os 5 indicadores da Barra antes e
 * depois da ação, gravada como fato novo, e confere a diferença.
 */

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
const INCLUIDA = id(1);
const EXCLUIDA = id(2);
const INCLUIDA_2 = id(3);
/** Cartão A: fecha 3, vence 10 (fatura aberta vence em 10/12). */
const CARTAO_A = id(4);
/** Cartão B: fecha 8, vence 28 (fatura aberta vence em 28/11). Só nos testes que o usam. */
const CARTAO_B = id(5);
const CAT = id(10);
const DIVIDA = id(20);
const PARCELA_NOV = id(21);
const SALARIO = id(30);
const ALUGUEL = id(31);

let f: Fatos;
let seq = 100;

function conta(contaId: Id, saldo: number, incluirNoTotal: boolean) {
  f.contas.push({
    ...controle,
    id: contaId,
    nome: contaId,
    instituicao: null,
    tipo: 'corrente',
    saldoInicial: r$(saldo),
    dataSaldoInicial: d('2026-10-31'),
    cor: 'conta',
    incluirNoTotal,
    arquivada: false,
  });
}

function cartao(cartaoId: Id, fecha: number, vence: number, inicial: string) {
  f.cartoes.push({
    ...controle,
    id: cartaoId,
    nome: cartaoId,
    instituicao: null,
    cor: 'cartao',
    limite: r$(10_000),
    contaPagamentoId: INCLUIDA,
    competenciaInicial: c(inicial),
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

function recorrencia(rid: Id, natureza: 'renda' | 'gasto', valor: Centavos, dia: number) {
  f.recorrencias.push({
    ...controle,
    id: rid,
    natureza,
    descricao: rid,
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
    valor,
    dia,
    formaPagamento: 'conta',
    contaId: INCLUIDA,
    cartaoId: null,
    categoriaId: CAT,
  });
}

/** Fatos base de 7.4: conta incluída e excluída, um cartão, uma dívida, uma renda e um gasto fixo. */
beforeEach(() => {
  f = fatosVazios();
  f.categorias.push({
    ...controle,
    id: CAT,
    nome: 'Geral',
    tipo: 'despesa',
    icone: 'tag',
    cor: 'cat',
    categoriaPaiId: null,
    sistema: null,
  });
  conta(INCLUIDA, 5000, true);
  conta(EXCLUIDA, 2000, false);
  cartao(CARTAO_A, 3, 10, '2026-10');
  f.dividas.push({
    ...controle,
    id: DIVIDA,
    tipo: 'emprestimo',
    credor: 'Banco X',
    valorContratado: r$(905),
    dataContratacao: d('2026-10-01'),
    destinoDoValor: 'creditado_em_conta',
    sistemaAmortizacao: 'price',
    taxaMensal: '0.1',
    valorParcelaInformada: null,
    numeroParcelas: 2,
    dataPrimeiraParcela: d('2026-11-20'),
    contaDebitoId: INCLUIDA,
    categoriaId: null,
  });
  f.categorias.push({
    ...controle,
    id: id(11),
    nome: 'Juros e encargos',
    tipo: 'despesa',
    icone: 'percent',
    cor: null,
    categoriaPaiId: null,
    sistema: 'juros_encargos',
  });
  for (const [pid, numero, vencimento, juros, amortizacao] of [
    [PARCELA_NOV, 1, '2026-11-20', 50, 450],
    [id(22), 2, '2026-12-20', 45, 455],
  ] as const)
    f.parcelasDivida.push({
      ...controle,
      id: pid,
      dividaId: DIVIDA,
      numero,
      vencimento: d(vencimento),
      valor: r$(juros + amortizacao),
      juros: r$(juros),
      amortizacao: r$(amortizacao),
      pagaAntesDoCadastro: false,
    });
  recorrencia(SALARIO, 'renda', r$(6500), 4); // prevista para hoje
  recorrencia(ALUGUEL, 'gasto', r$(1800), 1); // vencido, entra no mês corrente
});

function lancar(
  tipo: Lancamento['tipo'],
  data: string,
  valor: Centavos,
  extra: Partial<Lancamento> = {},
) {
  const l: Lancamento = {
    ...controle,
    id: id(seq++),
    tipo,
    status: 'efetivado',
    data: d(data),
    valor,
    descricao: null,
    observacao: null,
    contaId: INCLUIDA,
    contaDestinoId: null,
    categoriaId: tipo === 'receita' || tipo === 'despesa' ? CAT : tipo === 'ajuste' ? CAT : null,
    cartaoId: null,
    faturaCompetencia: null,
    dividaId: null,
    parcelaDividaId: null,
    ...extra,
  };
  f.lancamentos.push(l);
  return l;
}

function comprar(cartaoId: Id, data: string, total: Centavos, n = 1) {
  const compra = {
    ...controle,
    id: id(seq++),
    cartaoId,
    data: d(data),
    descricao: 'Compra',
    categoriaId: CAT,
    observacao: null,
    valorTotal: total,
    numeroParcelas: n,
    cancelada: false,
  };
  f.compras.push(compra);
  const dono = f.cartoes.find((x) => x.id === cartaoId) as Fatos['cartoes'][number];
  for (const p of gerarParcelas(compra, dono, f.cartaoCiclos))
    f.parcelas.push({ ...controle, id: id(seq++), compraId: compra.id, ...p });
  return compra;
}

/** Confirma a ocorrência de novembro com o valor real: lançamento efetivado + retrato. */
function confirmar(rid: Id, natureza: 'renda' | 'gasto', data: string, valor: Centavos) {
  const l = lancar(natureza === 'renda' ? 'receita' : 'despesa', data, valor);
  f.ocorrencias.push({
    ...controle,
    id: id(seq++),
    recorrenciaId: rid,
    competencia: c('2026-11'),
    situacao: 'confirmada',
    valor,
    data: d(data),
    contaId: INCLUIDA,
    cartaoId: null,
    categoriaId: CAT,
    lancamentoId: l.id,
    compraId: null,
  });
  return l;
}

const barra = () => indicadoresDaBarra(derivar(f, HOJE));

/** Diferença nos 5 indicadores provocada por `acao`. */
function efeito(acao: () => void): Record<keyof IndicadoresDaBarra, Centavos> {
  const antes = barra();
  acao();
  const depois = barra();
  const chaves = Object.keys(antes) as (keyof IndicadoresDaBarra)[];
  return Object.fromEntries(chaves.map((k) => [k, depois[k] - antes[k]])) as Record<
    keyof IndicadoresDaBarra,
    Centavos
  >;
}

/** Saldo em contas, A pagar nos cartões, Resultado do mês, Previsto até o fim do mês, Patrimônio. */
const esperado = (
  saldo: number,
  aPagar: number,
  resultado: number,
  previsto: number,
  patrimonio: number,
) => ({
  saldoEmContas: r$(saldo),
  aPagarNosCartoes: r$(aPagar),
  resultadoDoMes: r$(resultado),
  previstoAteOFimDoMes: r$(previsto),
  patrimonioLiquido: r$(patrimonio),
});

describe('tabela 7.4: efeito de cada ação nos indicadores da Barra', () => {
  it('base: os indicadores de partida', () => {
    expect(barra()).toEqual({
      saldoEmContas: r$(5000),
      previstoAteOFimDoMes: r$(5000 + 6500 - 1800 - 500),
      aPagarNosCartoes: r$(0),
      resultadoDoMes: r$(-50), // juros da parcela de 20/11
      patrimonioLiquido: r$(5000 + 2000 - 905),
    });
  });

  it('despesa em conta, data no mês', () => {
    expect(efeito(() => lancar('despesa', '2026-11-03', r$(100)))).toEqual(
      esperado(-100, 0, -100, -100, -100),
    );
  });

  it('receita em conta, data no mês', () => {
    expect(efeito(() => lancar('receita', '2026-11-03', r$(100)))).toEqual(
      esperado(100, 0, 100, 100, 100),
    );
  });

  it('compra à vista no cartão: fatura que vence depois do mês e no mês', () => {
    expect(efeito(() => comprar(CARTAO_A, '2026-11-04', r$(100)))).toEqual(
      esperado(0, 100, 0, 0, -100),
    );
    cartao(CARTAO_B, 8, 28, '2026-11');
    expect(efeito(() => comprar(CARTAO_B, '2026-11-04', r$(100)))).toEqual(
      esperado(0, 100, -100, -100, -100),
    );
  });

  it('compra parcelada no cartão: parcela da fatura aberta; total no patrimônio', () => {
    expect(efeito(() => comprar(CARTAO_A, '2026-11-04', r$(900), 3))).toEqual(
      esperado(0, 300, 0, 0, -900),
    );
    cartao(CARTAO_B, 8, 28, '2026-11');
    expect(efeito(() => comprar(CARTAO_B, '2026-11-04', r$(900), 3))).toEqual(
      esperado(0, 300, -300, -300, -900),
    );
  });

  it('transferência entre contas com a mesma inclusão', () => {
    conta(INCLUIDA_2, 0, true);
    expect(
      efeito(() => lancar('transferencia', '2026-11-04', r$(500), { contaDestinoId: INCLUIDA_2 })),
    ).toEqual(esperado(0, 0, 0, 0, 0));
  });

  it('transferência de incluída para excluída', () => {
    expect(
      efeito(() => lancar('transferencia', '2026-11-04', r$(500), { contaDestinoId: EXCLUIDA })),
    ).toEqual(esperado(-500, 0, 0, -500, 0));
  });

  it('transferência de excluída para incluída', () => {
    expect(
      efeito(() =>
        lancar('transferencia', '2026-11-04', r$(500), {
          contaId: EXCLUIDA,
          contaDestinoId: INCLUIDA,
        }),
      ),
    ).toEqual(esperado(500, 0, 0, 500, 0));
  });

  it('pagamento de fatura: vencendo no mês e vencendo depois', () => {
    comprar(CARTAO_A, '2026-10-20', r$(800)); // fatura 2026-11, fechada, vence 10/11
    comprar(CARTAO_A, '2026-11-04', r$(300)); // fatura 2026-12, aberta, vence 10/12
    const pagar = (v: number, fatura: string) => () =>
      lancar('pagamento_fatura', '2026-11-04', r$(v), {
        cartaoId: CARTAO_A,
        faturaCompetencia: c(fatura),
      });
    expect(efeito(pagar(800, '2026-11'))).toEqual(esperado(-800, -800, 0, 0, 0));
    expect(efeito(pagar(300, '2026-12'))).toEqual(esperado(-300, -300, 0, -300, 0));
  });

  it('confirmar renda prevista pelo valor previsto', () => {
    expect(efeito(() => confirmar(SALARIO, 'renda', '2026-11-04', r$(6500)))).toEqual(
      esperado(6500, 0, 6500, 0, 6500),
    );
  });

  it('confirmar renda atrasada (fora da projeção) pelo valor previsto', () => {
    const freela = id(32);
    recorrencia(freela, 'renda', r$(800), 2);
    expect(efeito(() => confirmar(freela, 'renda', '2026-11-02', r$(800)))).toEqual(
      esperado(800, 0, 800, 800, 800),
    );
  });

  it('confirmar gasto fixo em conta pelo valor previsto', () => {
    expect(efeito(() => confirmar(ALUGUEL, 'gasto', '2026-11-01', r$(1800)))).toEqual(
      esperado(-1800, 0, -1800, 0, -1800),
    );
  });

  it('valor real diferente do previsto: renda e gasto', () => {
    expect(efeito(() => confirmar(SALARIO, 'renda', '2026-11-04', r$(6600)))).toEqual(
      esperado(6600, 0, 6600, 100, 6600),
    );
    expect(efeito(() => confirmar(ALUGUEL, 'gasto', '2026-11-01', r$(1900)))).toEqual(
      esperado(-1900, 0, -1900, -100, -1900),
    );
  });

  it('pagar parcela de dívida que vence no mês', () => {
    expect(
      efeito(() =>
        lancar('pagamento_divida', '2026-11-04', r$(500), {
          dividaId: DIVIDA,
          parcelaDividaId: PARCELA_NOV,
        }),
      ),
    ).toEqual(esperado(-500, 0, 0, 0, -50));
  });

  it('ajuste de saldo de diferença ±d', () => {
    expect(efeito(() => lancar('ajuste', '2026-11-04', r$(37.5)))).toEqual(
      esperado(37.5, 0, 0, 37.5, 37.5),
    );
    expect(efeito(() => lancar('ajuste', '2026-11-04', r$(-37.5)))).toEqual(
      esperado(-37.5, 0, 0, -37.5, -37.5),
    );
  });
});
