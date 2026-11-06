import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  criarUsuario,
  numaTransacaoDesfeita,
  sqlComoPostgres,
  type Sql,
  type Usuario,
} from './apoio';

// T02-02. Tabelas de teste criadas dentro de uma transação desfeita, com a checklist de 12.2,
// e acrescentadas à lista de `gravar` só nessa transação.
async function tabelasDeTeste(sql: Sql) {
  for (const t of ['teste_compras', 'teste_parcelas']) {
    const extra =
      t === 'teste_compras'
        ? `valor_total bigint not null check (valor_total > 0),
           descricao text`
        : `compra_id uuid not null,
           numero smallint not null,
           valor bigint not null check (valor > 0),
           foreign key (compra_id, created_by) references public.teste_compras (id, created_by) on delete restrict`;
    await sql.unsafe(`
      create table public.${t} (
        id uuid primary key default gen_random_uuid(),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        created_by uuid not null default auth.uid() references auth.users on delete restrict,
        is_deleted boolean not null default false,
        ${extra},
        unique (id, created_by)
      );
      create trigger set_updated_at before update on public.${t}
        for each row execute function public.set_updated_at();
      alter table public.${t} enable row level security;
      create policy ler on public.${t} for select using (created_by = auth.uid());
      create policy inserir on public.${t} for insert with check (created_by = auth.uid());
      create policy alterar on public.${t} for update using (created_by = auth.uid()) with check (created_by = auth.uid());
      grant select, insert, update on public.${t} to authenticated;
    `);
  }
  await sql.unsafe(`
    create or replace function public.tabelas_de_negocio() returns text[] language sql immutable
    as $$ select array['teste_compras', 'teste_parcelas'] $$;
  `);
}

type Op = { tabela: string; acao: string; id: string; dados: Record<string, unknown> };

const gravar = (sql: Sql, ops: Op[]) =>
  sql`select public.gravar(${sql.json(ops)}) as r`.then(
    ([linha]) => linha?.r as Record<string, Record<string, unknown>[]>,
  );

/** A chamada falha; o savepoint deixa a transação de teste seguir. */
const falha = (sql: Sql, ops: Op[]) => sql.savepoint((sp) => gravar(sp, ops));

const compraEm10x = (): Op[] => {
  const compra = randomUUID();
  return [
    { tabela: 'teste_compras', acao: 'inserir', id: compra, dados: { valor_total: 1000 } },
    ...Array.from({ length: 10 }, (_, k) => ({
      tabela: 'teste_parcelas',
      acao: 'inserir',
      id: randomUUID(),
      dados: { compra_id: compra, numero: k + 1, valor: 100 },
    })),
  ];
};

let a: Usuario;
let b: Usuario;
beforeAll(async () => {
  [a, b] = await Promise.all([criarUsuario(), criarUsuario()]);
});

const comoA = (f: (sql: Sql) => Promise<void>) => numaTransacaoDesfeita(a.id, tabelasDeTeste, f);

