import { gerarSeed } from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  criarUsuario,
  gravar,
  gravarOk,
  hojeEmBrasilia,
  inserir,
  opsDe,
  type Op,
  type Usuario,
} from './apoio';
import { conferirChecklist } from './checklist';

// T02-06: dívidas e parcelas gravadas (D3).
let a: Usuario;
const corrente = inserir('contas', {
  nome: 'Corrente',
  tipo: 'corrente',
  saldo_inicial: 0,
  data_saldo_inicial: '2025-01-31',
  cor: 'categorica-1',
});

beforeAll(async () => {
  a = await criarUsuario();
  await gravarOk(a.cliente, [corrente]);
});

/** Empréstimo de R$ 300,00 em 3x sem juros, creditado em conta. */
function emprestimo(amortizacoes = [10000, 10000, 10000]): [Op, ...Op[]] {
  const d = inserir('dividas', {
    tipo: 'emprestimo',
    credor: 'Banco',
    valor_contratado: 30000,
    data_contratacao: '2026-01-05',
    destino_do_valor: 'creditado_em_conta',
    sistema_amortizacao: 'price',
    taxa_mensal: '0',
    numero_parcelas: 3,
    data_primeira_parcela: '2026-02-05',
    conta_debito_id: corrente.id,
  });
  return [
    d,
    ...amortizacoes.map((amortizacao, k) =>
      inserir('parcelas_divida', {
        divida_id: d.id,
        numero: k + 1,
        vencimento: `2026-0${String(k + 2)}-05`,
        valor: amortizacao,
        juros: 0,
        amortizacao,
      }),
    ),
  ];
}

describe.each(['dividas', 'parcelas_divida'])('checklist de 12.2: %s', (tabela) => {
  it('RLS, colunas de controle, trigger, delete revogado, nada para anon', async () => {
    await conferirChecklist(tabela);
  });
});

describe('dívidas', () => {
  it('gravar a tabela Price do seed passa nas invariantes', async () => {
    const f = gerarSeed(hojeEmBrasilia(), a.id);
    const lancamentosDeDivida = f.lancamentos.filter((l) => l.dividaId !== null);
    const ops = [
      ...opsDe('contas', f.contas),
      ...opsDe('categorias', f.categorias),
      ...opsDe('dividas', f.dividas),
      ...opsDe('parcelasDivida', f.parcelasDivida),
      ...opsDe('lancamentos', lancamentosDeDivida),
    ];
    const r = await gravarOk(a.cliente, ops);
    expect(r.dividas).toHaveLength(f.dividas.length);
    expect(r.parcelas_divida).toHaveLength(f.parcelasDivida.length);
    expect(f.dividas.some((d) => d.sistemaAmortizacao === 'price')).toBe(true);
  });

  it('amortização que deixa saldo final diferente de zero é recusada no fim da transação', async () => {
    const { erro } = await gravar(a.cliente, emprestimo([10000, 10000, 9999]));
    expect(erro?.details).toContain('dividas_amortizacoes_conferem');
    const ops = emprestimo();
    await gravarOk(a.cliente, ops);
    const [d, , p2, p3] = ops;
    // Amortização extraordinária de R$ 50,00 sem regenerar as parcelas: sobra amortização.
    const amortizacao = inserir('lancamentos', {
      tipo: 'amortizacao',
      data: '2026-02-10',
      valor: 5000,
      conta_id: corrente.id,
      divida_id: d.id,
    });
    expect((await gravar(a.cliente, [amortizacao])).erro?.details).toContain(
      'dividas_amortizacoes_conferem',
    );
    // Regenerando as não pagas na mesma chamada (3.7), passa.
    await gravarOk(a.cliente, [
      amortizacao,
      alterar('parcelas_divida', (p2 as Op).id, { valor: 7500, amortizacao: 7500 }),
      alterar('parcelas_divida', (p3 as Op).id, { valor: 7500, amortizacao: 7500 }),
    ]);
  });

  it('alterar o valor de uma parcela paga é recusado', async () => {
    const ops = emprestimo();
    await gravarOk(a.cliente, ops);
    const [d, p1, p2] = ops as [Op, Op, Op];
    await gravarOk(a.cliente, [
      inserir('lancamentos', {
        tipo: 'pagamento_divida',
        data: '2026-02-05',
        valor: 10000,
        conta_id: corrente.id,
        divida_id: d.id,
        parcela_divida_id: p1.id,
      }),
      alterar('parcelas_divida', p2.id, { paga_antes_do_cadastro: true }),
    ]);
    for (const p of [p1, p2]) {
      const { erro } = await gravar(a.cliente, [
        alterar('parcelas_divida', p.id, { valor: 9000, amortizacao: 9000 }),
      ]);
      expect(erro?.details).toContain('parcelas_divida_paga_imutavel');
    }
  });

  it('pagamento aponta para uma parcela da mesma dívida, uma vez só', async () => {
    const x = emprestimo();
    const y = emprestimo();
    await gravarOk(a.cliente, [...x, ...y]);
    const pagar = (divida: Op, parcela: Op) =>
      inserir('lancamentos', {
        tipo: 'pagamento_divida',
        data: '2026-02-05',
        valor: 10000,
        conta_id: corrente.id,
        divida_id: divida.id,
        parcela_divida_id: parcela.id,
      });
    expect((await gravar(a.cliente, [pagar(x[0], y[1] as Op)])).erro?.code).toBe('23503');
    await gravarOk(a.cliente, [pagar(x[0], x[1] as Op)]);
    expect((await gravar(a.cliente, [pagar(x[0], x[1] as Op)])).erro?.code).toBe('23505');
  });

  it('campos por sistema e destino; parcela = juros + amortização', async () => {
    const [d] = emprestimo();
    const comDados = (dados: Record<string, unknown>) => ({
      ...d,
      dados: { ...d.dados, ...dados },
    });
    expect((await gravar(a.cliente, [comDados({ taxa_mensal: null })])).erro?.details).toContain(
      'dividas_sistema',
    );
    const informada = {
      sistema_amortizacao: 'parcela_informada',
      taxa_mensal: null,
      valor_parcela_informada: 9999,
    };
    expect((await gravar(a.cliente, [comDados(informada)])).erro?.details).toContain(
      'dividas_sistema',
    );
    expect(
      (await gravar(a.cliente, [comDados({ destino_do_valor: 'pago_a_terceiro' })])).erro?.details,
    ).toContain('dividas_categoria');
    const [e, p1] = emprestimo();
    const torta = { ...(p1 as Op), dados: { ...(p1 as Op).dados, juros: 1 } };
    expect((await gravar(a.cliente, [e, torta])).erro?.details).toContain('parcelas_divida_valor');
  });

  it('excluir a dívida exige excluir as parcelas na mesma chamada', async () => {
    const [d, ...ps] = emprestimo();
    await gravarOk(a.cliente, [d, ...ps]);
    expect(
      (await gravar(a.cliente, [alterar('dividas', d.id, { is_deleted: true })])).erro?.code,
    ).toBe('23514');
    await gravarOk(a.cliente, [
      alterar('dividas', d.id, { is_deleted: true }),
      ...ps.map((p) => alterar('parcelas_divida', p.id, { is_deleted: true })),
    ]);
  });
});
