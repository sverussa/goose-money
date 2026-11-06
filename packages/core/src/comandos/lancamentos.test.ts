import { describe, expect, it } from 'vitest';
import { saldo } from '../contas';
import type { Lancamento } from '../modelo';
import {
  AJUSTE,
  c,
  CONTA_A,
  CONTA_B,
  CARTAO,
  cenario,
  contexto,
  d,
  HOJE,
  MERCADO,
  r$,
  recusa,
  SALARIO,
  verificar,
} from './cenario';
import { arquivarConta } from './cadastros';
import { novaCompra, pagarFatura } from './compras';
import { amortizarDivida, contratarDivida } from './dividas';
import {
  ajustarSaldo,
  classificar,
  editarLancamento,
  excluirLancamento,
  lancar,
} from './lancamentos';
import type { CamposDe } from './mudancas';
import { confirmarOcorrencia, criarRecorrencia } from './recorrencias';

const despesa = (campos: Partial<CamposDe<Lancamento>> = {}): CamposDe<Lancamento> => ({
  tipo: 'despesa',
  status: 'efetivado',
  data: HOJE,
  valor: r$(200),
  descricao: null,
  observacao: null,
  contaId: CONTA_A,
  contaDestinoId: null,
  categoriaId: MERCADO,
  cartaoId: null,
  faturaCompetencia: null,
  dividaId: null,
  parcelaDividaId: null,
  ...campos,
});

describe('lancar', () => {
  it('receita, despesa e transferência viram uma inserção com "Lançado"', () => {
    const f = cenario();
    for (const campos of [
      despesa(),
      despesa({ tipo: 'receita', categoriaId: SALARIO }),
      despesa({ tipo: 'transferencia', categoriaId: null, contaDestinoId: CONTA_B }),
    ]) {
      const cmd = lancar(f, contexto(), campos);
      expect(cmd.descricao).toBe('Lançado');
      expect(cmd.mudancas.map((m) => [m.entidade, m.acao])).toEqual([['lancamentos', 'inserir']]);
      verificar(f, cmd);
    }
  });

  it('efetivado nunca tem data futura; previsto pode (D79)', () => {
    const f = cenario();
    recusa(() => lancar(f, contexto(), despesa({ data: d('2026-11-05') })), /data futura/);
    verificar(f, lancar(f, contexto(), despesa({ data: d('2026-12-01'), status: 'previsto' })));
  });

  it('recusa tipo de outra tela, categoria do outro tipo, valor zero e conta arquivada', () => {
    const f = cenario();
    recusa(
      () => lancar(f, contexto(), despesa({ tipo: 'ajuste', categoriaId: AJUSTE })),
      'Tipo de lançamento não permitido aqui',
    );
    recusa(() => lancar(f, contexto(), despesa({ categoriaId: SALARIO })), 'não é de despesa');
    recusa(() => lancar(f, contexto(), despesa({ valor: r$(0) })), 'Precisa ser > 0');
    const comB = verificar(f, arquivarConta(f, contexto(), CONTA_B));
    recusa(
      () =>
        lancar(
          comB,
          contexto(),
          despesa({ tipo: 'transferencia', categoriaId: null, contaDestinoId: CONTA_B }),
        ),
      'está arquivada',
    );
  });
});

