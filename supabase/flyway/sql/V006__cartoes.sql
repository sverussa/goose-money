-- Cartões e versões do ciclo (MODELO-DADOS 3.3, 3.4; PROMPT 3.5, 3.9, 6.5; D21, D61, D67).

create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  nome text not null check (btrim(nome) <> ''),
  instituicao text,
  cor text not null check (cor ~ '^[a-z][a-z0-9-]*$'),
  limite bigint not null check (limite > 0),
  conta_pagamento_id uuid not null,
  competencia_inicial text not null check (competencia_inicial ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  arquivado boolean not null default false,
  unique (id, created_by),
  foreign key (conta_pagamento_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred
);

create unique index cartoes_nome_unico on public.cartoes (created_by, lower(btrim(nome)))
  where not is_deleted and not arquivado;
create index cartoes_por_conta on public.cartoes (conta_pagamento_id) where not is_deleted;

create trigger set_updated_at before update on public.cartoes
  for each row execute function public.set_updated_at();

alter table public.cartoes enable row level security;
create policy cartoes_select on public.cartoes for select to authenticated
  using (created_by = (select auth.uid()));
create policy cartoes_insert on public.cartoes for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy cartoes_update on public.cartoes for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.cartoes from authenticated, anon;
revoke all on public.cartoes from anon;

-- 3.9: a conta de pagamento de um cartão ativo está ativa e incluída no total. Vale dos dois
-- lados (cartão gravado ou conta alterada) e só no fim da transação.
create function public.cartoes_conta_pagamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select from public.cartoes c join public.contas k on k.id = c.conta_pagamento_id
    where (case when tg_table_name = 'cartoes' then c.id = new.id else k.id = new.id end)
      and not c.is_deleted and not c.arquivado
      and (k.is_deleted or k.arquivada or not k.incluir_no_total)
  ) then
    raise exception 'A conta de pagamento de um cartão ativo precisa estar ativa e incluída no total'
      using errcode = '23514', constraint = 'cartoes_conta_pagamento';
  end if;
  return null;
end;
$$;

create constraint trigger cartoes_conta_pagamento after insert or update on public.cartoes
  deferrable initially deferred
  for each row execute function public.cartoes_conta_pagamento();
create constraint trigger cartoes_conta_pagamento after update on public.contas
  deferrable initially deferred
  for each row execute function public.cartoes_conta_pagamento();

create table public.cartao_ciclos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  cartao_id uuid not null,
  vigente_desde text not null check (vigente_desde ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  unique (id, created_by),
  foreign key (cartao_id, created_by) references public.cartoes (id, created_by)
    on delete restrict deferrable initially deferred
);

create unique index cartao_ciclos_vigencia_unica on public.cartao_ciclos (created_by, cartao_id, vigente_desde)
  where not is_deleted;

create trigger set_updated_at before update on public.cartao_ciclos
  for each row execute function public.set_updated_at();

alter table public.cartao_ciclos enable row level security;
create policy cartao_ciclos_select on public.cartao_ciclos for select to authenticated
  using (created_by = (select auth.uid()));
create policy cartao_ciclos_insert on public.cartao_ciclos for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy cartao_ciclos_update on public.cartao_ciclos for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.cartao_ciclos from authenticated, anon;
revoke all on public.cartao_ciclos from anon;

-- Lançamento `pagamento_fatura` aponta para o cartão (D59).
alter table public.lancamentos add foreign key (cartao_id, created_by)
  references public.cartoes (id, created_by) on delete restrict deferrable initially deferred;
