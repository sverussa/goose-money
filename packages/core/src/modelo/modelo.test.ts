import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { Centavos } from '../dinheiro';
import type { Competencia, DataCivil } from '../datas';
import {
  cartaoCicloSchema,
  cartaoSchema,
  categoriaSchema,
  categoriaSistemaSchema,
  centavosComSinalSchema,
  centavosSchema,
  compraSchema,
  competenciaSchema,
  contaSchema,
  corSchema,
  dataCivilSchema,
  destinoDoValorSchema,
  diaSchema,
  dividaSchema,
  fatosSchema,
  fatosVazios,
  formaPagamentoSchema,
  idSchema,
  instanteSchema,
  itemFaturaSchema,
  lancamentoSchema,
  naturezaRecorrenciaSchema,
  ocorrenciaSchema,
  parcelaDividaSchema,
  parcelaSchema,
  preferenciasSchema,
  recorrenciaSchema,
  recorrenciaVersaoSchema,
  sistemaAmortizacaoSchema,
  situacaoOcorrenciaSchema,
  statusLancamentoSchema,
  taxaSchema,
  textoSchema,
  tipoCategoriaSchema,
  tipoContaSchema,
  tipoDividaSchema,
  tipoItemFaturaSchema,
  tipoLancamentoSchema,
  type Fatos,
  type Lancamento,
  type Parcela,
} from './index';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const controle = {
  id: id(1),
  createdAt: '2026-11-05T12:00:00.123456+00:00',
  updatedAt: '2026-11-05T12:00:00Z',
  createdBy: id(99),
  isDeleted: false,
};

const ok = (s: z.ZodType, v: unknown) => {
  expect(s.safeParse(v).error?.issues).toBeUndefined();
};
/** Falha e aponta o campo `campo` (ou a raiz, com `''`). */
const falha = (s: z.ZodType, v: unknown, campo: string) => {
  const r = s.safeParse(v);
  expect(r.success).toBe(false);
  expect(r.error?.issues.map((i) => String(i.path[0] ?? ''))).toContain(campo);
};

describe('tipos de base', () => {
  it.each<[string, z.ZodType, unknown[], unknown[]]>([
    ['id', idSchema, [id(1)], ['abc', '', 1]],
    [
      'instante',
      instanteSchema,
      ['2026-11-05T12:00:00Z', '2026-11-05T09:00:00.5-03:00'],
      ['2026-11-05', '2026-11-05T12:00:00', 'ontem'],
    ],
    ['centavos', centavosSchema, [0, 1590], [-1, 1.5, '1590', Number.MAX_SAFE_INTEGER + 1, NaN]],
    ['centavos com sinal', centavosComSinalSchema, [-1590, 0, 1590], [1.5, '1590']],
    [
      'data civil',
      dataCivilSchema,
      ['2026-11-04', '2028-02-29'],
      ['2026-02-30', '2026-11-4', 20261104],
    ],
    ['competência', competenciaSchema, ['2026-11'], ['2026-13', '2026-1', '2026-11-01']],
    ['dia', diaSchema, [1, 31], [0, 32, 1.5]],
    ['taxa', taxaSchema, ['0', '0.0149', '1'], ['-0.01', '1,49', '.5', '', 0.0149]],
    ['texto', textoSchema, ['Mercado'], ['', '   ', null]],
    ['cor', corSchema, ['verde', 'categorica-1'], ['#1B6B5A', '', 'Verde']],
  ])('%s', (_, s, validos, invalidos) => {
    for (const v of validos) ok(s, v);
    for (const v of invalidos) expect(s.safeParse(v).success, String(v)).toBe(false);
  });
});