describe('gravar(ops)', () => {
  it('grava compra + 10 parcelas de uma vez e devolve as linhas por tabela', async () => {
    await comoA(async (sql) => {
      const r = await gravar(sql, compraEm10x());
      expect(r.teste_compras).toHaveLength(1);
      expect(r.teste_parcelas).toHaveLength(10);
      expect(r.teste_compras?.[0]).toMatchObject({ created_by: a.id, is_deleted: false });
    });
  });

  it('falha no meio não grava nada', async () => {
    await comoA(async (sql) => {
      const ops = compraEm10x();
      const ultima = ops[10] as Op;
      ultima.dados = { ...ultima.dados, valor: 0 };
      await expect(falha(sql, ops)).rejects.toMatchObject({
        code: '23514',
        detail: expect.stringContaining('"operacao": 11') as unknown,
      });
      const [n] =
        await sql`select (select count(*) from teste_compras) + (select count(*) from teste_parcelas) as n`;
      expect(Number(n?.n)).toBe(0);
    });
  });

  it('recusa tabela fora da lista, ação de apagar e coluna inexistente', async () => {
    await comoA(async (sql) => {
      const id = randomUUID();
      await expect(
        falha(sql, [{ tabela: 'auth.users', acao: 'inserir', id, dados: {} }]),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(
        falha(sql, [{ tabela: 'teste_compras', acao: 'apagar', id, dados: {} }]),
      ).rejects.toMatchObject({ code: '22023' });
      await expect(
        falha(sql, [
          { tabela: 'teste_compras', acao: 'inserir', id, dados: { valor_total: 1, x: 1 } },
        ]),
      ).rejects.toMatchObject({ code: '42703' });
    });
  });

  it('ignora created_by, created_at e updated_at vindos do app', async () => {
    await comoA(async (sql) => {
      const id = randomUUID();
      const r = await gravar(sql, [
        {
          tabela: 'teste_compras',
          acao: 'inserir',
          id,
          dados: {
            valor_total: 5,
            created_by: b.id,
            created_at: '2000-01-01T00:00:00Z',
            updated_at: '2000-01-01T00:00:00Z',
          },
        },
      ]);
      const linha = r.teste_compras?.[0];
      expect(linha?.created_by).toBe(a.id);
      expect(String(linha?.created_at)).not.toContain('2000');
      await gravar(sql, [
        { tabela: 'teste_compras', acao: 'alterar', id, dados: { created_by: b.id } },
      ]);
      const [x] = await sql`select created_by from teste_compras where id = ${id}`;
      expect(x?.created_by).toBe(a.id);
    });
  });

  it('A não altera registro de B (o RLS esconde e a função acusa)', async () => {
    const idDeB = randomUUID();
    await numaTransacaoDesfeita(
      a.id,
      async (sql) => {
        await tabelasDeTeste(sql);
        await sql`insert into public.teste_compras (id, created_by, valor_total) values (${idDeB}, ${b.id}, 10)`;
      },
      async (sql) => {
        await expect(
          falha(sql, [
            { tabela: 'teste_compras', acao: 'alterar', id: idDeB, dados: { valor_total: 1 } },
          ]),
        ).rejects.toMatchObject({ code: 'P0002' });
        await sql`reset role`;
        const [x] = await sql`select valor_total from public.teste_compras where id = ${idDeB}`;
        expect(Number(x?.valor_total)).toBe(10);
      },
    );
  });

  it('excluir é alterar is_deleted; a linha continua e pode voltar (Desfazer)', async () => {
    await comoA(async (sql) => {
      const id = randomUUID();
      await gravar(sql, [
        { tabela: 'teste_compras', acao: 'inserir', id, dados: { valor_total: 3 } },
      ]);
      await gravar(sql, [
        { tabela: 'teste_compras', acao: 'alterar', id, dados: { is_deleted: true } },
      ]);
      const r = await gravar(sql, [
        { tabela: 'teste_compras', acao: 'alterar', id, dados: { is_deleted: false } },
      ]);
      expect(r.teste_compras?.[0]).toMatchObject({ is_deleted: false, valor_total: 3 });
    });
  });

  it('a função não tem delete nem execute para anon', async () => {
    const [def] = await sqlComoPostgres`
      select pg_get_functiondef('public.gravar(jsonb)'::regprocedure) as d,
        has_function_privilege('anon', 'public.gravar(jsonb)', 'execute') as anon,
        has_function_privilege('authenticated', 'public.gravar(jsonb)', 'execute') as autenticado`;
    expect(String(def?.d).toLowerCase()).not.toMatch(/\bdelete\b|\btruncate\b/);
    expect(def).toMatchObject({ anon: false, autenticado: true });
  });

  it('pela API, tabela fora da lista é recusada com código', async () => {
    const { error } = await a.cliente.rpc('gravar', {
      ops: [{ tabela: 'nao_existe', acao: 'inserir', id: randomUUID(), dados: {} }],
    });
    expect(error?.code).toBe('42501');
  });
});
