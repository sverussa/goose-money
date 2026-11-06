import { expect } from 'vitest';

import { sqlComoPostgres as sql } from './apoio';

// Checklist de PROMPT 12.2 para uma tabela de negócio, lida do catálogo (T02-03, T02-11).
export async function conferirChecklist(tabela: string): Promise<void> {
  const [t] = await sql`
    select c.relrowsecurity as rls,
      has_table_privilege('authenticated', c.oid, 'delete') as delete_autenticado,
      has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger') as anon,
      exists (
        select from pg_trigger g join pg_proc p on p.oid = g.tgfoid
        where g.tgrelid = c.oid and p.proname = 'set_updated_at' and g.tgtype & 2 = 2 and g.tgtype & 16 = 16
      ) as trigger_updated_at
    from pg_class c where c.oid = ${`public.${tabela}`}::regclass`;
  expect(t, tabela).toEqual({
    rls: true,
    delete_autenticado: false,
    anon: false,
    trigger_updated_at: true,
  });

  const colunas = await sql`
    select column_name as nome, data_type as tipo, is_nullable = 'NO' as obrigatoria, column_default as padrao
    from information_schema.columns
    where table_schema = 'public' and table_name = ${tabela}
      and column_name in ('id', 'created_at', 'updated_at', 'created_by', 'is_deleted')
    order by column_name`;
  expect(colunas, tabela).toEqual([
    { nome: 'created_at', tipo: 'timestamp with time zone', obrigatoria: true, padrao: 'now()' },
    { nome: 'created_by', tipo: 'uuid', obrigatoria: true, padrao: 'auth.uid()' },
    { nome: 'id', tipo: 'uuid', obrigatoria: true, padrao: 'gen_random_uuid()' },
    { nome: 'is_deleted', tipo: 'boolean', obrigatoria: true, padrao: 'false' },
    { nome: 'updated_at', tipo: 'timestamp with time zone', obrigatoria: true, padrao: 'now()' },
  ]);

  // Políticas de select, insert e update, todas pelo dono.
  const politicas = await sql`
    select cmd, coalesce(qual, '') || ' ' || coalesce(with_check, '') as regra, qual is not null as usa, with_check is not null as confere
    from pg_policies where schemaname = 'public' and tablename = ${tabela} order by cmd`;
  expect(
    politicas.map((p) => String(p.cmd)),
    tabela,
  ).toEqual(['INSERT', 'SELECT', 'UPDATE']);
  for (const p of politicas)
    expect(p.regra, `${tabela} ${String(p.cmd)}`).toMatch(
      /created_by = \(?\s*SELECT auth\.uid\(\)/i,
    );
  expect(politicas.map((p) => [Boolean(p.usa), Boolean(p.confere)])).toEqual([
    [false, true],
    [true, false],
    [true, true],
  ]);

  // Dono vai junto em toda referência; chaves estrangeiras on delete restrict.
  const restricoes = await sql`
    select contype as tipo, confdeltype as ao_apagar, pg_get_constraintdef(oid) as def
    from pg_constraint where conrelid = ${`public.${tabela}`}::regclass and contype in ('u', 'f')`;
  expect(
    restricoes.some((r) => r.tipo === 'u' && r.def === 'UNIQUE (id, created_by)'),
    tabela,
  ).toBe(true);
  for (const r of restricoes.filter((x) => x.tipo === 'f')) {
    expect(r.ao_apagar, `${tabela}: ${String(r.def)}`).toBe('r');
    if (!String(r.def).includes('auth.users')) expect(r.def).toMatch(/, created_by\) REFERENCES/);
  }

  // Unicidade sempre parcial, fora dos excluídos.
  const unicos = await sql`
    select indexrelid::regclass::text as nome, pg_get_expr(indpred, indrelid) as onde
    from pg_index where indrelid = ${`public.${tabela}`}::regclass and indisunique and not indisprimary
      and indexrelid not in (select conindid from pg_constraint where conrelid = ${`public.${tabela}`}::regclass and contype = 'u')`;
  for (const u of unicos) expect(u.onde, `${tabela}: ${String(u.nome)}`).toMatch(/NOT is_deleted/);
}