describe('enumerações têm exatamente os valores de MODELO-DADOS.md, seção 7', () => {
  it.each<[string, { options: readonly string[] }, string[]]>([
    ['TipoCategoria', tipoCategoriaSchema, ['receita', 'despesa', 'ambos']],
    [
      'CategoriaSistema',
      categoriaSistemaSchema,
      ['a_classificar', 'juros_encargos', 'tarifas', 'ajuste_saldo'],
    ],
    ['TipoConta', tipoContaSchema, ['corrente', 'poupanca', 'investimento', 'dinheiro', 'outra']],
    [
      'TipoLancamento',
      tipoLancamentoSchema,
      [
        'receita',
        'despesa',
        'transferencia',
        'ajuste',
        'pagamento_fatura',
        'captacao',
        'pagamento_divida',
        'amortizacao',
      ],
    ],
    ['StatusLancamento', statusLancamentoSchema, ['previsto', 'efetivado']],
    [
      'TipoItemFatura',
      tipoItemFaturaSchema,
      ['encargo', 'estorno', 'ajuste_compra', 'saldo_anterior_cadastro'],
    ],
    ['TipoDivida', tipoDividaSchema, ['emprestimo', 'financiamento']],
    ['DestinoDoValor', destinoDoValorSchema, ['creditado_em_conta', 'pago_a_terceiro']],
    ['SistemaAmortizacao', sistemaAmortizacaoSchema, ['price', 'sac', 'parcela_informada']],
    ['NaturezaRecorrencia', naturezaRecorrenciaSchema, ['renda', 'gasto']],
    ['FormaPagamento', formaPagamentoSchema, ['conta', 'cartao']],
    ['SituacaoOcorrencia', situacaoOcorrenciaSchema, ['confirmada', 'ignorada']],
  ])('%s', (_, s, valores) => {
    expect(s.options).toEqual(valores);
  });
});

// Um exemplo válido de cada entidade de MODELO-DADOS.md, seção 3.
const categoria = {
  ...controle,
  nome: 'Mercado',
  tipo: 'despesa',
  icone: 'shopping-cart',
  cor: 'categorica-3',
  categoriaPaiId: null,
  sistema: null,
};
const conta = {
  ...controle,
  nome: 'Conta corrente',
  instituicao: null,
  tipo: 'corrente',
  saldoInicial: -5000,
  dataSaldoInicial: '2026-07-31',
  cor: 'categorica-1',
  incluirNoTotal: true,
  arquivada: false,
};
const cartao = {
  ...controle,
  nome: 'Cartão A',
  instituicao: 'Banco',
  cor: 'cartao-a',
  limite: 800000,
  contaPagamentoId: id(2),
  competenciaInicial: '2026-11',
  arquivado: false,
};
const cartaoCiclo = {
  ...controle,
  cartaoId: id(3),
  vigenteDesde: '2026-11',
  diaFechamento: 3,
  diaVencimento: 10,
};
const lancamento = {
  ...controle,
  tipo: 'despesa',
  status: 'efetivado',
  data: '2026-11-04',
  valor: 20000,
  descricao: null,
  observacao: null,
  contaId: id(2),
  contaDestinoId: null,
  categoriaId: id(4),
  cartaoId: null,
  faturaCompetencia: null,
  dividaId: null,
  parcelaDividaId: null,
};
const compra = {
  ...controle,
  cartaoId: id(3),
  data: '2026-11-02',
  descricao: 'Fone',
  categoriaId: id(4),
  observacao: null,
  valorTotal: 100000,
  numeroParcelas: 3,
  cancelada: false,
};
const parcela = { ...controle, compraId: id(5), numero: 1, valor: 33334, competencia: '2026-11' };
const itemFatura = {
  ...controle,
  cartaoId: id(3),
  competencia: '2026-11',
  tipo: 'encargo',
  data: '2026-10-25',
  valor: 3870,
  descricao: 'Juros',
  compraId: null,
  categoriaId: id(4),
};
const divida = {
  ...controle,
  tipo: 'financiamento',
  credor: 'Banco',
  valorContratado: 4000000,
  dataContratacao: '2025-11-10',
  destinoDoValor: 'pago_a_terceiro',
  sistemaAmortizacao: 'price',
  taxaMensal: '0.0149',
  valorParcelaInformada: null,
  numeroParcelas: 48,
  dataPrimeiraParcela: '2025-12-10',
  contaDebitoId: id(2),
  categoriaId: id(4),
};
const parcelaDivida = {
  ...controle,
  dividaId: id(6),
  numero: 1,
  vencimento: '2025-12-10',
  valor: 117000,
  juros: 59600,
  amortizacao: 57400,
  pagaAntesDoCadastro: false,
};
const recorrencia = {
  ...controle,
  natureza: 'renda',
  descricao: 'Salário',
  competenciaInicio: '2026-11',
  competenciaFim: null,
  autoConfirmar: true,
  ativa: true,
};
const recorrenciaVersao = {
  ...controle,
  recorrenciaId: id(7),
  vigenteDesde: '2026-11',
  valor: 650000,
  dia: 5,
  formaPagamento: 'conta',
  contaId: id(2),
  cartaoId: null,
  categoriaId: id(4),
};
const ocorrencia = {
  ...controle,
  recorrenciaId: id(7),
  competencia: '2026-11',
  situacao: 'confirmada',
  valor: 650000,
  data: '2026-11-05',
  contaId: id(2),
  cartaoId: null,
  categoriaId: id(4),
  lancamentoId: id(8),
  compraId: null,
};
const preferencias = {
  ...controle,
  limiteAlerta: 50000,
  horizontePadrao: 12,
  ocultarValoresAoAbrir: false,
};