describe('editarLancamento e excluirLancamento', () => {
  const f0 = cenario();
  const cmd = lancar(f0, contexto(), despesa());
  const f = verificar(f0, cmd);
  const lid = cmd.mudancas[0]?.id as string;

  it('grava só os campos que mudam; sem mudança, nada', () => {
    const editar = editarLancamento(f, contexto(), lid, { valor: r$(250), descricao: null });
    expect(editar.mudancas).toEqual([
      { entidade: 'lancamentos', acao: 'alterar', id: lid, dados: { valor: r$(250) } },
    ]);
    expect(editar.inversas[0]?.dados).toEqual({ valor: r$(200) });
    verificar(f, editar);
    expect(editarLancamento(f, contexto(), lid, {}).mudancas).toEqual([]);
  });

  it('não muda tipo nem vínculo, nem data efetivada futura', () => {
    recusa(
      () => editarLancamento(f, contexto(), lid, { tipo: 'receita', categoriaId: SALARIO }),
      /tipo e o vínculo/,
    );
    recusa(() => editarLancamento(f, contexto(), lid, { data: d('2026-11-30') }), /data futura/);
    recusa(() => editarLancamento(f, contexto(), 'x', {}), 'Lançamento não encontrado');
  });

  it('excluir é lógico e o Desfazer devolve o lançamento (11.8)', () => {
    const excluir = excluirLancamento(f, contexto(), lid);
    expect(excluir.mudancas).toEqual([
      { entidade: 'lancamentos', acao: 'alterar', id: lid, dados: { isDeleted: true } },
    ]);
    expect(excluir.descricao).toBe('Lançamento excluído');
    const depois = verificar(f, excluir);
    expect(saldo(depois, CONTA_A, HOJE)).toBe(r$(1000));
  });

  it('o lançamento de uma ocorrência leva o retrato na edição e a ocorrência na exclusão (D68)', () => {
    const base = verificar(
      f0,
      criarRecorrencia(
        f0,
        contexto(),
        {
          natureza: 'renda',
          descricao: 'Salário',
          competenciaInicio: c('2026-11'),
          competenciaFim: null,
          autoConfirmar: false,
        },
        {
          valor: r$(6500),
          dia: 2,
          formaPagamento: 'conta',
          contaId: CONTA_A,
          cartaoId: null,
          categoriaId: SALARIO,
        },
      ),
    );
    const conf = verificar(
      base,
      confirmarOcorrencia(base, contexto(), base.recorrencias[0]?.id as string, c('2026-11')),
    );
    const l = conf.lancamentos[0] as Lancamento;
    const editado = verificar(conf, editarLancamento(conf, contexto(), l.id, { valor: r$(6600) }));
    expect(editado.ocorrencias[0]?.valor).toBe(r$(6600));
    const excluido = verificar(conf, excluirLancamento(conf, contexto(), l.id));
    expect(excluido.ocorrencias).toEqual([]);
  });

  it('amortização não é editada nem excluída; conta arquivada é só leitura', () => {
    const comDivida = verificar(
      f0,
      contratarDivida(
        f0,
        contexto(),
        {
          tipo: 'emprestimo',
          credor: 'Banco',
          valorContratado: r$(1200),
          dataContratacao: d('2026-09-01'),
          destinoDoValor: 'creditado_em_conta',
          sistemaAmortizacao: 'price',
          taxaMensal: '0',
          valorParcelaInformada: null,
          numeroParcelas: 12,
          dataPrimeiraParcela: d('2026-10-01'),
          contaDebitoId: CONTA_A,
          categoriaId: null,
        },
        { parcelasPagas: 0, contaCaptacaoId: null },
      ),
    );
    const amortizado = verificar(
      comDivida,
      amortizarDivida(comDivida, contexto(), comDivida.dividas[0]?.id as string, {
        valor: r$(100),
        data: HOJE,
        modo: 'reduzirPrazo',
      }),
    );
    const a = amortizado.lancamentos[0] as Lancamento;
    recusa(
      () => editarLancamento(amortizado, contexto(), a.id, {}),
      'Amortização não pode ser editada',
    );
    recusa(
      () => excluirLancamento(amortizado, contexto(), a.id),
      'Amortização não pode ser excluída',
    );

    const t = lancar(
      f0,
      contexto(),
      despesa({ tipo: 'transferencia', categoriaId: null, contaDestinoId: CONTA_B, valor: r$(1) }),
    );
    const comT = verificar(f0, t);
    const volta = lancar(
      comT,
      contexto(),
      despesa({
        tipo: 'transferencia',
        categoriaId: null,
        contaId: CONTA_B,
        contaDestinoId: CONTA_A,
        valor: r$(1),
      }),
    );
    const zerada = verificar(comT, volta);
    const arquivada = verificar(zerada, arquivarConta(zerada, contexto(), CONTA_B));
    recusa(
      () => excluirLancamento(arquivada, contexto(), t.mudancas[0]?.id as string),
      'está arquivada',
    );
    recusa(
      () => excluirLancamento(arquivada, contexto(), volta.mudancas[0]?.id as string),
      'está arquivada',
    );
  });
});

describe('ajustarSaldo', () => {
  const f = cenario();

  it('grava a diferença como ajuste na categoria de sistema (3.4)', () => {
    const cmd = ajustarSaldo(f, contexto(), CONTA_A, r$(950), HOJE);
    expect(cmd.mudancas[0]?.dados).toMatchObject({
      tipo: 'ajuste',
      valor: r$(-50),
      categoriaId: AJUSTE,
    });
    expect(saldo(verificar(f, cmd), CONTA_A, HOJE)).toBe(r$(950));
  });

  it('recusa saldo igual e data até o saldo inicial', () => {
    recusa(() => ajustarSaldo(f, contexto(), CONTA_A, r$(1000), HOJE), 'O saldo já é esse');
    recusa(
      () => ajustarSaldo(f, contexto(), CONTA_A, r$(1), d('2026-07-31')),
      /depois da data do saldo inicial/,
    );
  });
});

describe('classificar', () => {
  it('dá a categoria a lançamentos e compras', () => {
    const f0 = cenario();
    const l = lancar(f0, contexto(), despesa());
    const f1 = verificar(f0, l);
    const compra = novaCompra(f1, contexto(), {
      cartaoId: CARTAO,
      data: HOJE,
      descricao: null,
      categoriaId: MERCADO,
      observacao: null,
      valorTotal: r$(100),
      numeroParcelas: 1,
    });
    const f2 = verificar(f1, compra);
    const outra = 'aaaaaaaa-0000-4000-8000-000000000000';
    const f3 = {
      ...f2,
      categorias: [
        ...f2.categorias,
        { ...(f2.categorias[0] as (typeof f2.categorias)[0]), id: outra, nome: 'Feira' },
      ],
    };
    const cmd = classificar(
      f3,
      contexto(),
      [l.mudancas[0]?.id as string, compra.mudancas[0]?.id as string],
      outra,
    );
    expect(cmd.mudancas.map((m) => m.entidade)).toEqual(['lancamentos', 'compras']);
    verificar(f3, cmd);
  });

  it('só receitas e despesas', () => {
    const f0 = cenario();
    const pagar = pagarFatura(f0, contexto(), { cartaoId: CARTAO, valor: r$(10), data: HOJE });
    const f = verificar(f0, pagar);
    recusa(
      () => classificar(f, contexto(), [pagar.mudancas[0]?.id as string], MERCADO),
      'Só receitas e despesas têm categoria',
    );
    recusa(() => classificar(f, contexto(), ['x'], MERCADO), 'Compra não encontrada');
  });
});
