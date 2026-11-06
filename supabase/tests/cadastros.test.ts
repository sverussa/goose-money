import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  criarUsuario,
  gravar,
  gravarOk,
  inserir,
  sqlComoPostgres,
  type Usuario,
} from './apoio';
import { conferirChecklist } from './checklist';

// T02-03: categorias, contas e preferências.
let a: Usuario;
let b: Usuario;
beforeAll(async () => {
  [a, b] = await Promise.all([criarUsuario(), criarUsuario()]);
});

const conta = (nome: string, extra: Record<string, unknown> = {}) =>
  inserir('contas', {
    nome,
    tipo: 'corrente',
    saldo_inicial: 0,
    data_saldo_inicial: '2026-10-31',
    cor: 'categorica-1',
    ...extra,
  });
const categoria = (nome: string, extra: Record<string, unknown> = {}) =>
  inserir('categorias', { nome, tipo: 'despesa', icone: 'house', cor: 'categorica-2', ...extra });

describe.each(['categorias', 'contas', 'preferencias'])('checklist de 12.2: %s', (tabela) => {
  it('RLS, colunas de controle, trigger, delete revogado, nada para anon, índices parciais', async () => {
    await conferirChecklist(tabela);
  });

  it('delete pela API é negado e o RLS esconde as linhas de outro usuário', async () => {
    const { error } = await a.cliente.from(tabela).delete().neq('id', randomUUID());
    expect(error?.code).toBe('42501');
    const { data } = await b.cliente.from(tabela).select('id, created_by').neq('created_by', b.id);
    expect(data).toEqual([]);
  });
});

describe('contas', () => {
  it('duas contas ativas com o mesmo nome são recusadas (sem diferenciar maiúsculas e espaços)', async () => {
    await gravarOk(a.cliente, [conta('Poupança')]);
    const { erro } = await gravar(a.cliente, [conta('  poupança ')]);
    expect(erro?.code).toBe('23505');
    // Outro usuário pode ter o mesmo nome.
    await gravarOk(b.cliente, [conta('Poupança')]);
  });

  it('uma excluída e uma ativa com o mesmo nome são aceitas (11.8); arquivada também libera', async () => {
    const velha = conta('Reserva');
    await gravarOk(a.cliente, [velha]);
    await gravarOk(a.cliente, [
      alterar('contas', velha.id, { is_deleted: true }),
      conta('Reserva'),
    ]);
    const guardada = conta('Viagem', { arquivada: true });
    await gravarOk(a.cliente, [guardada, conta('Viagem')]);
    // Desarquivar com o nome já reutilizado é recusado até renomear.
    const { erro } = await gravar(a.cliente, [
      alterar('contas', guardada.id, { arquivada: false }),
    ]);
    expect(erro?.code).toBe('23505');
    const [n] =
      await sqlComoPostgres`select count(*)::int as n from contas where created_by = ${a.id} and nome = 'Reserva'`;
    expect(n?.n).toBe(2);
  });

  it('saldo inicial negativo é aceito; tipo e cor fora do formato são recusados', async () => {
    await gravarOk(a.cliente, [conta('Cheque especial', { saldo_inicial: -15000 })]);
    expect((await gravar(a.cliente, [conta('X', { tipo: 'cripto' })])).erro?.code).toBe('23514');
    expect((await gravar(a.cliente, [conta('Y', { cor: '#ff0000' })])).erro?.code).toBe('23514');
    expect((await gravar(a.cliente, [conta('  ')])).erro?.code).toBe('23514');
  });
});

