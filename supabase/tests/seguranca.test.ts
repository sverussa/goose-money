import { randomUUID } from 'node:crypto';

import { derivar, gerarSeed, indicadoresDaBarra, type Fatos } from '@goose-money/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  alterar,
  criarUsuario,
  fatosDe,
  gravar,
  gravarOk,
  hojeEmBrasilia,
  inserir,
  opsDosFatos,
  sqlComoPostgres,
  type Cliente,
  type Usuario,
} from './apoio';
import { conferirChecklist } from './checklist';

// T02-11: regras de segurança em todas as tabelas (PROMPT 9.4, 11.8, 12.2). As tabelas vêm do
// catálogo: uma tabela nova que não siga a checklist faz a suíte falhar sem editar o teste.
const tabelas = (
  await sqlComoPostgres`
    select table_name as nome from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`
).map((t) => String(t.nome));

const hoje = hojeEmBrasilia();
let a: Usuario;
let b: Usuario;
/** Um id de B por tabela, inclusive excluído. */
const deB = new Map<string, string>();

beforeAll(async () => {
  [a, b] = await Promise.all([criarUsuario(), criarUsuario()]);
  await gravarOk(b.cliente, opsDosFatos(gerarSeed(hoje, b.id)));
  for (const t of tabelas) {
    const [linha] = await sqlComoPostgres`
      select id from ${sqlComoPostgres('public.' + t)} where created_by = ${b.id} limit 1`;
    if (linha) deB.set(t, String(linha.id));
  }
  // Um lançamento de B excluído: também invisível para A.
  const lancamento = deB.get('lancamentos');
  await sqlComoPostgres`update lancamentos set is_deleted = true where id = ${String(lancamento)}`;
});

describe('catálogo', () => {
  it('toda tabela do schema public é de negócio e está na lista de gravar', async () => {
    const [l] = await sqlComoPostgres`select public.tabelas_de_negocio() as lista`;
    expect([...(l?.lista as string[])].sort()).toEqual(tabelas);
  });

  it.each(tabelas)('%s segue a checklist de 12.2', async (tabela) => {
    await conferirChecklist(tabela);
  });

  it('funções do schema public: invoker, sem execute para anon', async () => {
    const funcoes = await sqlComoPostgres`
      select p.oid::regprocedure::text as nome, p.prosecdef as definer,
        has_function_privilege('anon', p.oid, 'execute') as anon
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and not exists (select from pg_depend d where d.objid = p.oid and d.deptype = 'e')`;
    expect(funcoes.length).toBeGreaterThan(0);
    for (const f of funcoes)
      expect([Boolean(f.definer), Boolean(f.anon)], String(f.nome)).toEqual([false, false]);
  });

  it('o schema flyway não é acessível pela API', async () => {
    const { error } = await a.cliente
      .schema('flyway')
      .from('flyway_schema_history')
      .select('version');
    expect(error).not.toBeNull();
    const [p] = await sqlComoPostgres`
      select has_schema_privilege('authenticated', 'flyway', 'usage') as autenticado,
        has_schema_privilege('anon', 'flyway', 'usage') as anon`;
    expect(p).toEqual({ autenticado: false, anon: false });
  });
});