const entidades: [string, z.ZodType, Record<string, unknown>][] = [
  ['Categoria', categoriaSchema, categoria],
  ['Conta', contaSchema, conta],
  ['Cartao', cartaoSchema, cartao],
  ['CartaoCiclo', cartaoCicloSchema, cartaoCiclo],
  ['Lancamento', lancamentoSchema, lancamento],
  ['Compra', compraSchema, compra],
  ['Parcela', parcelaSchema, parcela],
  ['ItemFatura', itemFaturaSchema, itemFatura],
  ['Divida', dividaSchema, divida],
  ['ParcelaDivida', parcelaDividaSchema, parcelaDivida],
  ['Recorrencia', recorrenciaSchema, recorrencia],
  ['RecorrenciaVersao', recorrenciaVersaoSchema, recorrenciaVersao],
  ['Ocorrencia', ocorrenciaSchema, ocorrencia],
  ['Preferencias', preferenciasSchema, preferencias],
];

describe('toda entidade', () => {
  it.each(entidades)('%s aceita o exemplo válido', (_, s, v) => {
    ok(s, v);
  });

  it.each(entidades)('%s exige as colunas de controle e todos os campos', (_, s, v) => {
    for (const campo of Object.keys(v)) {
      falha(s, Object.fromEntries(Object.entries(v).filter(([k]) => k !== campo)), campo);
    }
  });

  it.each(entidades)('%s rejeita campo desconhecido', (_, s, v) => {
    falha(s, { ...v, extra: 1 }, '');
  });
});

/** Casos inválidos: [descrição, schema, entidade, mudanças, campo apontado]. */
type Caso = [string, z.ZodType, Record<string, unknown>, Record<string, unknown>, string];
const casos = (...lista: Caso[]) => lista;

describe('cadastros', () => {
  it.each(
    casos(
      ['nome vazio', categoriaSchema, categoria, { nome: ' ' }, 'nome'],
      ['ícone vazio', categoriaSchema, categoria, { icone: '' }, 'icone'],
      ['ambos fora do sistema', categoriaSchema, categoria, { tipo: 'ambos' }, 'tipo'],
      [
        'sistema com cor',
        categoriaSchema,
        categoria,
        { sistema: 'tarifas', tipo: 'despesa' },
        'cor',
      ],
      [
        'sistema com tipo errado',
        categoriaSchema,
        categoria,
        { sistema: 'a_classificar', tipo: 'despesa', cor: null },
        'tipo',
      ],
      ['conta com cor nula', contaSchema, conta, { cor: null }, 'cor'],
      ['conta com tipo inválido', contaSchema, conta, { tipo: 'cartao' }, 'tipo'],
      ['limite zero', cartaoSchema, cartao, { limite: 0 }, 'limite'],
      [
        'cartão sem conta de pagamento',
        cartaoSchema,
        cartao,
        { contaPagamentoId: null },
        'contaPagamentoId',
      ],
      [
        'fechamento no dia 0',
        cartaoCicloSchema,
        cartaoCiclo,
        { diaFechamento: 0 },
        'diaFechamento',
      ],
      [
        'vencimento no dia 32',
        cartaoCicloSchema,
        cartaoCiclo,
        { diaVencimento: 32 },
        'diaVencimento',
      ],
      [
        'limite de alerta negativo',
        preferenciasSchema,
        preferencias,
        { limiteAlerta: -1 },
        'limiteAlerta',
      ],
      [
        'horizonte fora da lista',
        preferenciasSchema,
        preferencias,
        { horizontePadrao: 9 },
        'horizontePadrao',
      ],
    ),
  )('%s', (_, s, base, mudancas, campo) => {
    falha(s, { ...base, ...mudancas }, campo);
  });

  it('aceita as categorias de sistema com o tipo da tabela de 3.1', () => {
    for (const [sistema, tipo] of [
      ['a_classificar', 'ambos'],
      ['juros_encargos', 'despesa'],
      ['tarifas', 'despesa'],
      ['ajuste_saldo', 'ambos'],
    ])
      ok(categoriaSchema, { ...categoria, sistema, tipo, cor: null });
  });

  it('aceita subcategoria, categoria sem cor, conta sem instituição e horizontes válidos', () => {
    ok(categoriaSchema, { ...categoria, categoriaPaiId: id(9), cor: null });
    for (const horizontePadrao of [3, 6, 24])
      ok(preferenciasSchema, { ...preferencias, horizontePadrao });
  });
});

