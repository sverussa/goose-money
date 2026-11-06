-- Contas (MODELO-DADOS 3.2; PROMPT 3.4, 6.4; D21, D67).

create table public.contas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  nome text not null check (btrim(nome) <> ''),
  instituicao text,
  tipo text not null check (tipo in ('corrente', 'poupanca', 'investimento', 'dinheiro', 'outra')),
  saldo_inicial bigint not null,
  data_saldo_inicial date not null,
  cor text not null check (cor ~ '^[a-z][a-z0-9-]*$'),
  incluir_no_total boolean not null default true,
  arquivada boolean not null default false,
  unique (id, created_by)
);

-- Nome único entre as contas ativas (11.8: o nome de uma excluída ou arquivada pode voltar).
create unique index contas_nome_unico on public.contas (created_by, lower(btrim(nome)))
  where not is_deleted and not arquivada;

create trigger set_updated_at before update on public.contas
  for each row execute function public.set_updated_at();

alter table public.contas enable row level security;
create policy contas_select on public.contas for select to authenticated
  using (created_by = (select auth.uid()));
create policy contas_insert on public.contas for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy contas_update on public.contas for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.contas from authenticated, anon;
revoke all on public.contas from anon;