describe.each(tabelas)('%s com dois usuários (11.8)', (tabela) => {
  it('A não lê registros de B, inclusive excluídos', async () => {
    const { data, error } = await a.cliente.from(tabela).select('id').eq('created_by', b.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(deB.has(tabela)).toBe(true);
  });

  it('A não altera registro de B, nem pela API nem pelo gravar', async () => {
    const id = String(deB.get(tabela));
    const [antes] =
      await sqlComoPostgres`select updated_at from ${sqlComoPostgres('public.' + tabela)} where id = ${id}`;
    const { data } = await a.cliente
      .from(tabela)
      .update({ is_deleted: true })
      .eq('id', id)
      .select('id');
    expect(data ?? []).toEqual([]);
    expect((await gravar(a.cliente, [alterar(tabela, id, { is_deleted: false })])).erro?.code).toBe(
      'P0002',
    );
    const [depois] =
      await sqlComoPostgres`select updated_at from ${sqlComoPostgres('public.' + tabela)} where id = ${id}`;
    expect(depois?.updated_at).toEqual(antes?.updated_at);
  });

  it('delete direto pela API é negado', async () => {
    const { error } = await a.cliente.from(tabela).delete().eq('id', randomUUID());
    expect(error?.code).toBe('42501');
    const { error: erroDeB } = await b.cliente
      .from(tabela)
      .delete()
      .eq('id', String(deB.get(tabela)));
    expect(erroDeB?.code).toBe('42501');
  });
});

describe('regras de 11.8', () => {
  const conta = (nome: string) =>
    inserir('contas', {
      nome,
      tipo: 'poupanca',
      saldo_inicial: 0,
      data_saldo_inicial: '2026-01-31',
      cor: 'categorica-5',
    });

  it('inserir com created_by de outro usuário é rejeitado pela API e corrigido pelo gravar', async () => {
    const { error } = await a.cliente
      .from('contas')
      .insert({ ...conta('Do B').dados, created_by: b.id });
    expect(error?.code).toBe('42501');
    const op = conta('Minha');
    const r = await gravarOk(a.cliente, [{ ...op, dados: { ...op.dados, created_by: b.id } }]);
    expect(r.contas?.[0]?.created_by).toBe(a.id);
  });

  it('updated_at muda a cada atualização e created_at nunca muda', async () => {
    const op = conta('Datas');
    const [criada] = (await gravarOk(a.cliente, [op])).contas ?? [];
    const { data } = await a.cliente
      .from('contas')
      .update({
        nome: 'Datas 2',
        created_at: '2000-01-01T00:00:00Z',
        updated_at: '2000-01-01T00:00:00Z',
      })
      .eq('id', op.id)
      .select('created_at, updated_at')
      .single<{ created_at: string; updated_at: string }>();
    expect(Date.parse(String(data?.created_at))).toBe(Date.parse(String(criada?.created_at)));
    expect(Date.parse(String(data?.updated_at))).toBeGreaterThan(
      Date.parse(String(criada?.updated_at)),
    );
    const [excluida] =
      (await gravarOk(a.cliente, [alterar('contas', op.id, { is_deleted: true })])).contas ?? [];
    expect(Date.parse(String(excluida?.updated_at))).toBeGreaterThan(
      Date.parse(String(data?.updated_at)),
    );
  });

  it('depois de excluir a conta "Poupança" (sem movimentos), outra com o mesmo nome é aceita', async () => {
    const poupanca = conta('Poupança');
    await gravarOk(a.cliente, [poupanca]);
    expect((await gravar(a.cliente, [conta('Poupança')])).erro?.code).toBe('23505');
    await gravarOk(a.cliente, [alterar('contas', poupanca.id, { is_deleted: true })]);
    await gravarOk(a.cliente, [conta('Poupança')]);
  });

  it('excluir uma despesa: linha fica com is_deleted, some dos fatos; Desfazer devolve os indicadores', async () => {
    const carregar = async (cliente: Cliente): Promise<Fatos> => {
      const r = await cliente.rpc('carregar_tudo');
      return fatosDe(r.data as Record<string, Record<string, unknown>[]>);
    };
    const barra = (f: Fatos) => indicadoresDaBarra(derivar(f, hoje));
    const antes = await carregar(b.cliente);
    const [contaDeB] = antes.contas;
    const categoria = antes.categorias.find((c) => c.tipo === 'despesa' && c.sistema === null);
    const despesa = inserir('lancamentos', {
      tipo: 'despesa',
      data: hoje,
      valor: 12345,
      conta_id: contaDeB?.id,
      categoria_id: categoria?.id,
    });
    await gravarOk(b.cliente, [despesa]);
    const comDespesa = barra(await carregar(b.cliente));
    expect(comDespesa).not.toEqual(barra(antes));

    await gravarOk(b.cliente, [alterar('lancamentos', despesa.id, { is_deleted: true })]);
    const semDespesa = await carregar(b.cliente);
    expect(semDespesa.lancamentos.some((l) => l.id === despesa.id)).toBe(false);
    expect(barra(semDespesa)).toEqual(barra(antes));
    const [linha] =
      await sqlComoPostgres`select is_deleted from lancamentos where id = ${despesa.id}`;
    expect(linha?.is_deleted).toBe(true);

    // Desfazer a exclusão: volta is_deleted e os indicadores com a despesa.
    await gravarOk(b.cliente, [alterar('lancamentos', despesa.id, { is_deleted: false })]);
    expect(barra(await carregar(b.cliente))).toEqual(comDespesa);
  });
});
