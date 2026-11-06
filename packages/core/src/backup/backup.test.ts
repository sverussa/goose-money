import { describe, expect, it } from 'vitest';
import { centavos } from '../dinheiro';
import { fatosSchema, fatosVazios, type Fatos } from '../modelo';
import {
  VERSAO_BACKUP,
  backupSchema,
  exportar,
  migrarBackup,
  planejarImportacao,
  relatorio,
  validarInvariantes,
  validarReferencias,
} from './index';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const AGORA = '2026-11-05T12:00:00Z';
const ctl = (n: number) => ({
  id: id(n),
  createdAt: '2026-11-01T12:00:00.123456+00:00',
  updatedAt: '2026-11-04T12:00:00Z',
  createdBy: id(99),
  isDeleted: false,
});

/** Uma entidade de cada tipo, todas ligadas entre si. */
const fatos: Fatos = fatosSchema.parse({
  categorias: [
    {
      ...ctl(4),
      nome: 'Mercado',
      tipo: 'despesa',
      icone: 'shopping-cart',
      cor: null,
      categoriaPaiId: null,
      sistema: null,
    },
  ],
  contas: [
    {
      ...ctl(2),
      nome: 'Conta corrente',
      instituicao: null,
      tipo: 'corrente',
      saldoInicial: -5000,
      dataSaldoInicial: '2026-07-31',
      cor: 'categorica-1',
      incluirNoTotal: true,
      arquivada: false,
    },
  ],
  cartoes: [
    {
      ...ctl(3),
      nome: 'Cartão A',
      instituicao: null,
      cor: 'cartao-a',
      limite: 800000,
      contaPagamentoId: id(2),
      competenciaInicial: '2026-11',
      arquivado: false,
    },
  ],
  cartaoCiclos: [
    { ...ctl(8), cartaoId: id(3), vigenteDesde: '2026-11', diaFechamento: 3, diaVencimento: 10 },
  ],
  lancamentos: [
    {
      ...ctl(9),
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
    },
  ],
  compras: [
    {
      ...ctl(5),
      cartaoId: id(3),
      data: '2026-11-02',
      descricao: 'Fone',
      categoriaId: id(4),
      observacao: null,
      valorTotal: 100000,
      numeroParcelas: 3,
      cancelada: false,
    },
  ],
  parcelas: [
    { ...ctl(10), compraId: id(5), numero: 1, valor: 33334, competencia: '2026-11' },
    { ...ctl(11), compraId: id(5), numero: 2, valor: 33333, competencia: '2026-12' },
    { ...ctl(12), compraId: id(5), numero: 3, valor: 33333, competencia: '2027-01' },
  ],
  itensFatura: [
    {
      ...ctl(13),
      cartaoId: id(3),
      competencia: '2026-11',
      tipo: 'saldo_anterior_cadastro',
      data: '2026-10-25',
      valor: 3870,
      descricao: null,
      compraId: null,
      categoriaId: null,
    },
  ],
  dividas: [
    {
      ...ctl(6),
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
    },
  ],
  parcelasDivida: [
    {
      ...ctl(14),
      dividaId: id(6),
      numero: 1,
      vencimento: '2025-12-10',
      valor: 117000,
      juros: 59600,
      amortizacao: 57400,
      pagaAntesDoCadastro: false,
    },
  ],
  recorrencias: [
    {
      ...ctl(7),
      natureza: 'gasto',
      descricao: 'Academia',
      competenciaInicio: '2026-11',
      competenciaFim: null,
      autoConfirmar: true,
      ativa: true,
    },
  ],
  recorrenciaVersoes: [
    {
      ...ctl(15),
      recorrenciaId: id(7),
      vigenteDesde: '2026-11',
      valor: 20000,
      dia: 4,
      formaPagamento: 'conta',
      contaId: id(2),
      cartaoId: null,
      categoriaId: id(4),
    },
  ],
  ocorrencias: [
    {
      ...ctl(16),
      recorrenciaId: id(7),
      competencia: '2026-11',
      situacao: 'confirmada',
      valor: 20000,
      data: '2026-11-04',
      contaId: id(2),
      cartaoId: null,
      categoriaId: id(4),
      lancamentoId: id(9),
      compraId: null,
    },
  ],
  preferencias: {
    ...ctl(17),
    limiteAlerta: 0,
    horizontePadrao: 6,
    ocultarValoresAoAbrir: false,
  },
});

