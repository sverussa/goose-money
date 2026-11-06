import { describe, expect, it } from 'vitest';
import { fatosVazios, type Fatos } from '../modelo';
import {
  A_CLASSIFICAR,
  c,
  CARTAO,
  cenario,
  CONTA_A,
  CONTA_B,
  contexto,
  d,
  HOJE,
  JUROS,
  MERCADO,
  r$,
  recusa,
  SALARIO,
  verificar,
} from './cenario';
import {
  arquivarCartao,
  arquivarConta,
  configurarCiclo,
  criarCartao,
  criarCategoria,
  criarConta,
  desarquivarCartao,
  desarquivarConta,
  editarCartao,
  editarCategoria,
  editarConta,
  excluirCartao,
  excluirCategoria,
  excluirConta,
  type NovaConta,
  type NovoCartao,
  permissoesDaConta,
  salvarPreferencias,
} from './cadastros';
import { novaCompra } from './compras';
import { contratarDivida } from './dividas';
import { lancar } from './lancamentos';
import { criarRecorrencia, editarRecorrencia } from './recorrencias';

const novaConta: NovaConta = {
  nome: 'Carteira',
  instituicao: null,
  tipo: 'dinheiro',
  saldoInicial: r$(0),
  dataSaldoInicial: HOJE,
  cor: 'categorica-3',
  incluirNoTotal: true,
};

const novoCartao: NovoCartao = {
  nome: 'Cartão B',
  instituicao: null,
  cor: 'cartao-b',
  limite: r$(5000),
  contaPagamentoId: CONTA_A,
  diaFechamento: 25,
  diaVencimento: 5,
  saldoFaturaFechada: r$(0),
};

const gastoFixo = (f: Fatos, forma: 'conta' | 'cartao') =>
  verificar(
    f,
    criarRecorrencia(
      f,
      contexto(),
      {
        natureza: 'gasto',
        descricao: 'Streaming',
        competenciaInicio: c('2026-11'),
        competenciaFim: null,
        autoConfirmar: false,
      },
      {
        valor: r$(55.9),
        dia: 12,
        formaPagamento: forma,
        contaId: forma === 'conta' ? CONTA_B : null,
        cartaoId: forma === 'cartao' ? CARTAO : null,
        categoriaId: MERCADO,
      },
    ),
  );

