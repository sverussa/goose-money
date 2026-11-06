import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { alterar, criarUsuario, gravar, gravarOk, inserir, type Op, type Usuario } from './apoio';
import { conferirChecklist } from './checklist';

// T02-05: cartões, ciclos, compras, parcelas e itens de fatura.
let a: Usuario;
const conta = (nome: string, extra: Record<string, unknown> = {}) =>
  inserir('contas', {
    nome,
    tipo: 'corrente',
    saldo_inicial: 0,
    data_saldo_inicial: '2026-01-31',
    cor: 'categorica-1',
    ...extra,
  });
const corrente = conta('Corrente');
const mercado = inserir('categorias', { nome: 'Mercado', tipo: 'despesa', icone: 'cart' });
const juros = inserir('categorias', {
  nome: 'Juros e encargos',
  tipo: 'despesa',
  icone: 'percent',
  sistema: 'juros_encargos',
});
const cartao = (nome: string, contaId = corrente.id) =>
  inserir('cartoes', {
    nome,
    cor: 'categorica-3',
    limite: 500000,
    conta_pagamento_id: contaId,
    competencia_inicial: '2026-11',
  });
const nubank = cartao('Roxinho');

beforeAll(async () => {
  a = await criarUsuario();
  await gravarOk(a.cliente, [
    corrente,
    mercado,
    juros,
    nubank,
    inserir('cartao_ciclos', {
      cartao_id: nubank.id,
      vigente_desde: '2026-11',
      dia_fechamento: 3,
      dia_vencimento: 10,
    }),
  ]);
});

/** Compra de `total` em `valores.length` parcelas, a partir de 2026-11. */
function compra(total: number, valores: number[]): [Op, ...Op[]] {
  const c = inserir('compras', {
    cartao_id: nubank.id,
    data: '2026-11-01',
    categoria_id: mercado.id,
    valor_total: total,
    numero_parcelas: valores.length,
  });
  return [
    c,
    ...valores.map((valor, k) =>
      inserir('parcelas', {
        compra_id: c.id,
        numero: k + 1,
        valor,
        competencia: `2026-${String(11 + k).padStart(2, '0')}`.replace('2026-13', '2027-01'),
      }),
    ),
  ];
}

describe.each(['cartoes', 'cartao_ciclos', 'compras', 'parcelas', 'itens_fatura'])(
  'checklist de 12.2: %s',
  (tabela) => {
    it('RLS, colunas de controle, trigger, delete revogado, nada para anon', async () => {
      await conferirChecklist(tabela);
    });
  },
);

describe('compras e parcelas', () => {
  it('compra de R$ 1.000,00 em 3x com parcelas somando R$ 999,99 é recusada no fim da transação', async () => {
    const { erro } = await gravar(a.cliente, compra(100000, [33334, 33333, 33332]));
    expect(erro?.details).toContain('compras_parcelas_conferem');
    const [c, ...ps] = compra(100000, [33334, 33333, 33333]);
    // Parcelas antes da compra no lote: a checagem é adiada.
    await gravarOk(a.cliente, [...ps, c]);
  });

  it('parcela faltando ou numerada fora de 1..n é recusada', async () => {
    const [c, p1] = compra(1000, [500, 500]);
    expect((await gravar(a.cliente, [c, p1 as Op])).erro?.details).toContain(
      'compras_parcelas_conferem',
    );
    const [d, q1, q2] = compra(1000, [500, 500]);
    const fora = { ...(q2 as Op), dados: { ...(q2 as Op).dados, numero: 3 } };
    expect((await gravar(a.cliente, [d, q1 as Op, fora])).erro?.code).toBe('23514');
  });

  it('excluir uma parcela sem excluir nem cancelar a compra é recusado', async () => {
    const ops = compra(900, [300, 300, 300]);
    await gravarOk(a.cliente, ops);
    const { erro } = await gravar(a.cliente, [
      alterar('parcelas', (ops[3] as Op).id, { is_deleted: true }),
    ]);
    expect(erro?.details).toContain('compras_parcelas_conferem');
  });

  it('excluir a compra exige excluir as parcelas na mesma chamada (11.8)', async () => {
    const [c, ...ps] = compra(600, [300, 300]);
    await gravarOk(a.cliente, [c, ...ps]);
    const so = await gravar(a.cliente, [alterar('compras', c.id, { is_deleted: true })]);
    expect(so.erro?.code).toBe('23514');
    await gravarOk(a.cliente, [
      alterar('compras', c.id, { is_deleted: true }),
      ...ps.map((p) => alterar('parcelas', p.id, { is_deleted: true })),
    ]);
  });

  it('cancelar uma compra com parcelas faturadas grava sem erro (3.6)', async () => {
    const [c, p1, p2, p3] = compra(900, [300, 300, 300]) as Op[];
    await gravarOk(a.cliente, [c as Op, p1 as Op, p2 as Op, p3 as Op]);
    // A 1ª já foi faturada e fica; as das faturas não fechadas saem; o estorno vira item.
    await gravarOk(a.cliente, [
      alterar('compras', (c as Op).id, { cancelada: true }),
      alterar('parcelas', (p2 as Op).id, { is_deleted: true }),
      alterar('parcelas', (p3 as Op).id, { is_deleted: true }),
      inserir('itens_fatura', {
        cartao_id: nubank.id,
        competencia: '2026-12',
        tipo: 'estorno',
        data: '2026-11-05',
        valor: -300,
        compra_id: (c as Op).id,
      }),
    ]);
  });
});

