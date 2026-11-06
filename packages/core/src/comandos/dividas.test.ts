import { describe, expect, it } from 'vitest';
import { saldoDevedor } from '../dividas';
import type { Divida, Fatos } from '../modelo';
import {
  cenario,
  CONTA_A,
  CONTA_B,
  contexto,
  d,
  HOJE,
  MERCADO,
  r$,
  recusa,
  verificar,
} from './cenario';
import {
  amortizarDivida,
  contratarDivida,
  excluirDivida,
  parcelasDaDivida,
  registrarPagamentoDeParcela,
} from './dividas';
import { excluirLancamento } from './lancamentos';
import type { CamposDe } from './mudancas';

const financiamento: CamposDe<Divida> = {
  tipo: 'financiamento',
  credor: 'Banco',
  valorContratado: r$(40000),
  dataContratacao: d('2025-11-10'),
  destinoDoValor: 'pago_a_terceiro',
  sistemaAmortizacao: 'price',
  taxaMensal: '0.0149',
  valorParcelaInformada: null,
  numeroParcelas: 48,
  dataPrimeiraParcela: d('2025-12-10'),
  contaDebitoId: CONTA_A,
  categoriaId: MERCADO,
};

const emprestimo: CamposDe<Divida> = {
  ...financiamento,
  tipo: 'emprestimo',
  valorContratado: r$(4800),
  dataContratacao: d('2026-10-05'),
  destinoDoValor: 'creditado_em_conta',
  sistemaAmortizacao: 'parcela_informada',
  taxaMensal: null,
  valorParcelaInformada: r$(450),
  numeroParcelas: 12,
  dataPrimeiraParcela: d('2026-11-05'),
  categoriaId: null,
};

function contratar(
  campos: CamposDe<Divida>,
  parcelasPagas = 0,
  captacao: string | null = null,
): Fatos {
  const f = cenario();
  return verificar(
    f,
    contratarDivida(f, contexto(), campos, { parcelasPagas, contaCaptacaoId: captacao }),
  );
}

describe('contratarDivida', () => {
  it('grava a dívida e a tabela inteira; as já pagas ficam "Paga antes do cadastro" (3.7)', () => {
    const f = cenario();
    const cmd = contratarDivida(f, contexto(), financiamento, {
      parcelasPagas: 11,
      contaCaptacaoId: null,
    });
    expect(cmd.descricao).toBe('Dívida cadastrada');
    expect(cmd.mudancas).toHaveLength(49);
    const depois = verificar(f, cmd);
    const ps = parcelasDaDivida(depois, depois.dividas[0]?.id as string);
    expect(ps.filter((p) => p.pagaAntesDoCadastro).map((p) => p.numero)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(ps.reduce((s, p) => s + p.amortizacao, 0)).toBe(r$(40000));
  });

  it('SAC e parcela informada, com a entrada do valor na conta', () => {
    const sac = contratar({ ...financiamento, sistemaAmortizacao: 'sac' });
    expect(sac.parcelasDivida[0]?.amortizacao).toBe(r$(833.33));
    const f = contratar(emprestimo, 0, CONTA_B);
    expect(f.lancamentos[0]).toMatchObject({
      tipo: 'captacao',
      valor: r$(4800),
      contaId: CONTA_B,
      data: '2026-10-05',
    });
    expect(f.parcelasDivida).toHaveLength(12);
  });

  it('recusa o que a regra não permite (11.5)', () => {
    const f = cenario();
    const contratarCom =
      (campos: Partial<CamposDe<Divida>>, pagas = 0, conta: string | null = null) =>
      () =>
        contratarDivida(
          f,
          contexto(),
          { ...emprestimo, ...campos },
          { parcelasPagas: pagas, contaCaptacaoId: conta },
        );
    recusa(contratarCom({ valorParcelaInformada: r$(300) }), /não cobre o valor contratado/);
    recusa(contratarCom({}, 13), /fora do número de parcelas/);
    recusa(contratarCom({ ...financiamento }, 0, CONTA_A), /Só a dívida creditada em conta/);
    recusa(contratarCom({ dataContratacao: d('2026-12-01') }, 0, CONTA_A), /data futura/);
  });
});

describe('pagamento, amortização e exclusão', () => {
  const f = contratar(emprestimo, 0, CONTA_A);
  const divida = f.dividas[0] as Divida;
  const [p1, p2] = parcelasDaDivida(f, divida.id);

  it('registrar pagamento grava pagamento_divida da parcela; paga não é paga de novo', () => {
    const cmd = registrarPagamentoDeParcela(f, contexto(), p1?.id as string, { data: HOJE });
    expect(cmd.mudancas[0]?.dados).toMatchObject({
      tipo: 'pagamento_divida',
      valor: p1?.valor,
      contaId: CONTA_A,
      parcelaDividaId: p1?.id,
    });
    const paga = verificar(f, cmd);
    recusa(
      () => registrarPagamentoDeParcela(paga, contexto(), p1?.id as string, { data: HOJE }),
      'Parcela já paga',
    );
    const antiga = contratar(emprestimo, 1);
    const p = antiga.parcelasDivida[0]?.id as string;
    recusa(
      () => registrarPagamentoDeParcela(antiga, contexto(), p, { data: HOJE }),
      'Parcela já paga',
    );
    recusa(
      () => registrarPagamentoDeParcela(f, contexto(), 'x', { data: HOJE }),
      'Parcela não encontrada',
    );
  });

  it('amortizar regenera as não pagas seguintes, sem repetir número (D3, D70)', () => {
    const cmd = amortizarDivida(f, contexto(), divida.id, {
      valor: r$(1000),
      data: HOJE,
      modo: 'reduzirPrazo',
    });
    expect(cmd.descricao).toBe('Amortização registrada');
    const depois = verificar(f, cmd);
    const ps = parcelasDaDivida(depois, divida.id);
    expect(ps.length).toBeLessThan(12);
    expect(ps.map((p) => p.numero)).toEqual(ps.map((_, i) => i + 1));
    expect(saldoDevedor(ps)).toBe(saldoDevedor(parcelasDaDivida(f, divida.id)) - r$(1000));
    expect(ps.some((p) => p.id === p1?.id || p.id === p2?.id)).toBe(false); // vencem depois de hoje
    recusa(
      () =>
        amortizarDivida(f, contexto(), divida.id, {
          valor: r$(999999),
          data: HOJE,
          modo: 'reduzirValor',
        }),
      /Amortização precisa ser positiva/,
    );
  });

  it('excluir leva parcelas e captação; com pagamentos, recusa', () => {
    const cmd = excluirDivida(f, contexto(), divida.id);
    expect(cmd.mudancas).toHaveLength(14);
    const depois = verificar(f, cmd);
    expect([depois.dividas, depois.parcelasDivida, depois.lancamentos]).toEqual([[], [], []]);
    const pagou = registrarPagamentoDeParcela(f, contexto(), p1?.id as string, { data: HOJE });
    const comPagamento = verificar(f, pagou);
    recusa(() => excluirDivida(comPagamento, contexto(), divida.id), /tem pagamentos registrados/);
    const semPagamento = verificar(
      comPagamento,
      excluirLancamento(comPagamento, contexto(), pagou.mudancas[0]?.id as string),
    );
    verificar(semPagamento, excluirDivida(semPagamento, contexto(), divida.id));
  });
});