/** O arquivo como ele chega na importação: texto lido de volta. */
const arquivo = (f: Fatos = fatos): unknown => JSON.parse(JSON.stringify(exportar(f, AGORA)));
const comDados = (dados: Partial<Fatos>): unknown => arquivo({ ...fatos, ...dados });
const [parcela1, parcela2, parcela3] = fatos.parcelas as [
  Fatos['parcelas'][number],
  Fatos['parcelas'][number],
  Fatos['parcelas'][number],
];
const compra = fatos.compras[0] as Fatos['compras'][number];
const ocorrencia = fatos.ocorrencias[0] as Fatos['ocorrencias'][number];

describe('exportar', () => {
  it('gera o envelope de 9.1, válido pelo schema de backup', () => {
    const b = exportar(fatos, AGORA);
    expect(b).toMatchObject({
      schemaVersion: VERSAO_BACKUP,
      exportadoEm: AGORA,
      app: 'goose-money',
    });
    expect(backupSchema.parse(arquivo())).toEqual(b);
  });

  it('registros excluídos nunca aparecem no arquivo', () => {
    const comExcluidos = {
      ...fatos,
      parcelas: [...fatos.parcelas, { ...parcela1, id: id(50), isDeleted: true }],
      preferencias: {
        ...(fatos.preferencias as NonNullable<Fatos['preferencias']>),
        isDeleted: true,
      },
    };
    const b = exportar(comExcluidos, AGORA);
    expect(b.dados.parcelas).toEqual(fatos.parcelas);
    expect(b.dados.preferencias).toBeNull();
    expect(JSON.stringify(b)).not.toContain('"isDeleted":true');
  });
});

describe('migrarBackup', () => {
  it('sem migrações devolve o arquivo como está', () => {
    const a = arquivo();
    expect(migrarBackup(a)).toBe(a);
    expect(migrarBackup(null)).toBeNull();
  });

  it('aplica as migrações em ordem a partir do schemaVersion', () => {
    const lista = [
      (a: Record<string, unknown>) => ({ ...a, passos: ['1→2'] }),
      (a: Record<string, unknown>) => ({ ...a, passos: [...(a.passos as string[]), '2→3'] }),
    ];
    expect(migrarBackup({ schemaVersion: 1 }, lista)).toEqual({
      schemaVersion: 3,
      passos: ['1→2', '2→3'],
    });
    expect(migrarBackup({ schemaVersion: 3 }, lista)).toEqual({ schemaVersion: 3 });
    expect(migrarBackup({ schemaVersion: 0 }, lista)).toEqual({ schemaVersion: 0 });
  });
});

describe('etapa 1: estrutura', () => {
  it.each<[string, unknown, string | null, string]>([
    ['arquivo que não é objeto', 'texto', null, ''],
    ['outro app', { ...(arquivo() as object), app: 'outro' }, null, 'app'],
    ['versão desconhecida', { ...(arquivo() as object), schemaVersion: 2 }, null, 'schemaVersion'],
    [
      'campo inválido de uma entidade',
      comDados({ parcelas: [{ ...parcela1, valor: -1 as never }] }),
      'parcelas',
      '0.valor',
    ],
  ])('%s invalida o plano', (_, a, entidade, caminho) => {
    const plano = planejarImportacao(a, fatosVazios(), 'substituir');
    expect(plano.valido).toBe(false);
    expect(plano.resultado).toBeNull();
    expect(plano.erros[0]).toMatchObject({ etapa: 'estrutura', entidade });
    expect(plano.erros[0]?.mensagem.startsWith(caminho)).toBe(true);
  });
});