describe('cartões', () => {
  it('cartão com conta de pagamento fora do total é recusado (3.9)', async () => {
    const investimento = conta('Investimentos', { tipo: 'investimento', incluir_no_total: false });
    const { erro } = await gravar(a.cliente, [investimento, cartao('Black', investimento.id)]);
    expect(erro?.details).toContain('cartoes_conta_pagamento');
  });

  it('tirar do total ou arquivar a conta de pagamento de um cartão ativo é recusado', async () => {
    for (const dados of [{ incluir_no_total: false }, { arquivada: true }]) {
      const { erro } = await gravar(a.cliente, [alterar('contas', corrente.id, dados)]);
      expect(erro?.details).toContain('cartoes_conta_pagamento');
    }
    // Com o cartão arquivado na mesma chamada, passa.
    const outra = conta('Salário');
    const visa = cartao('Visa', outra.id);
    await gravarOk(a.cliente, [outra, visa]);
    await gravarOk(a.cliente, [
      alterar('cartoes', visa.id, { arquivado: true }),
      alterar('contas', outra.id, { incluir_no_total: false }),
    ]);
  });

  it('nome único entre cartões ativos; ciclo único por vigência; dia entre 1 e 31', async () => {
    expect((await gravar(a.cliente, [cartao(' roxinho')])).erro?.code).toBe('23505');
    const ciclo = (vigente_desde: string, dia_fechamento = 25) =>
      inserir('cartao_ciclos', {
        cartao_id: nubank.id,
        vigente_desde,
        dia_fechamento,
        dia_vencimento: 5,
      });
    expect((await gravar(a.cliente, [ciclo('2026-11')])).erro?.code).toBe('23505');
    expect((await gravar(a.cliente, [ciclo('2027-01', 32)])).erro?.code).toBe('23514');
    await gravarOk(a.cliente, [ciclo('2027-01')]);
  });
});

describe('itens de fatura', () => {
  const item = (tipo: string, valor: number, extra: Record<string, unknown> = {}) =>
    inserir('itens_fatura', {
      cartao_id: nubank.id,
      competencia: '2026-11',
      tipo,
      data: '2026-11-02',
      valor,
      ...extra,
    });

  it('sinal e campos por tipo', async () => {
    await gravarOk(a.cliente, [item('encargo', 1290, { categoria_id: juros.id })]);
    expect((await gravar(a.cliente, [item('encargo', 1290)])).erro?.code).toBe('23514');
    expect(
      (await gravar(a.cliente, [item('encargo', -1, { categoria_id: juros.id })])).erro?.code,
    ).toBe('23514');
    expect(
      (await gravar(a.cliente, [item('estorno', 500, { categoria_id: mercado.id })])).erro?.code,
    ).toBe('23514');
    expect((await gravar(a.cliente, [item('estorno', -500)])).erro?.code).toBe('23514');
    expect((await gravar(a.cliente, [item('ajuste_compra', 100)])).erro?.code).toBe('23514');
  });

  it('no máximo um saldo anterior ao cadastro por cartão', async () => {
    await gravarOk(a.cliente, [item('saldo_anterior_cadastro', 80000)]);
    expect((await gravar(a.cliente, [item('saldo_anterior_cadastro', 1)])).erro?.code).toBe(
      '23505',
    );
  });
});

describe('pagamento de fatura', () => {
  it('aponta para um cartão do mesmo usuário (D59)', async () => {
    const pagamento = (cartao_id: string) =>
      inserir('lancamentos', {
        tipo: 'pagamento_fatura',
        data: '2026-11-05',
        valor: 1000,
        conta_id: corrente.id,
        cartao_id,
        fatura_competencia: '2026-11',
      });
    await gravarOk(a.cliente, [pagamento(nubank.id)]);
    expect((await gravar(a.cliente, [pagamento(randomUUID())])).erro?.code).toBe('23503');
  });
});