describe('contas', () => {
  it('cria; o nome é único entre contas e cartões ativos (D67, 11.2)', () => {
    const f = cenario();
    verificar(f, criarConta(f, contexto(), novaConta));
    recusa(() => criarConta(f, contexto(), { ...novaConta, nome: ' poupança ' }), /Já existe/);
    recusa(() => criarConta(f, contexto(), { ...novaConta, nome: 'cartão a' }), /Já existe/);
  });

  it('edita; desmarcar "Incluir no total" da conta de pagamento é bloqueado (11.2)', () => {
    const f = cenario();
    const cmd = editarConta(f, contexto(), CONTA_A, { nome: 'Corrente' });
    expect(cmd.mudancas[0]?.dados).toEqual({ nome: 'Corrente' });
    verificar(f, cmd);
    recusa(
      () => editarConta(f, contexto(), CONTA_A, { incluirNoTotal: false }),
      /precisa ficar no total/,
    );
    verificar(f, editarConta(f, contexto(), CONTA_B, { incluirNoTotal: false }));
  });

  it('arquivar exige saldo zero e nenhum vínculo ativo; desarquivar traz de volta (11.2)', () => {
    const f = cenario();
    expect(permissoesDaConta(f, CONTA_A, HOJE).arquivar.motivo).toMatch(/saldo zero/);
    recusa(() => arquivarConta(f, contexto(), CONTA_A), /saldo zero/);
    const arquivada = verificar(f, arquivarConta(f, contexto(), CONTA_B));
    recusa(() => arquivarConta(arquivada, contexto(), CONTA_B), 'está arquivada');
    recusa(() => editarConta(arquivada, contexto(), CONTA_B, { nome: 'X' }), 'está arquivada');
    verificar(arquivada, desarquivarConta(arquivada, contexto(), CONTA_B));
    recusa(() => desarquivarConta(f, contexto(), CONTA_B), 'A conta não está arquivada');
    const reusado = verificar(
      arquivada,
      criarConta(arquivada, contexto(), { ...novaConta, nome: 'Poupança' }),
    );
    recusa(() => desarquivarConta(reusado, contexto(), CONTA_B), /Já existe/);
  });

  it('cartão ativo, recorrência ativa e dívida a vencer impedem arquivar', () => {
    const f = cenario();
    const pagaCartao = verificar(
      f,
      editarCartao(f, contexto(), CARTAO, { contaPagamentoId: CONTA_B }),
    );
    expect(permissoesDaConta(pagaCartao, CONTA_B, HOJE).arquivar.motivo).toBe(
      'A conta paga um cartão ativo.',
    );

    const comGasto = gastoFixo(f, 'conta');
    expect(permissoesDaConta(comGasto, CONTA_B, HOJE).arquivar.motivo).toMatch(
      /renda ou um gasto fixo/,
    );
    const inativo = verificar(
      comGasto,
      editarRecorrencia(comGasto, contexto(), comGasto.recorrencias[0]?.id as string, {
        ativa: false,
      }),
    );
    expect(permissoesDaConta(inativo, CONTA_B, HOJE).arquivar.permitida).toBe(true);

    const comDivida = verificar(
      f,
      contratarDivida(
        f,
        contexto(),
        {
          tipo: 'emprestimo',
          credor: 'Banco',
          valorContratado: r$(300),
          dataContratacao: d('2026-10-01'),
          destinoDoValor: 'creditado_em_conta',
          sistemaAmortizacao: 'price',
          taxaMensal: '0',
          valorParcelaInformada: null,
          numeroParcelas: 3,
          dataPrimeiraParcela: d('2026-11-01'),
          contaDebitoId: CONTA_B,
          categoriaId: null,
        },
        { parcelasPagas: 0, contaCaptacaoId: null },
      ),
    );
    expect(permissoesDaConta(comDivida, CONTA_B, HOJE).arquivar.motivo).toMatch(
      /dívida com parcelas a vencer/,
    );
    expect(permissoesDaConta(comDivida, CONTA_B, HOJE).excluir.motivo).toMatch(/ligada a cartão/);
  });

  it('excluir só sem movimentos nem vínculos; o app oferece "Arquivar" (11.2)', () => {
    const f = cenario();
    const excluida = verificar(f, excluirConta(f, contexto(), CONTA_B));
    expect(excluida.contas.map((x) => x.id)).toEqual([CONTA_A]);
    recusa(() => excluirConta(f, contexto(), CONTA_A), /ligada a cartão.*Arquive-a/);
    const comMovimento = verificar(
      f,
      lancar(f, contexto(), {
        tipo: 'transferencia',
        status: 'efetivado',
        data: HOJE,
        valor: r$(10),
        descricao: null,
        observacao: null,
        contaId: CONTA_A,
        contaDestinoId: CONTA_B,
        categoriaId: null,
        cartaoId: null,
        faturaCompetencia: null,
        dividaId: null,
        parcelaDividaId: null,
      }),
    );
    recusa(
      () => excluirConta(comMovimento, contexto(), CONTA_B),
      'A conta tem movimentos. Arquive-a.',
    );
    recusa(() => permissoesDaConta(f, 'x', HOJE), 'Conta não encontrada');
  });
});

