import { gerarSeed } from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  criarUsuario,
  gravarOk,
  hojeEmBrasilia,
  inserir,
  opsDosFatos,
  sqlComoPostgres,
  type Cliente,
  type Usuario,
} from './apoio';

// T02-09: carregar_tudo().
const TABELAS = [
  'categorias',
  'contas',
  'preferencias',
  'lancamentos',
  'cartoes',
  'cartao_ciclos',
  'compras',
  'parcelas',
  'itens_fatura',
  'dividas',
  'parcelas_divida',
  'recorrencias',
  'recorrencia_versoes',
  'ocorrencias',
];

type Tudo = Record<string, { id: string; created_by: string; is_deleted: boolean }[]>;
const carregar = async (cliente: Cliente): Promise<Tudo> => {
  const r = await cliente.rpc('carregar_tudo');
  if (r.error) throw new Error(r.error.message);
  return r.data as Tudo;
};

let a: Usuario;
let b: Usuario;
beforeAll(async () => {
  [a, b] = await Promise.all([criarUsuario(), criarUsuario()]);
  // O seed completo pelo gravar, como o app (T02-10).
  await gravarOk(a.cliente, opsDosFatos(gerarSeed(hojeEmBrasilia(), a.id)));
});

describe('carregar_tudo()', () => {
  it('uma única chamada traz todas as tabelas, com os registros do seed', async () => {
    const tudo = await carregar(a.cliente);
    expect(Object.keys(tudo).sort()).toEqual([...TABELAS].sort());
    const vazias = TABELAS.filter((t) => (tudo[t] ?? []).length === 0);
    expect(vazias).toEqual([]);
  });

  it('registros excluídos e de outros usuários não aparecem', async () => {
    const conta = inserir('contas', {
      nome: 'Some',
      tipo: 'dinheiro',
      saldo_inicial: 0,
      data_saldo_inicial: '2026-01-31',
      cor: 'categorica-4',
    });
    await gravarOk(b.cliente, [conta]);
    expect((await carregar(b.cliente)).contas?.map((c) => c.id)).toEqual([conta.id]);
    await gravarOk(b.cliente, [alterar('contas', conta.id, { is_deleted: true })]);
    expect((await carregar(b.cliente)).contas).toEqual([]);
    const deA = await carregar(a.cliente);
    for (const t of TABELAS)
      for (const linha of deA[t] ?? []) {
        expect(linha.created_by).toBe(a.id);
        expect(linha.is_deleted).toBe(false);
      }
  });

  it('10 mil lançamentos e o seed completo voltam em menos de 1 s', async () => {
    const [conta] = (await carregar(a.cliente)).contas ?? [];
    await sqlComoPostgres`
      insert into public.lancamentos (created_by, tipo, data, valor, conta_id, categoria_id)
      select ${a.id}, 'despesa', date '2026-01-01' + (i % 300), 100 + i, ${String(conta?.id)},
        (select id from public.categorias where created_by = ${a.id} and sistema = 'a_classificar')
      from generate_series(1, 10000) i`;
    // Estatísticas novas logo depois da carga, para o plano usar os índices (T00-14).
    await sqlComoPostgres.unsafe(`analyze ${TABELAS.map((t) => `public.${t}`).join(', ')}`);
    await carregar(a.cliente); // aquece a conexão e o plano
    const inicio = performance.now();
    const tudo = await carregar(a.cliente);
    const ms = performance.now() - inicio;
    expect(tudo.lancamentos?.length).toBeGreaterThan(10_000);
    expect(ms).toBeLessThan(1000);
  });
});