describe('lançamentos', () => {
  const porTipo = {
    receita: { categoriaId: id(4) },
    despesa: { categoriaId: id(4) },
    transferencia: { categoriaId: null, contaDestinoId: id(9) },
    ajuste: { categoriaId: id(4), valor: -500 },
    pagamento_fatura: { categoriaId: null, cartaoId: id(3), faturaCompetencia: '2026-11' },
    captacao: { categoriaId: null, dividaId: id(6) },
    pagamento_divida: { categoriaId: null, dividaId: id(6), parcelaDividaId: id(10) },
    amortizacao: { categoriaId: null, dividaId: id(6) },
  };
  const de = (tipo: keyof typeof porTipo) => ({ ...lancamento, tipo, ...porTipo[tipo] });

  it.each(Object.keys(porTipo) as (keyof typeof porTipo)[])('aceita %s', (tipo) => {
    ok(lancamentoSchema, de(tipo));
  });

  it('aceita previsto em receita e despesa', () => {
    ok(lancamentoSchema, { ...de('receita'), status: 'previsto' });
    ok(lancamentoSchema, { ...de('despesa'), status: 'previsto' });
  });

  it.each(
    casos(
      [
        'previsto em transferência',
        lancamentoSchema,
        de('transferencia'),
        { status: 'previsto' },
        'status',
      ],
      ['valor zero', lancamentoSchema, de('despesa'), { valor: 0 }, 'valor'],
      ['valor negativo fora do ajuste', lancamentoSchema, de('receita'), { valor: -1 }, 'valor'],
      ['ajuste zero', lancamentoSchema, de('ajuste'), { valor: 0 }, 'valor'],
      ['valor fracionado', lancamentoSchema, de('despesa'), { valor: 1.5 }, 'valor'],
      [
        'despesa sem categoria',
        lancamentoSchema,
        de('despesa'),
        { categoriaId: null },
        'categoriaId',
      ],
      [
        'ajuste sem categoria',
        lancamentoSchema,
        de('ajuste'),
        { categoriaId: null },
        'categoriaId',
      ],
      [
        'transferência com categoria',
        lancamentoSchema,
        de('transferencia'),
        { categoriaId: id(4) },
        'categoriaId',
      ],
      [
        'transferência sem destino',
        lancamentoSchema,
        de('transferencia'),
        { contaDestinoId: null },
        'contaDestinoId',
      ],
      [
        'transferência para a mesma conta',
        lancamentoSchema,
        de('transferencia'),
        { contaDestinoId: id(2) },
        'contaDestinoId',
      ],
      [
        'despesa com destino',
        lancamentoSchema,
        de('despesa'),
        { contaDestinoId: id(9) },
        'contaDestinoId',
      ],
      [
        'pagamento sem cartão',
        lancamentoSchema,
        de('pagamento_fatura'),
        { cartaoId: null },
        'cartaoId',
      ],
      [
        'pagamento sem fatura',
        lancamentoSchema,
        de('pagamento_fatura'),
        { faturaCompetencia: null },
        'faturaCompetencia',
      ],
      ['despesa com cartão', lancamentoSchema, de('despesa'), { cartaoId: id(3) }, 'cartaoId'],
      [
        'despesa com fatura',
        lancamentoSchema,
        de('despesa'),
        { faturaCompetencia: '2026-11' },
        'faturaCompetencia',
      ],
      ['captação sem dívida', lancamentoSchema, de('captacao'), { dividaId: null }, 'dividaId'],
      ['despesa com dívida', lancamentoSchema, de('despesa'), { dividaId: id(6) }, 'dividaId'],
      [
        'pagamento de dívida sem parcela',
        lancamentoSchema,
        de('pagamento_divida'),
        { parcelaDividaId: null },
        'parcelaDividaId',
      ],
      [
        'amortização com parcela',
        lancamentoSchema,
        de('amortizacao'),
        { parcelaDividaId: id(10) },
        'parcelaDividaId',
      ],
      ['tipo inválido', lancamentoSchema, lancamento, { tipo: 'estorno' }, 'tipo'],
    ),
  )('rejeita %s', (_, s, base, mudancas, campo) => {
    falha(s, { ...base, ...mudancas }, campo);
  });
});

