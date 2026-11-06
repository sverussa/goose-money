-- Recorrências (rendas e gastos fixos), versões e ocorrências (MODELO-DADOS 3.11 a 3.13;
-- PROMPT 3.8, 6.7, 6.8; D68). Ocorrência prevista, atrasada ou vencida é derivada.

create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  natureza text not null check (natureza in ('renda', 'gasto')),
  descricao text not null check (btrim(descricao) <> ''),
  competencia_inicio text not null check (competencia_inicio ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  competencia_fim text check (competencia_fim ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  auto_confirmar boolean not null default false,
  ativa boolean not null default true,
  unique (id, created_by),
  constraint recorrencias_vigencia check (competencia_fim >= competencia_inicio)
);

create trigger set_updated_at before update on public.recorrencias
  for each row execute function public.set_updated_at();

alter table public.recorrencias enable row level security;
create policy recorrencias_select on public.recorrencias for select to authenticated
  using (created_by = (select auth.uid()));
create policy recorrencias_insert on public.recorrencias for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy recorrencias_update on public.recorrencias for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.recorrencias from authenticated, anon;
revoke all on public.recorrencias from anon;

create table public.recorrencia_versoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  recorrencia_id uuid not null,
  vigente_desde text not null check (vigente_desde ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  valor bigint not null check (valor > 0),
  dia smallint not null check (dia between 1 and 31),
  forma_pagamento text not null default 'conta' check (forma_pagamento in ('conta', 'cartao')),
  conta_id uuid,
  cartao_id uuid,
  categoria_id uuid not null,
  unique (id, created_by),
  foreign key (recorrencia_id, created_by) references public.recorrencias (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (conta_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (cartao_id, created_by) references public.cartoes (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  -- Conta com "conta", cartão com "cartao"; nunca os dois.
  constraint recorrencia_versoes_forma_pagamento check (
    (conta_id is not null) = (forma_pagamento = 'conta')
    and (cartao_id is not null) = (forma_pagamento = 'cartao')
  )
);

create unique index recorrencia_versoes_vigencia_unica
  on public.recorrencia_versoes (created_by, recorrencia_id, vigente_desde) where not is_deleted;

create trigger set_updated_at before update on public.recorrencia_versoes
  for each row execute function public.set_updated_at();

alter table public.recorrencia_versoes enable row level security;
create policy recorrencia_versoes_select on public.recorrencia_versoes for select to authenticated
  using (created_by = (select auth.uid()));
create policy recorrencia_versoes_insert on public.recorrencia_versoes for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy recorrencia_versoes_update on public.recorrencia_versoes for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.recorrencia_versoes from authenticated, anon;
revoke all on public.recorrencia_versoes from anon;

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users on delete restrict,
  is_deleted boolean not null default false,
  recorrencia_id uuid not null,
  competencia text not null check (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  situacao text not null check (situacao in ('confirmada', 'ignorada')),
  -- Retrato da confirmação.
  valor bigint check (valor >= 0),
  data date,
  conta_id uuid,
  cartao_id uuid,
  categoria_id uuid,
  lancamento_id uuid,
  compra_id uuid,
  unique (id, created_by),
  foreign key (recorrencia_id, created_by) references public.recorrencias (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (conta_id, created_by) references public.contas (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (cartao_id, created_by) references public.cartoes (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (categoria_id, created_by) references public.categorias (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (lancamento_id, created_by) references public.lancamentos (id, created_by)
    on delete restrict deferrable initially deferred,
  foreign key (compra_id, created_by) references public.compras (id, created_by)
    on delete restrict deferrable initially deferred,
  -- Confirmada: valor, data, categoria e exatamente um par (conta + lançamento) ou
  -- (cartão + compra). Ignorada: retrato todo nulo.
  constraint ocorrencias_retrato check (case situacao
    when 'ignorada' then num_nonnulls(valor, data, conta_id, cartao_id, categoria_id, lancamento_id, compra_id) = 0
    else num_nonnulls(valor, data, categoria_id) = 3
      and ((num_nonnulls(conta_id, lancamento_id) = 2 and num_nonnulls(cartao_id, compra_id) = 0)
        or (num_nonnulls(conta_id, lancamento_id) = 0 and num_nonnulls(cartao_id, compra_id) = 2))
  end)
);

-- Uma ocorrência ativa por recorrência e competência (3.8): impede confirmação duplicada e
-- torna a confirmação automática idempotente.
create unique index ocorrencias_competencia_unica on public.ocorrencias (created_by, recorrencia_id, competencia)
  where not is_deleted;

create trigger set_updated_at before update on public.ocorrencias
  for each row execute function public.set_updated_at();

alter table public.ocorrencias enable row level security;
create policy ocorrencias_select on public.ocorrencias for select to authenticated
  using (created_by = (select auth.uid()));
create policy ocorrencias_insert on public.ocorrencias for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy ocorrencias_update on public.ocorrencias for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

revoke delete on public.ocorrencias from authenticated, anon;
revoke all on public.ocorrencias from anon;
