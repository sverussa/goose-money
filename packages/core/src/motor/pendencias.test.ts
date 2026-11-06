import { describe, expect, it } from 'vitest';
import {
  aplicar,
  confirmarOcorrencia,
  contratarDivida,
  criarCartao,
  criarRecorrencia,
  lancar,
  novaCompra,
  type Comando,
  type NovaVersao,
} from '../comandos';
import {
  A_CLASSIFICAR,
  c,
  CARTAO,
  cenario,
  CONTA_A,
  contexto,
  d,
  HOJE,
  MERCADO,
  r$,
  SALARIO,
} from '../comandos/cenario';
import type { DataCivil } from '../datas';
import type { Fatos } from '../modelo';
import { derivar } from './derivar';
import { badges, pendencias, podeConfirmarTodos } from './pendencias';

/**
 * Recorte do seed de PROMPT 10 (T01-19 ainda não está na main), em datas absolutas.
 * Cartão A fecha 3 e vence 10; Cartão B fecha 25 e vence 5.
 */
function seed(): Fatos {
  let f = cenario();
  const fazer = (cmd: (f: Fatos) => Comando) => {
    f = aplicar(f, cmd(f).mudancas);
  };
  const naConta = (valor: number, dia: number, categoriaId = MERCADO): NovaVersao => ({
    valor: r$(valor),
    dia,
    formaPagamento: 'conta',
    contaId: CONTA_A,
    cartaoId: null,
    categoriaId,
  });
  const recorrencia = (natureza: 'renda' | 'gasto', descricao: string, v: NovaVersao) => {
    fazer((x) =>
      criarRecorrencia(
        x,
        contexto(),
        {
          natureza,
          descricao,
          competenciaInicio: c('2026-11'),
          competenciaFim: null,
          autoConfirmar: false,
        },
        v,
      ),
    );
  };
  recorrencia('renda', 'Salário', naConta(6500, 5, SALARIO));
  recorrencia('renda', 'Freelance', naConta(1200, 20, SALARIO));
  recorrencia('gasto', 'Academia', naConta(99, 5));
  recorrencia('gasto', 'Dia 7', naConta(10, 7)); // hoje + 3
  recorrencia('gasto', 'Dia 8', naConta(10, 8)); // hoje + 4
  recorrencia('gasto', 'Aluguel', naConta(1800, 10));
  recorrencia('gasto', 'Energia', naConta(180, 31));
  recorrencia('gasto', 'Streaming', {
    ...naConta(55.9, 2),
    formaPagamento: 'cartao',
    contaId: null,
    cartaoId: CARTAO,
  });
  const ctxAntigo = { ...contexto(), hoje: d('2026-09-30') };
  fazer((x) =>
    criarCartao(x, ctxAntigo, {
      nome: 'Cartão B',
      instituicao: null,
      cor: 'cartao-b',
      limite: r$(4000),
      contaPagamentoId: CONTA_A,
      diaFechamento: 25,
      diaVencimento: 5,
      saldoFaturaFechada: r$(0),
    }),
  );
  const cartaoB = f.cartoes[1]?.id as string;
  const compra = (cartaoId: string, data: string, valor: number, n: number) => {
    fazer((x) =>
      novaCompra(x, contexto(), {
        cartaoId,
        data: d(data),
        descricao: null,
        categoriaId: MERCADO,
        observacao: null,
        valorTotal: r$(valor),
        numeroParcelas: n,
      }),
    );
  };
  compra(CARTAO, '2026-10-20', 4200, 10); // fatura A de nov (fecha 03/11): fechada em 04/11
  compra(cartaoB, '2026-10-01', 2400, 6); // fatura B de nov (fecha 25/10, vence 05/11)
  compra(CARTAO, HOJE, 1000, 3); // fatura aberta
  fazer((x) =>
    contratarDivida(
      x,
      contexto(),
      {
        tipo: 'emprestimo',
        credor: 'Empréstimo pessoal',
        valorContratado: r$(4800),
        dataContratacao: d('2026-08-10'),
        destinoDoValor: 'creditado_em_conta',
        sistemaAmortizacao: 'parcela_informada',
        taxaMensal: null,
        valorParcelaInformada: r$(450),
        numeroParcelas: 12,
        dataPrimeiraParcela: d('2026-09-10'),
        contaDebitoId: CONTA_A,
        categoriaId: null,
      },
      { parcelasPagas: 1, contaCaptacaoId: null },
    ),
  );
  const despesa = (categoriaId: string) => {
    fazer((x) =>
      lancar(x, contexto(), {
        tipo: 'despesa',
        status: 'efetivado',
        data: d('2026-11-01'),
        valor: r$(30),
        descricao: null,
        observacao: null,
        contaId: CONTA_A,
        contaDestinoId: null,
        categoriaId,
        cartaoId: null,
        faturaCompetencia: null,
        dividaId: null,
        parcelaDividaId: null,
      }),
    );
  };
  despesa(A_CLASSIFICAR);
  despesa(A_CLASSIFICAR);
  despesa(MERCADO);
  return f;
}

const SEED = seed();

const resumo = (f: Fatos, hoje: DataCivil) =>
  pendencias(derivar(f, hoje)).map((p) => [p.tipo, p.texto, p.data, p.acao, p.valor]);