describe('Substituir', () => {
  it('sobre a base vazia reproduz os mesmos fatos (11.7)', () => {
    const plano = planejarImportacao(arquivo(), fatosVazios(), 'substituir');
    expect(plano.erros).toEqual([]);
    expect(plano.valido).toBe(true);
    expect(plano.resultado).toEqual(fatos);
    expect(plano.entidades.parcelas.novos).toEqual(fatos.parcelas);
    expect(plano.entidades.preferencias.novos).toEqual([fatos.preferencias]);
  });

  it('exclui o que está fora do arquivo e regrava por id o que está nele', () => {
    const atual = {
      ...fatos,
      parcelas: [...fatos.parcelas, { ...parcela3, id: id(60), numero: 4 }],
    };
    const plano = planejarImportacao(arquivo(), atual, 'substituir');
    expect(plano.entidades.parcelas.excluir).toEqual([id(60)]);
    expect(plano.entidades.parcelas.atualizados).toEqual(fatos.parcelas);
    expect(plano.entidades.parcelas.novos).toEqual([]);
    expect(plano.resultado).toEqual(fatos);
  });
});

describe('Mesclar', () => {
  it('o mesmo arquivo duas vezes não cria duplicatas (11.7)', () => {
    const primeira = planejarImportacao(arquivo(), fatosVazios(), 'mesclar');
    expect(primeira.valido).toBe(true);
    expect(primeira.resultado).toEqual(fatos);
    const segunda = planejarImportacao(arquivo(), primeira.resultado as Fatos, 'mesclar');
    expect(segunda.valido).toBe(true);
    expect(segunda.resultado).toEqual(fatos);
    expect(segunda.entidades.parcelas).toEqual({
      novos: [],
      atualizados: [],
      mantidos: fatos.parcelas.map((p) => p.id),
      excluir: [],
    });
  });

  it('mesmo id: fica o de updatedAt mais recente, comparando instantes', () => {
    const recente = { ...compra, descricao: 'Fone novo', updatedAt: '2026-11-05T10:00:00.5-03:00' };
    const igual = { ...parcela1, valor: 1 as never, updatedAt: '2026-11-04T09:00:00-03:00' };
    const plano = planejarImportacao(
      comDados({ compras: [recente], parcelas: [igual, parcela2, parcela3] }),
      fatos,
      'mesclar',
    );
    expect(plano.valido).toBe(true);
    expect(plano.entidades.compras.atualizados).toEqual([recente]);
    expect(plano.entidades.parcelas.mantidos).toContain(parcela1.id);
    expect(plano.resultado?.parcelas).toEqual(fatos.parcelas);
  });

  it('referência pode apontar para a base; ids novos são adicionados', () => {
    const nova = { ...compra, id: id(70), valorTotal: centavos(500), numeroParcelas: 1 };
    const parcela = { ...parcela1, id: id(71), compraId: id(70), valor: centavos(500) };
    const plano = planejarImportacao(
      arquivo({ ...fatosVazios(), compras: [nova], parcelas: [parcela] }),
      fatos,
      'mesclar',
    );
    expect(plano.erros).toEqual([]);
    expect(plano.entidades.compras.novos).toEqual([nova]);
    expect(plano.resultado?.parcelas).toHaveLength(4);
    // Em Substituir a base some: a mesma referência quebra.
    expect(
      planejarImportacao(
        arquivo({ ...fatosVazios(), compras: [nova], parcelas: [parcela] }),
        fatos,
        'substituir',
      ).valido,
    ).toBe(false);
  });

  it('conflito de chave única mantém o existente e entra no relatório', () => {
    const outra = { ...ocorrencia, id: id(80) };
    const plano = planejarImportacao(comDados({ ocorrencias: [outra] }), fatos, 'mesclar');
    expect(plano.valido).toBe(true);
    expect(plano.conflitos).toEqual([
      { entidade: 'ocorrencias', id: id(80), idExistente: ocorrencia.id },
    ]);
    expect(plano.resultado?.ocorrencias).toEqual([ocorrencia]);
    expect(relatorio(plano).contagens.find((c) => c.entidade === 'ocorrencias')).toMatchObject({
      novos: 0,
      conflitos: 1,
    });
  });

  it('atualização que tomaria a chave de outro registro é conflito', () => {
    const conta2 = {
      ...(fatos.contas[0] as Fatos['contas'][number]),
      id: id(81),
      nome: 'Poupança',
    };
    const base = { ...fatos, contas: [...fatos.contas, conta2] };
    const renomeada = { ...conta2, nome: ' conta CORRENTE ', updatedAt: AGORA };
    const plano = planejarImportacao(arquivo({ ...base, contas: [renomeada] }), base, 'mesclar');
    expect(plano.conflitos).toEqual([{ entidade: 'contas', id: id(81), idExistente: id(2) }]);
    expect(plano.resultado?.contas).toEqual(base.contas);
  });

  it('atualização que troca a própria chave libera a antiga', () => {
    const renomeada = {
      ...(fatos.contas[0] as Fatos['contas'][number]),
      nome: 'Nova',
      updatedAt: AGORA,
    };
    const nova = { ...renomeada, id: id(82), nome: 'Conta corrente', updatedAt: AGORA };
    const plano = planejarImportacao(comDados({ contas: [renomeada, nova] }), fatos, 'mesclar');
    expect(plano.conflitos).toEqual([]);
    expect(plano.resultado?.contas).toEqual([renomeada, nova]);
  });

  it('se as invariantes quebram depois de mesclar, o plano é inválido', () => {
    const maior = { ...compra, valorTotal: centavos(200000), updatedAt: AGORA };
    const plano = planejarImportacao(comDados({ compras: [maior] }), fatos, 'mesclar');
    expect(plano.valido).toBe(false);
    expect(plano.erros).toEqual([
      expect.objectContaining({ etapa: 'invariante', entidade: 'compras', id: compra.id }),
    ]);
  });
});

