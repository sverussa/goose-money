import { randomUUID } from 'node:crypto';

import {
  derivar,
  despesas,
  exportar,
  gerarSeed,
  indicadoresDaBarra,
  periodoPreset,
  planejarImportacao,
  receitas,
  resultado,
  taxaDePoupanca,
  type Fatos,
} from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  criarUsuario,
  fatosDe,
  gravar,
  gravarOk,
  hojeEmBrasilia,
  inserir,
  type Op,
  opsDoPlano,
  opsDosFatos,
  sqlComoPostgres,
  type Cliente,
  type Usuario,
} from './apoio';

// T02-10: apagar tudo, importar (Substituir e Mesclar) e dados de exemplo.
const hoje = hojeEmBrasilia();

const carregar = async (cliente: Cliente): Promise<Fatos> => {
  const r = await cliente.rpc('carregar_tudo');
  if (r.error) throw new Error(r.error.message);
  return fatosDe(r.data as Record<string, Record<string, unknown>[]>);
};
const apagarTudo = async (cliente: Cliente) => {
  const { error } = await cliente.rpc('apagar_tudo');
  expect(error).toBeNull();
};

/** Indicadores de 3.10 que a importação precisa reproduzir. */
function indicadores(f: Fatos) {
  const d = derivar(f, hoje);
  return {
    barra: indicadoresDaBarra(d),
    ...Object.fromEntries(
      (['este-mes', 'mes-passado', 'ultimos-12-meses'] as const).map((preset) => {
        const p = periodoPreset(preset, hoje);
        return [
          preset,
          {
            receitas: receitas(d, p),
            despesas: despesas(d, p),
            resultado: resultado(d, p),
            poupanca: taxaDePoupanca(d, p),
          },
        ];
      }),
    ),
  };
}
/** Ids por entidade, para comparar as bases. */
const ids = (f: Fatos) =>
  Object.fromEntries(
    Object.entries(f).map(([e, v]) => [
      e,
      (Array.isArray(v) ? (v as { id: string }[]) : v ? [v as { id: string }] : [])
        .map((x) => x.id)
        .sort(),
    ]),
  );
const contagem = async (usuario: string) => {
  const [n] = await sqlComoPostgres`
    select (select count(*) from lancamentos where created_by = ${usuario})::int as total,
      (select count(*) from lancamentos where created_by = ${usuario} and not is_deleted)::int as ativos`;
  return n;
};

let a: Usuario;
beforeAll(async () => {
  a = await criarUsuario();
  // Dados de exemplo: o app gera com gerarSeed e grava num comando (T05-29, D50).
  await gravarOk(a.cliente, opsDosFatos(gerarSeed(hoje, a.id)));
});

