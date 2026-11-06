import { beforeAll, describe, expect, it } from 'vitest';

import { alterar, criarUsuario, gravar, gravarOk, inserir, type Usuario } from './apoio';
import { conferirChecklist } from './checklist';

// T02-04: lançamentos.
let a: Usuario;
let b: Usuario;
const conta = (nome: string) =>
  inserir('contas', {
    nome,
    tipo: 'corrente',
    saldo_inicial: 0,
    data_saldo_inicial: '2026-01-31',
    cor: 'categorica-1',
  });
const corrente = conta('Corrente');
const poupanca = conta('Poupança');
const mercado = inserir('categorias', { nome: 'Mercado', tipo: 'despesa', icone: 'cart' });
const ajusteSaldo = inserir('categorias', {
  nome: 'Ajuste de saldo',
  tipo: 'ambos',
  icone: 'scale',
  sistema: 'ajuste_saldo',
});
const contaDeB = conta('Conta do B');

beforeAll(async () => {
  [a, b] = await Promise.all([criarUsuario(), criarUsuario()]);
  await gravarOk(a.cliente, [corrente, poupanca, mercado, ajusteSaldo]);
  await gravarOk(b.cliente, [contaDeB]);
});

const lancamento = (extra: Record<string, unknown>) =>
  inserir('lancamentos', {
    tipo: 'despesa',
    data: '2026-11-01',
    valor: 1590,
    conta_id: corrente.id,
    categoria_id: mercado.id,
    ...extra,
  });
const codigo = async (extra: Record<string, unknown>) =>
  (await gravar(a.cliente, [lancamento(extra)])).erro;

describe('lancamentos', () => {
  it('checklist de 12.2', async () => {
    await conferirChecklist('lancamentos');
  });

  it('despesa válida grava como efetivada', async () => {
    const r = await gravarOk(a.cliente, [lancamento({})]);
    expect(r.lancamentos?.[0]).toMatchObject({ status: 'efetivado', valor: 1590 });
  });

  it('despesa sem categoria ou com valor zero é recusada; ajuste negativo é aceito', async () => {
    expect((await codigo({ categoria_id: null }))?.details).toContain('lancamentos_categoria');
    expect((await codigo({ valor: 0 }))?.details).toContain('lancamentos_valor');
    expect((await codigo({ valor: -10 }))?.details).toContain('lancamentos_valor');
    await gravarOk(a.cliente, [
      lancamento({ tipo: 'ajuste', valor: -2500, categoria_id: ajusteSaldo.id }),
    ]);
    expect((await codigo({ tipo: 'ajuste', valor: 0, categoria_id: ajusteSaldo.id }))?.code).toBe(
      '23514',
    );
  });

  it('transferência sem destino ou com destino igual à origem é recusada (D32)', async () => {
    const transferencia = { tipo: 'transferencia', categoria_id: null };
    expect((await codigo(transferencia))?.details).toContain('lancamentos_destino');
    expect((await codigo({ ...transferencia, conta_destino_id: corrente.id }))?.details).toContain(
      'lancamentos_destino',
    );
    await gravarOk(a.cliente, [lancamento({ ...transferencia, conta_destino_id: poupanca.id })]);
    // Destino em despesa também é recusado.
    expect((await codigo({ conta_destino_id: poupanca.id }))?.details).toContain(
      'lancamentos_destino',
    );
  });

  it('só receita e despesa podem ser previstas', async () => {
    await gravarOk(a.cliente, [lancamento({ status: 'previsto', data: '2099-01-10' })]);
    const transferenciaPrevista = {
      tipo: 'transferencia',
      categoria_id: null,
      conta_destino_id: poupanca.id,
      status: 'previsto',
    };
    expect((await codigo(transferenciaPrevista))?.details).toContain('lancamentos_previsto');
  });

  it('efetivado com data futura é recusado (D79); previsto pode virar efetivado só até hoje', async () => {
    expect((await codigo({ data: '2099-01-10' }))?.details).toContain(
      'lancamentos_efetivado_sem_futuro',
    );
    const previsto = lancamento({ status: 'previsto', data: '2099-01-10' });
    await gravarOk(a.cliente, [previsto]);
    const { erro } = await gravar(a.cliente, [
      alterar('lancamentos', previsto.id, { status: 'efetivado' }),
    ]);
    expect(erro?.details).toContain('lancamentos_efetivado_sem_futuro');
    await gravarOk(a.cliente, [
      alterar('lancamentos', previsto.id, { status: 'efetivado', data: '2026-11-02' }),
    ]);
  });

  it('campos de outros tipos são recusados', async () => {
    expect((await codigo({ fatura_competencia: '2026-11' }))?.details).toContain(
      'lancamentos_fatura',
    );
    expect((await codigo({ fatura_competencia: '2026-13' }))?.code).toBe('23514');
    expect((await codigo({ tipo: 'captacao', categoria_id: null }))?.details).toContain(
      'lancamentos_divida',
    );
  });

  it('lançamento apontando para conta de outro usuário é recusado', async () => {
    expect((await codigo({ conta_id: contaDeB.id }))?.code).toBe('23503');
    const transferencia = {
      tipo: 'transferencia',
      categoria_id: null,
      conta_destino_id: contaDeB.id,
    };
    expect((await codigo(transferencia))?.code).toBe('23503');
  });
});