describe('etapa 2: integridade referencial', () => {
  it('parcela apontando para compra inexistente invalida o plano e o relatório aponta a entidade (11.7)', () => {
    const solta = { ...parcela1, id: id(90), compraId: id(91) };
    const plano = planejarImportacao(
      comDados({ parcelas: [...fatos.parcelas, solta] }),
      fatosVazios(),
      'substituir',
    );
    expect(plano.valido).toBe(false);
    const r = relatorio(plano);
    expect(r.valido).toBe(false);
    expect(r.erros).toEqual([
      {
        etapa: 'referencia',
        entidade: 'parcelas',
        id: id(90),
        mensagem: `compraId aponta para compras inexistente: ${id(91)}`,
      },
    ]);
    expect(r.contagens.find((c) => c.entidade === 'parcelas')?.erros).toBe(1);
  });

  it('confere cada referência da seção 2 do modelo, ignorando as nulas', () => {
    expect(validarReferencias(fatos)).toEqual([]);
    const sem = {
      ...fatosVazios(),
      lancamentos: fatos.lancamentos,
      ocorrencias: fatos.ocorrencias,
    };
    expect(
      validarReferencias(sem).map((e) => `${String(e.entidade)}.${e.mensagem.split(' ')[0] ?? ''}`),
    ).toEqual([
      'lancamentos.contaId',
      'lancamentos.categoriaId',
      'ocorrencias.recorrenciaId',
      'ocorrencias.contaId',
      'ocorrencias.categoriaId',
    ]);
  });
});