describe('categorias', () => {
  it('categoria de sistema não pode ser alterada nem excluída', async () => {
    const sistema = inserir('categorias', {
      nome: 'A classificar',
      tipo: 'ambos',
      icone: 'circle-help',
      sistema: 'a_classificar',
    });
    await gravarOk(a.cliente, [sistema]);
    for (const dados of [{ nome: 'Outro nome' }, { is_deleted: true }, { sistema: null }]) {
      const { erro } = await gravar(a.cliente, [alterar('categorias', sistema.id, dados)]);
      expect(erro?.code).toBe('23514');
      expect(erro?.details).toContain('categorias_sistema_imutavel');
    }
    // Uma por usuário.
    const repetida = { ...sistema, id: randomUUID(), dados: { ...sistema.dados, nome: 'Outra' } };
    expect((await gravar(a.cliente, [repetida])).erro?.code).toBe('23505');
    // Categoria do usuário não vira de sistema.
    const minha = categoria('Mercado');
    await gravarOk(a.cliente, [minha]);
    const { erro } = await gravar(a.cliente, [
      alterar('categorias', minha.id, { sistema: 'tarifas' }),
    ]);
    expect(erro?.code).toBe('23514');
  });

  it('"ambos" só em categoria de sistema; sistema com tipo errado ou cor é recusada', async () => {
    expect((await gravar(a.cliente, [categoria('Mista', { tipo: 'ambos' })])).erro?.code).toBe(
      '23514',
    );
    const tarifa = categoria('Tarifas', { tipo: 'receita', cor: null, sistema: 'tarifas' });
    expect((await gravar(a.cliente, [tarifa])).erro?.code).toBe('23514');
  });

  it('subcategoria: um nível só, mesmo tipo da pai; nome único entre irmãs', async () => {
    const pai = categoria('Casa');
    const filha = categoria('Luz', { categoria_pai_id: pai.id });
    // Ordem invertida no lote: a checagem é adiada.
    await gravarOk(a.cliente, [filha, pai]);
    const neta = categoria('Conta de luz', { categoria_pai_id: filha.id });
    expect((await gravar(a.cliente, [neta])).erro?.details).toContain('categorias_um_nivel');
    const deOutroTipo = categoria('Aluguel recebido', {
      tipo: 'receita',
      categoria_pai_id: pai.id,
    });
    expect((await gravar(a.cliente, [deOutroTipo])).erro?.details).toContain('categorias_um_nivel');
    expect(
      (await gravar(a.cliente, [categoria(' luz', { categoria_pai_id: pai.id })])).erro?.code,
    ).toBe('23505');
    // Mesmo nome em outro pai ou noutro tipo é aceito.
    await gravarOk(a.cliente, [categoria('Luz'), categoria('Casa', { tipo: 'receita' })]);
    // Excluir a pai sem as filhas é recusado; junto, passa.
    const sozinha = await gravar(a.cliente, [alterar('categorias', pai.id, { is_deleted: true })]);
    expect(sozinha.erro?.details).toContain('categorias_um_nivel');
    await gravarOk(a.cliente, [
      alterar('categorias', pai.id, { is_deleted: true }),
      alterar('categorias', filha.id, { is_deleted: true }),
    ]);
  });

  it('pai de outro usuário é recusada pela chave estrangeira composta', async () => {
    const deB = categoria('Do B');
    await gravarOk(b.cliente, [deB]);
    const { erro } = await gravar(a.cliente, [categoria('Filha', { categoria_pai_id: deB.id })]);
    expect(erro?.code).toBe('23503');
  });
});

describe('preferencias', () => {
  it('uma linha ativa por usuário, com os padrões do modelo', async () => {
    const p = inserir('preferencias', {});
    const r = await gravarOk(a.cliente, [p]);
    expect(r.preferencias?.[0]).toMatchObject({
      limite_alerta: 50000,
      horizonte_padrao: 12,
      ocultar_valores_ao_abrir: false,
    });
    expect((await gravar(a.cliente, [inserir('preferencias', {})])).erro?.code).toBe('23505');
    expect(
      (await gravar(a.cliente, [alterar('preferencias', p.id, { horizonte_padrao: 5 })])).erro
        ?.code,
    ).toBe('23514');
  });
});