describe('cartões', () => {
  const item = (tipo: string, mudancas: Record<string, unknown>) => ({
    ...itemFatura,
    tipo,
    ...mudancas,
  });

  it('aceita cada tipo de item de fatura', () => {
    ok(itemFaturaSchema, item('encargo', {}));
    ok(itemFaturaSchema, item('estorno', { valor: -8990, compraId: id(5), categoriaId: null }));
    ok(itemFaturaSchema, item('estorno', { valor: -8990 }));
    ok(
      itemFaturaSchema,
      item('ajuste_compra', { valor: -100, compraId: id(5), categoriaId: null }),
    );
    ok(itemFaturaSchema, item('saldo_anterior_cadastro', { valor: 90000, categoriaId: null }));
    ok(compraSchema, { ...compra, numeroParcelas: 1, cancelada: true });
  });

  it.each(
    casos(
      ['compra de valor zero', compraSchema, compra, { valorTotal: 0 }, 'valorTotal'],
      ['compra em 0 parcelas', compraSchema, compra, { numeroParcelas: 0 }, 'numeroParcelas'],
      ['compra em 1,5 parcela', compraSchema, compra, { numeroParcelas: 1.5 }, 'numeroParcelas'],
      ['compra sem categoria', compraSchema, compra, { categoriaId: null }, 'categoriaId'],
      ['parcela 0', parcelaSchema, parcela, { numero: 0 }, 'numero'],
      ['parcela de valor zero', parcelaSchema, parcela, { valor: 0 }, 'valor'],
      [
        'parcela sem competência',
        parcelaSchema,
        parcela,
        { competencia: '2026-11-02' },
        'competencia',
      ],
      ['encargo negativo', itemFaturaSchema, item('encargo', { valor: -1 }), {}, 'valor'],
      [
        'encargo sem categoria',
        itemFaturaSchema,
        item('encargo', { categoriaId: null }),
        {},
        'categoriaId',
      ],
      [
        'encargo com compra',
        itemFaturaSchema,
        item('encargo', { compraId: id(5) }),
        {},
        'compraId',
      ],
      ['estorno positivo', itemFaturaSchema, item('estorno', { valor: 1 }), {}, 'valor'],
      [
        'estorno sem compra e sem categoria',
        itemFaturaSchema,
        item('estorno', { valor: -1, categoriaId: null }),
        {},
        'categoriaId',
      ],
      [
        'estorno com compra e categoria',
        itemFaturaSchema,
        item('estorno', { valor: -1, compraId: id(5) }),
        {},
        'categoriaId',
      ],
      [
        'ajuste de compra zero',
        itemFaturaSchema,
        item('ajuste_compra', { valor: 0, compraId: id(5), categoriaId: null }),
        {},
        'valor',
      ],
      [
        'ajuste de compra sem compra',
        itemFaturaSchema,
        item('ajuste_compra', { valor: 1, categoriaId: null }),
        {},
        'compraId',
      ],
      [
        'ajuste de compra com categoria',
        itemFaturaSchema,
        item('ajuste_compra', { valor: 1, compraId: id(5) }),
        {},
        'categoriaId',
      ],
      [
        'saldo anterior zero',
        itemFaturaSchema,
        item('saldo_anterior_cadastro', { valor: 0, categoriaId: null }),
        {},
        'valor',
      ],
      [
        'saldo anterior com categoria',
        itemFaturaSchema,
        item('saldo_anterior_cadastro', {}),
        {},
        'categoriaId',
      ],
      [
        'saldo anterior com compra',
        itemFaturaSchema,
        item('saldo_anterior_cadastro', { categoriaId: null, compraId: id(5) }),
        {},
        'compraId',
      ],
    ),
  )('rejeita %s', (_, s, base, mudancas, campo) => {
    falha(s, { ...base, ...mudancas }, campo);
  });
});