describe('etapa 3: invariantes', () => {
  const daCompra = (c: Partial<Fatos['compras'][number]>, parcelas = fatos.parcelas) =>
    validarInvariantes({ ...fatos, compras: [{ ...compra, ...c }], parcelas }).map(
      (e) => e.mensagem,
    );

  it('3.6: soma, quantidade, numeração e ordem das competências', () => {
    expect(validarInvariantes(fatos)).toEqual([]);
    expect(daCompra({ valorTotal: centavos(100001) })).toEqual([
      'Soma das parcelas difere do valor total',
    ]);
    expect(daCompra({}, [parcela1, parcela2])).toEqual([
      'Parcelas precisam ser numeradas de 1 a numeroParcelas',
      'Soma das parcelas difere do valor total',
    ]);
    expect(daCompra({}, [parcela1, parcela2, { ...parcela3, numero: 4 }])).toEqual([
      'Parcelas precisam ser numeradas de 1 a numeroParcelas',
    ]);
    expect(
      daCompra({}, [parcela1, { ...parcela2, competencia: '2027-02' as never }, parcela3]),
    ).toEqual(['Competências das parcelas fora de ordem']);
  });

  it('compra cancelada pode ter só parte das parcelas, mas não além do número', () => {
    expect(daCompra({ cancelada: true }, [parcela1])).toEqual([]);
    expect(daCompra({ cancelada: true }, [{ ...parcela1, numero: 4 }])).toEqual([
      'Parcela além do número de parcelas',
    ]);
  });

  it('chave única repetida no arquivo invalida o plano', () => {
    const repetida = { ...ocorrencia, id: id(95) };
    const plano = planejarImportacao(
      comDados({ ocorrencias: [ocorrencia, repetida] }),
      fatosVazios(),
      'substituir',
    );
    expect(plano.erros).toEqual([
      {
        etapa: 'invariante',
        entidade: 'ocorrencias',
        id: id(95),
        mensagem: `Chave única repetida com ${ocorrencia.id}`,
      },
    ]);
  });

  it('nomes repetidos só valem entre contas e cartões não arquivados', () => {
    const conta = fatos.contas[0] as Fatos['contas'][number];
    const cartao = fatos.cartoes[0] as Fatos['cartoes'][number];
    const f = {
      ...fatos,
      contas: [conta, { ...conta, id: id(96), arquivada: true }],
      cartoes: [cartao, { ...cartao, id: id(97), nome: 'CARTÃO A', arquivado: true }],
    };
    expect(validarInvariantes(f)).toEqual([]);
    expect(
      validarInvariantes({ ...f, cartoes: [cartao, { ...cartao, id: id(97), nome: 'cartão a ' }] }),
    ).toHaveLength(1);
  });

  it('o nome é único entre contas e cartões não arquivados juntos (D67)', () => {
    const cartao = fatos.cartoes[0] as Fatos['cartoes'][number];
    const comNome = (nome: string, arquivado = false) =>
      validarInvariantes({ ...fatos, cartoes: [{ ...cartao, nome, arquivado }] });
    expect(comNome('Conta corrente')).toEqual([
      {
        etapa: 'invariante',
        entidade: 'cartoes',
        id: cartao.id,
        mensagem: `Chave única repetida com ${id(2)}`,
      },
    ]);
    expect(comNome('  CONTA Corrente ')).toHaveLength(1);
    expect(comNome('Conta corrente', true)).toEqual([]);
  });

  it('Mesclar: cartão com o nome de uma conta da base é conflito', () => {
    const cartao = {
      ...(fatos.cartoes[0] as Fatos['cartoes'][number]),
      id: id(98),
      nome: 'conta corrente ',
    };
    const plano = planejarImportacao(
      arquivo({ ...fatosVazios(), cartoes: [cartao] }),
      fatos,
      'mesclar',
    );
    expect(plano.valido).toBe(true);
    expect(plano.conflitos).toEqual([{ entidade: 'cartoes', id: id(98), idExistente: id(2) }]);
  });
});

describe('relatorio', () => {
  it('conta por entidade o que o plano faz', () => {
    const r = relatorio(planejarImportacao(arquivo(), fatosVazios(), 'substituir'));
    expect(r).toMatchObject({ modo: 'substituir', valido: true, conflitos: [], erros: [] });
    expect(r.contagens).toHaveLength(14);
    expect(r.contagens.find((c) => c.entidade === 'parcelas')).toEqual({
      entidade: 'parcelas',
      novos: 3,
      atualizados: 0,
      mantidos: 0,
      excluidos: 0,
      conflitos: 0,
      erros: 0,
    });
  });
});