describe('pendencias', () => {
  it('em 04/11/2026: parcela vencida, gastos até 3 dias e faturas fechadas, por data', () => {
    const f = SEED;
    expect(resumo(f, HOJE)).toEqual([
      ['parcela_divida', 'Empréstimo pessoal', '2026-10-10', 'Registrar pagamento', r$(450)],
      ['gasto', 'Streaming', '2026-11-02', 'Confirmar no cartão', r$(55.9)],
      ['gasto', 'Academia', '2026-11-05', 'Pagar', r$(99)],
      ['fatura', 'Cartão B', '2026-11-05', 'Pagar fatura', r$(400)],
      ['gasto', 'Dia 7', '2026-11-07', 'Pagar', r$(10)], // vence em 3 dias: entra; o Dia 8 não
      ['fatura', 'Cartão A', '2026-11-10', 'Pagar fatura', r$(420)], // a aberta (dez) não entra
    ]);
  });

  it('parcela de dívida vencida entra com "Registrar pagamento"; a que vence hoje ainda não', () => {
    const parcelas = (hoje: string) =>
      pendencias(derivar(SEED, d(hoje)))
        .filter((x) => x.tipo === 'parcela_divida')
        .map((x) => x.data);
    expect(parcelas('2026-11-10')).toEqual(['2026-10-10']);
    expect(parcelas('2026-11-11')).toEqual(['2026-10-10', '2026-11-10']);
  });

  it('gastos e rendas de meses anteriores entram; no fim do mês, os do mês seguinte até 3 dias', () => {
    let f = SEED;
    const conta = (dia: number, categoriaId: string): NovaVersao => ({
      valor: r$(10),
      dia,
      formaPagamento: 'conta',
      contaId: CONTA_A,
      cartaoId: null,
      categoriaId,
    });
    for (const [natureza, descricao, v] of [
      ['gasto', 'Antigo', conta(15, MERCADO)],
      ['renda', 'Bico', conta(15, SALARIO)],
      ['gasto', 'Dia 1', conta(1, MERCADO)],
      ['gasto', 'Dia 3', conta(3, MERCADO)],
    ] as const)
      f = aplicar(
        f,
        criarRecorrencia(
          f,
          contexto(),
          {
            natureza,
            descricao,
            competenciaInicio: c('2026-09'),
            competenciaFim: null,
            autoConfirmar: false,
          },
          v,
        ).mudancas,
      );
    const de = (hoje: string, texto: string) =>
      pendencias(derivar(f, d(hoje)))
        .filter((p) => p.texto === texto)
        .map((p) => [p.tipo, p.data]);
    expect(de('2026-11-04', 'Antigo')).toEqual([
      ['gasto', '2026-09-15'],
      ['gasto', '2026-10-15'],
    ]);
    expect(de('2026-11-04', 'Bico')).toEqual([
      ['renda', '2026-09-15'],
      ['renda', '2026-10-15'],
    ]);
    // 29/11: o dia 1/12 vence em 2 dias e entra; o dia 3/12, em 4, não
    expect(de('2026-11-29', 'Dia 1').at(-1)).toEqual(['gasto', '2026-12-01']);
    expect(de('2026-11-29', 'Dia 3').at(-1)).toEqual(['gasto', '2026-11-03']);
  });

  it('Freelance (dia 20) só fica atrasado depois do dia 20', () => {
    const f = SEED;
    const freelance = (hoje: string) =>
      pendencias(derivar(f, d(hoje))).filter((p) => p.texto === 'Freelance');
    expect(freelance('2026-11-20')).toEqual([]);
    expect(freelance('2026-11-21')).toMatchObject([
      { tipo: 'renda', acao: 'Confirmar', valor: r$(1200) },
    ]);
  });

  it('confirmado não é pendência', () => {
    const f0 = SEED;
    const academia = f0.recorrencias.find((r) => r.descricao === 'Academia')?.id as string;
    const f = aplicar(
      f0,
      confirmarOcorrencia(f0, contexto(), academia, c('2026-11'), { data: HOJE }).mudancas,
    );
    expect(resumo(f, HOJE).some((p) => p[1] === 'Academia')).toBe(false);
  });

  it('"Confirmar todos" só leva recorrências com data até hoje (D79)', () => {
    const lista = pendencias(derivar(SEED, HOJE));
    expect(podeConfirmarTodos(lista, HOJE).map((p) => p.texto)).toEqual(['Streaming']);
  });
});

describe('badges', () => {
  it('em 04/11/2026 batem com os itens que geram cada um', () => {
    const f = SEED;
    const derivado = derivar(f, HOJE);
    const lista = pendencias(derivado);
    expect(badges(derivado)).toEqual({
      gastosFixos: lista.filter((p) => p.tipo === 'gasto').length,
      rendasFixas: 0,
      cartoes: 0, // faturas fechadas, nenhuma vencida
      lancamentos: 2,
    });
    expect(badges(derivado).gastosFixos).toBe(3);
  });

  it('em 21/11: Salário e Freelance atrasados e as duas faturas de novembro vencidas', () => {
    const derivado = derivar(SEED, d('2026-11-21'));
    const lista = pendencias(derivado);
    expect(lista.filter((p) => p.tipo === 'renda').map((p) => p.texto)).toEqual([
      'Salário',
      'Freelance',
    ]);
    expect(badges(derivado)).toMatchObject({ rendasFixas: 2, cartoes: 2 });
  });
});