describe('cartões', () => {
  it('a primeira fatura controlada é a aberta no cadastro (D61)', () => {
    const f = cenario();
    const depois = verificar(f, criarCartao(f, contexto(), novoCartao));
    const cartao = depois.cartoes[1];
    expect(cartao?.competenciaInicial).toBe('2026-12'); // fecha 25/11, vence 05/12
    expect(depois.cartaoCiclos[1]).toMatchObject({ cartaoId: cartao?.id, vigenteDesde: '2026-12' });
    expect(depois.itensFatura).toEqual([]);
  });

  it('cartão já em uso: o saldo a pagar vira "Saldo anterior ao cadastro" na fatura fechada (D21)', () => {
    const f = cenario();
    const depois = verificar(
      f,
      criarCartao(f, contexto(), { ...novoCartao, saldoFaturaFechada: r$(900) }),
    );
    expect(depois.itensFatura[0]).toMatchObject({
      tipo: 'saldo_anterior_cadastro',
      competencia: '2026-11',
      valor: r$(900),
    });
    recusa(
      () => criarCartao(f, contexto(), { ...novoCartao, saldoFaturaFechada: r$(-1) }),
      /negativo/,
    );
  });

  it('conta de pagamento ativa e incluída; nome único', () => {
    const f = cenario();
    const fora = verificar(f, editarConta(f, contexto(), CONTA_B, { incluirNoTotal: false }));
    recusa(
      () => criarCartao(fora, contexto(), { ...novoCartao, contaPagamentoId: CONTA_B }),
      /incluída no total/,
    );
    recusa(
      () => editarCartao(fora, contexto(), CARTAO, { contaPagamentoId: CONTA_B }),
      /incluída no total/,
    );
    recusa(
      () => criarCartao(f, contexto(), { ...novoCartao, nome: 'Conta corrente' }),
      /Já existe/,
    );
    verificar(f, editarCartao(f, contexto(), CARTAO, { limite: r$(9000) }));
  });

  it('configurar ciclo vale da primeira fatura não fechada; de novo, regrava a mesma versão', () => {
    const f = cenario();
    const cmd = configurarCiclo(f, contexto(), CARTAO, 5, 12);
    expect(cmd.mudancas[0]).toMatchObject({ acao: 'inserir', dados: { vigenteDesde: '2026-12' } });
    const depois = verificar(f, cmd);
    const outra = configurarCiclo(depois, contexto(), CARTAO, 6, 12);
    expect(outra.mudancas).toEqual([
      {
        entidade: 'cartaoCiclos',
        acao: 'alterar',
        id: cmd.mudancas[0]?.id,
        dados: { diaFechamento: 6 },
      },
    ]);
    verificar(depois, outra);
  });

  it('arquivar exige Obrigações zero e nenhum gasto fixo ativo; excluir, nenhum movimento (11.3)', () => {
    const f = cenario();
    const comCompra = verificar(
      f,
      novaCompra(f, contexto(), {
        cartaoId: CARTAO,
        data: HOJE,
        descricao: null,
        categoriaId: MERCADO,
        observacao: null,
        valorTotal: r$(1200),
        numeroParcelas: 12,
      }),
    );
    recusa(() => arquivarCartao(comCompra, contexto(), CARTAO), /Há saldo em faturas/);
    recusa(() => excluirCartao(comCompra, contexto(), CARTAO), /Use "Arquivar"/);
    const comGasto = gastoFixo(f, 'cartao');
    recusa(
      () => arquivarCartao(comGasto, contexto(), CARTAO),
      'Há gasto fixo ativo pago neste cartão.',
    );
    recusa(() => excluirCartao(comGasto, contexto(), CARTAO), /Há gasto fixo pago neste cartão/);
  });

  it('arquiva, desarquiva e exclui com os ciclos (D68)', () => {
    const f = cenario();
    const arquivado = verificar(f, arquivarCartao(f, contexto(), CARTAO));
    recusa(() => editarCartao(arquivado, contexto(), CARTAO, { limite: r$(1) }), 'está arquivado');
    verificar(arquivado, desarquivarCartao(arquivado, contexto(), CARTAO));
    recusa(() => desarquivarCartao(f, contexto(), CARTAO), 'O cartão não está arquivado');
    const sem = verificar(f, excluirCartao(f, contexto(), CARTAO));
    expect([sem.cartoes, sem.cartaoCiclos]).toEqual([[], []]);
    recusa(() => excluirCartao(f, contexto(), 'x'), 'Cartão não encontrado');
  });
});