describe('dívidas', () => {
  const informada = {
    ...divida,
    tipo: 'emprestimo',
    destinoDoValor: 'creditado_em_conta',
    categoriaId: null,
    sistemaAmortizacao: 'parcela_informada',
    taxaMensal: null,
    valorContratado: 480000,
    valorParcelaInformada: 45000,
    numeroParcelas: 12,
  };

  it('aceita Price, SAC com taxa zero, parcela informada e parcela paga antes do cadastro', () => {
    ok(dividaSchema, { ...divida, sistemaAmortizacao: 'sac', taxaMensal: '0' });
    ok(dividaSchema, informada);
    ok(dividaSchema, { ...informada, valorParcelaInformada: 40000 }); // 400 × 12 = PV
    ok(parcelaDividaSchema, {
      ...parcelaDivida,
      valor: 0,
      juros: 0,
      amortizacao: 0,
      pagaAntesDoCadastro: true,
    });
  });

  it.each(
    casos(
      ['credor vazio', dividaSchema, divida, { credor: '' }, 'credor'],
      ['valor contratado zero', dividaSchema, divida, { valorContratado: 0 }, 'valorContratado'],
      ['0 parcelas', dividaSchema, divida, { numeroParcelas: 0 }, 'numeroParcelas'],
      ['Price sem taxa', dividaSchema, divida, { taxaMensal: null }, 'taxaMensal'],
      ['taxa negativa', dividaSchema, divida, { taxaMensal: '-0.01' }, 'taxaMensal'],
      [
        'Price com parcela informada',
        dividaSchema,
        divida,
        { valorParcelaInformada: 117000 },
        'valorParcelaInformada',
      ],
      [
        'parcela informada com taxa',
        dividaSchema,
        informada,
        { taxaMensal: '0.0186' },
        'taxaMensal',
      ],
      [
        'parcela informada sem valor',
        dividaSchema,
        informada,
        { valorParcelaInformada: null },
        'valorParcelaInformada',
      ],
      [
        'parcela informada zero',
        dividaSchema,
        informada,
        { valorParcelaInformada: 0 },
        'valorParcelaInformada',
      ],
      [
        'parcela informada × n < PV (11.5)',
        dividaSchema,
        informada,
        { valorParcelaInformada: 30000 },
        'valorParcelaInformada',
      ],
      ['pago a terceiro sem categoria', dividaSchema, divida, { categoriaId: null }, 'categoriaId'],
      [
        'creditado em conta com categoria',
        dividaSchema,
        informada,
        { categoriaId: id(4) },
        'categoriaId',
      ],
      ['parcela 0', parcelaDividaSchema, parcelaDivida, { numero: 0 }, 'numero'],
      ['juros negativos', parcelaDividaSchema, parcelaDivida, { juros: -1, valor: 57399 }, 'juros'],
      [
        'valor ≠ juros + amortização',
        parcelaDividaSchema,
        parcelaDivida,
        { valor: 117001 },
        'valor',
      ],
    ),
  )('rejeita %s', (_, s, base, mudancas, campo) => {
    falha(s, { ...base, ...mudancas }, campo);
  });
});