describe('apagar tudo e importar', () => {
  it('exportar, apagar tudo e importar em Substituir reproduz os indicadores (11.7)', async () => {
    const antes = await carregar(a.cliente);
    const backup = JSON.parse(JSON.stringify(exportar(antes, new Date().toISOString()))) as unknown;

    await apagarTudo(a.cliente);
    const vazio = await carregar(a.cliente);
    expect(vazio.lancamentos).toEqual([]);
    expect(vazio.categorias.every((c) => c.sistema !== null)).toBe(true);
    expect(vazio.preferencias).not.toBeNull();
    // As linhas continuam no banco, excluídas.
    const n = await contagem(a.id);
    expect(n?.total).toBe(antes.lancamentos.length);
    expect(n?.ativos).toBe(0);

    const plano = planejarImportacao(backup, vazio, 'substituir');
    expect(plano.erros).toEqual([]);
    await gravarOk(a.cliente, opsDoPlano(plano));
    const depois = await carregar(a.cliente);
    expect(ids(depois)).toEqual(ids(antes));
    expect(indicadores(depois)).toEqual(indicadores(antes));
  });

  it('importar o mesmo arquivo em Mesclar não cria duplicatas (11.7)', async () => {
    const antes = await carregar(a.cliente);
    const backup = JSON.parse(JSON.stringify(exportar(antes, new Date().toISOString()))) as unknown;
    await apagarTudo(a.cliente);
    for (let vez = 0; vez < 2; vez++) {
      const plano = planejarImportacao(backup, await carregar(a.cliente), 'mesclar');
      expect(plano.erros).toEqual([]);
      const ops = opsDoPlano(plano);
      if (vez === 1) expect(ops).toEqual([]);
      if (ops.length > 0) await gravarOk(a.cliente, ops);
    }
    const depois = await carregar(a.cliente);
    expect(ids(depois)).toEqual(ids(antes));
    expect(indicadores(depois)).toEqual(indicadores(antes));
  });

  it('erro no meio da importação não grava nada (11.7)', async () => {
    const antes = await carregar(a.cliente);
    const backup = JSON.parse(JSON.stringify(exportar(antes, new Date().toISOString()))) as unknown;
    await apagarTudo(a.cliente);
    const vazio = await carregar(a.cliente);
    const ops = opsDoPlano(planejarImportacao(backup, vazio, 'substituir'));
    // Uma parcela no meio do lote com valor errado: a soma da compra deixa de bater.
    const i = ops.findIndex((o) => o.tabela === 'parcelas');
    const quebrada = ops[i] as Op;
    ops[i] = { ...quebrada, dados: { ...quebrada.dados, valor: Number(quebrada.dados.valor) + 1 } };
    const { erro } = await gravar(a.cliente, ops);
    expect(erro?.code).toBe('23514');
    expect(ids(await carregar(a.cliente))).toEqual(ids(vazio));
    // Restaura para o próximo teste.
    await gravarOk(a.cliente, opsDoPlano(planejarImportacao(backup, vazio, 'substituir')));
  });

  it('inserir um id ativo, ou de outro usuário, é recusado; o excluído do próprio usuário volta', async () => {
    const b = await criarUsuario();
    const conta = inserir('contas', {
      nome: 'Carteira',
      tipo: 'dinheiro',
      saldo_inicial: 0,
      data_saldo_inicial: '2026-01-31',
      cor: 'categorica-2',
    });
    await gravarOk(b.cliente, [conta]);
    expect((await gravar(b.cliente, [conta])).erro?.code).toBe('23505');
    expect((await gravar(a.cliente, [conta])).erro).not.toBeNull();
    await gravarOk(b.cliente, [alterar('contas', conta.id, { is_deleted: true })]);
    const r = await gravarOk(b.cliente, [
      { ...conta, dados: { ...conta.dados, nome: 'Carteira nova' } },
    ]);
    expect(r.contas?.[0]).toMatchObject({ id: conta.id, nome: 'Carteira nova', is_deleted: false });
  });
});

describe('limite de uma chamada', () => {
  it('um backup com 10 mil lançamentos cabe numa chamada de gravar', async () => {
    const u = await criarUsuario();
    const conta = inserir('contas', {
      nome: 'Corrente',
      tipo: 'corrente',
      saldo_inicial: 0,
      data_saldo_inicial: '2020-01-31',
      cor: 'categorica-1',
    });
    const categoria = inserir('categorias', { nome: 'Mercado', tipo: 'despesa', icone: 'cart' });
    const lancamentos = Array.from({ length: 10_000 }, (_, k) =>
      inserir('lancamentos', {
        id: randomUUID(),
        tipo: 'despesa',
        status: 'efetivado',
        data: `2025-${String((k % 12) + 1).padStart(2, '0')}-10`,
        valor: 100 + k,
        descricao: `Compra ${String(k)}`,
        observacao: null,
        conta_id: conta.id,
        categoria_id: categoria.id,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        created_by: u.id,
        is_deleted: false,
      }),
    );
    const inicio = performance.now();
    const r = await gravarOk(u.cliente, [conta, categoria, ...lancamentos]);
    const ms = performance.now() - inicio;
    expect(r.lancamentos).toHaveLength(10_000);
    expect(ms).toBeLessThan(8000); // statement_timeout do papel authenticated no Supabase
  }, 30_000);
});