describe('categorias', () => {
  const sub = {
    nome: 'Feira',
    tipo: 'despesa' as const,
    icone: 'apple',
    cor: null,
    categoriaPaiId: MERCADO,
  };

  it('subcategoria num nível só, com o tipo da pai (D35)', () => {
    const f = cenario();
    const cmd = criarCategoria(f, contexto(), sub);
    const depois = verificar(f, cmd);
    const subId = cmd.mudancas[0]?.id as string;
    recusa(
      () => criarCategoria(depois, contexto(), { ...sub, categoriaPaiId: subId }),
      /num nível só/,
    );
    recusa(
      () => criarCategoria(f, contexto(), { ...sub, categoriaPaiId: A_CLASSIFICAR }),
      /num nível só/,
    );
    recusa(
      () => criarCategoria(f, contexto(), { ...sub, tipo: 'receita' }),
      'A subcategoria tem o tipo da categoria pai',
    );
    recusa(
      () => editarCategoria(depois, contexto(), MERCADO, { tipo: 'receita' }),
      'A subcategoria tem o tipo da categoria pai',
    );
    recusa(
      () => editarCategoria(depois, contexto(), MERCADO, { categoriaPaiId: SALARIO }),
      /num nível só/,
    );
    verificar(depois, editarCategoria(depois, contexto(), subId, { nome: 'Hortifrúti' }));
  });

  it('categorias de sistema não são editadas nem excluídas', () => {
    const f = cenario();
    recusa(
      () => editarCategoria(f, contexto(), JUROS, { nome: 'X' }),
      'Categoria de sistema não pode ser editada',
    );
    recusa(
      () => excluirCategoria(f, contexto(), JUROS),
      'Categoria de sistema não pode ser excluída',
    );
  });

  it('excluir leva as subcategorias e move os itens para "A classificar" (D49)', () => {
    const f0 = cenario();
    const cmdSub = criarCategoria(f0, contexto(), sub);
    const f1 = verificar(f0, cmdSub);
    const f = verificar(
      f1,
      novaCompra(f1, contexto(), {
        cartaoId: CARTAO,
        data: HOJE,
        descricao: null,
        categoriaId: cmdSub.mudancas[0]?.id as string,
        observacao: null,
        valorTotal: r$(30),
        numeroParcelas: 1,
      }),
    );
    const cmd = excluirCategoria(f, contexto(), MERCADO);
    expect(cmd.descricao).toBe('Categoria excluída');
    const depois = verificar(f, cmd);
    expect(depois.compras[0]?.categoriaId).toBe(A_CLASSIFICAR);
    expect(depois.categorias.map((x) => x.nome)).not.toContain('Feira');
    recusa(
      () =>
        excluirCategoria(
          { ...f, categorias: f.categorias.filter((x) => x.sistema === null) },
          contexto(),
          MERCADO,
        ),
      'Categorias de sistema não inicializadas',
    );
  });
});

describe('preferências', () => {
  it('altera a linha do usuário', () => {
    const f = cenario();
    const cmd = salvarPreferencias(f, contexto(), { horizontePadrao: 6 });
    expect(cmd.mudancas[0]?.dados).toEqual({ horizontePadrao: 6 });
    verificar(f, cmd);
  });

  it('antes da inicialização, cria com os campos dados', () => {
    const f = fatosVazios();
    const campos = {
      limiteAlerta: r$(0),
      horizontePadrao: 12 as const,
      ocultarValoresAoAbrir: true,
    };
    expect(verificar(f, salvarPreferencias(f, contexto(), campos)).preferencias).toMatchObject(
      campos,
    );
    recusa(() => salvarPreferencias(f, contexto(), { horizontePadrao: 6 }), /./);
  });
});