describe('recorrências', () => {
  const noCartao = {
    ...recorrenciaVersao,
    formaPagamento: 'cartao',
    contaId: null,
    cartaoId: id(3),
  };
  const ignorada = {
    ...ocorrencia,
    situacao: 'ignorada',
    valor: null,
    data: null,
    contaId: null,
    categoriaId: null,
    lancamentoId: null,
  };
  const confirmadaNoCartao = {
    ...ocorrencia,
    contaId: null,
    lancamentoId: null,
    cartaoId: id(3),
    compraId: id(5),
  };

  it('aceita fim igual ao início, versão no cartão, ocorrência ignorada e confirmada no cartão', () => {
    ok(recorrenciaSchema, { ...recorrencia, competenciaFim: '2026-11' });
    ok(recorrenciaVersaoSchema, noCartao);
    ok(ocorrenciaSchema, ignorada);
    ok(ocorrenciaSchema, confirmadaNoCartao);
  });

  it.each(
    casos(
      ['descrição vazia', recorrenciaSchema, recorrencia, { descricao: '' }, 'descricao'],
      [
        'fim antes do início',
        recorrenciaSchema,
        recorrencia,
        { competenciaFim: '2026-10' },
        'competenciaFim',
      ],
      ['natureza inválida', recorrenciaSchema, recorrencia, { natureza: 'receita' }, 'natureza'],
      ['valor zero', recorrenciaVersaoSchema, recorrenciaVersao, { valor: 0 }, 'valor'],
      ['dia 32', recorrenciaVersaoSchema, recorrenciaVersao, { dia: 32 }, 'dia'],
      [
        'em conta sem conta',
        recorrenciaVersaoSchema,
        recorrenciaVersao,
        { contaId: null },
        'contaId',
      ],
      [
        'em conta com cartão',
        recorrenciaVersaoSchema,
        recorrenciaVersao,
        { cartaoId: id(3) },
        'cartaoId',
      ],
      ['no cartão sem cartão', recorrenciaVersaoSchema, noCartao, { cartaoId: null }, 'cartaoId'],
      ['no cartão com conta', recorrenciaVersaoSchema, noCartao, { contaId: id(2) }, 'contaId'],
      ['confirmada sem valor', ocorrenciaSchema, ocorrencia, { valor: null }, 'valor'],
      ['confirmada sem data', ocorrenciaSchema, ocorrencia, { data: null }, 'data'],
      [
        'confirmada sem categoria',
        ocorrenciaSchema,
        ocorrencia,
        { categoriaId: null },
        'categoriaId',
      ],
      [
        'conta sem lançamento',
        ocorrenciaSchema,
        ocorrencia,
        { lancamentoId: null },
        'lancamentoId',
      ],
      ['lançamento sem conta', ocorrenciaSchema, ocorrencia, { contaId: null }, 'contaId'],
      [
        'os dois pares',
        ocorrenciaSchema,
        ocorrencia,
        { cartaoId: id(3), compraId: id(5) },
        'cartaoId',
      ],
      [
        'nenhum par',
        ocorrenciaSchema,
        ocorrencia,
        { contaId: null, lancamentoId: null },
        'cartaoId',
      ],
      ['cartão sem compra', ocorrenciaSchema, confirmadaNoCartao, { compraId: null }, 'compraId'],
      ['ignorada com valor', ocorrenciaSchema, ignorada, { valor: 1 }, 'valor'],
      ['ignorada com compra', ocorrenciaSchema, ignorada, { compraId: id(5) }, 'compraId'],
    ),
  )('rejeita %s', (_, s, base, mudancas, campo) => {
    falha(s, { ...base, ...mudancas }, campo);
  });
});

describe('Fatos', () => {
  it('fatosVazios é válido e não tem nenhuma entidade', () => {
    const f = fatosVazios();
    ok(fatosSchema, f);
    expect(Object.values(f).every((v) => v === null || (Array.isArray(v) && v.length === 0))).toBe(
      true,
    );
    expect(fatosVazios()).not.toBe(f); // cada chamada é uma cópia nova
  });

  it('aceita um conjunto com uma entidade de cada tipo', () => {
    ok(fatosSchema, {
      categorias: [categoria],
      contas: [conta],
      cartoes: [cartao],
      cartaoCiclos: [cartaoCiclo],
      lancamentos: [lancamento],
      compras: [compra],
      parcelas: [parcela],
      itensFatura: [itemFatura],
      dividas: [divida],
      parcelasDivida: [parcelaDivida],
      recorrencias: [recorrencia],
      recorrenciaVersoes: [recorrenciaVersao],
      ocorrencias: [ocorrencia],
      preferencias,
    });
  });

  it('rejeita entidade excluída', () => {
    falha(fatosSchema, { ...fatosVazios(), contas: [{ ...conta, isDeleted: true }] }, 'contas');
    falha(
      fatosSchema,
      { ...fatosVazios(), preferencias: { ...preferencias, isDeleted: true } },
      'preferencias',
    );
  });

  it('os tipos vêm dos schemas, com os tipos de marca do core', () => {
    expectTypeOf<Lancamento['valor']>().toEqualTypeOf<Centavos>();
    expectTypeOf<Lancamento['data']>().toEqualTypeOf<DataCivil>();
    expectTypeOf<Parcela['competencia']>().toEqualTypeOf<Competencia>();
    expectTypeOf<Lancamento['faturaCompetencia']>().toEqualTypeOf<Competencia | null>();
    expectTypeOf<Fatos['lancamentos']>().toEqualTypeOf<Lancamento[]>();
  });
});
